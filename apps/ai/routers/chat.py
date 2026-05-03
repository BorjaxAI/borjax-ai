import os
import json
import asyncio
import boto3
from typing import Optional, AsyncGenerator
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel

from db.database import get_db
from db.models import User, Conversation, Message
from routers.auth import require_auth

router = APIRouter()

AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
BEDROCK_MODEL = os.getenv("BEDROCK_MODEL_ID", "anthropic.claude-3-5-sonnet-20241022-v2:0")
SYSTEM_PROMPT = """You are BorjaxAI — a helpful, knowledgeable AI assistant. 
You help users with research, writing, analysis, coding, and more.
Be concise but thorough. Format your responses using markdown when appropriate."""


def get_bedrock_client():
    return boto3.client(
        "bedrock-runtime",
        region_name=AWS_REGION,
        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
    )


# ── Schemas ───────────────────────────────────────────────────────────────────
class ChatRequest(BaseModel):
    message: Optional[str] = None
    content: Optional[str] = None   # alias — frontend sends 'content'
    conversation_id: Optional[str] = None


class ConversationOut(BaseModel):
    id: str
    title: Optional[str]
    created_at: datetime
    message_count: int

    class Config:
        from_attributes = True


class MessageOut(BaseModel):
    id: str
    role: str
    content: str
    tokens: int
    created_at: datetime

    class Config:
        from_attributes = True


class ConversationDetailOut(BaseModel):
    id: str
    title: Optional[str]
    created_at: datetime
    messages: list[MessageOut]

    class Config:
        from_attributes = True


# ── Streaming helper ──────────────────────────────────────────────────────────
async def stream_bedrock(
    messages: list[dict],
    db: Session,
    user: User,
    conversation_id: str,
    user_message_id: str,
) -> AsyncGenerator[str, None]:
    """Stream response from Bedrock Claude, save to DB, track tokens."""
    bedrock = get_bedrock_client()
    full_response = ""
    total_tokens = 0

    try:
        response = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: bedrock.invoke_model_with_response_stream(
                modelId=BEDROCK_MODEL,
                body=json.dumps({
                    "anthropic_version": "bedrock-2023-05-31",
                    "max_tokens": 4096,
                    "system": SYSTEM_PROMPT,
                    "messages": messages,
                }),
            ),
        )

        stream = response.get("body")
        for event in stream:
            chunk = event.get("chunk")
            if not chunk:
                continue
            data = json.loads(chunk.get("bytes", b"{}"))

            if data.get("type") == "content_block_delta":
                text = data.get("delta", {}).get("text", "")
                if text:
                    full_response += text
                    yield f"data: {json.dumps({'type': 'token', 'content': text})}\n\n"

            elif data.get("type") == "message_delta":
                usage = data.get("usage", {})
                total_tokens = usage.get("output_tokens", 0)

            elif data.get("type") == "message_stop":
                # Save assistant message
                ai_msg = Message(
                    conversation_id=conversation_id,
                    role="assistant",
                    content=full_response,
                    tokens=total_tokens,
                )
                db.add(ai_msg)
                # Update user token usage
                user.tokens_used += total_tokens
                db.commit()

                # Update conversation title if first message
                conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
                if conv and not conv.title:
                    title_text = messages[-1]["content"][:60] if messages else "New Chat"
                    conv.title = title_text + ("..." if len(title_text) == 60 else "")
                    db.commit()

                yield f"data: {json.dumps({'type': 'done', 'conversation_id': conversation_id, 'tokens_used': total_tokens})}\n\n"

    except Exception as e:
        yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"


# ── Endpoints ─────────────────────────────────────────────────────────────────
@router.post("/send")
async def send_message(
    payload: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_auth),
):
    # Resolve message text from either field name
    user_text = payload.message or payload.content or ""
    if not user_text.strip():
        raise HTTPException(status_code=422, detail="Message content is required")

    # ── Token limit guard — 402 for exhausted guests / any plan ──────────────
    is_guest = getattr(current_user, 'is_guest', False)
    if current_user.tokens_used >= current_user.tokens_limit:
        raise HTTPException(
            status_code=402,
            detail={
                "code": "TOKEN_LIMIT_REACHED",
                "is_guest": is_guest,
                "plan": current_user.plan,
                "tokens_used": current_user.tokens_used,
                "tokens_limit": current_user.tokens_limit,
            },
        )
    # Get or create conversation
    if payload.conversation_id:
        conv = db.query(Conversation).filter(
            Conversation.id == payload.conversation_id,
            Conversation.user_id == current_user.id,
        ).first()
        if not conv:
            raise HTTPException(status_code=404, detail="Conversation not found")
    else:
        conv = Conversation(user_id=current_user.id)
        db.add(conv)
        db.commit()
        db.refresh(conv)

    # Save user message
    user_msg = Message(
        conversation_id=conv.id,
        role="user",
        content=user_text,
        tokens=0,
    )
    db.add(user_msg)
    db.commit()
    db.refresh(user_msg)

    # Build message history for Claude
    history = db.query(Message).filter(
        Message.conversation_id == conv.id,
        Message.id != user_msg.id,
    ).order_by(Message.created_at).all()

    bedrock_messages = [
        {"role": m.role, "content": m.content} for m in history
    ]
    bedrock_messages.append({"role": "user", "content": user_text})

    return StreamingResponse(
        stream_bedrock(bedrock_messages, db, current_user, conv.id, user_msg.id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/conversations")
def list_conversations(
    page: int = 1,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_auth),
):
    offset = (page - 1) * limit
    conversations = (
        db.query(Conversation)
        .filter(Conversation.user_id == current_user.id)
        .order_by(Conversation.updated_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    result = []
    for conv in conversations:
        msg_count = db.query(Message).filter(Message.conversation_id == conv.id).count()
        result.append({
            "id": conv.id,
            "title": conv.title,
            "created_at": conv.created_at.isoformat(),
            "message_count": msg_count,
        })
    return result


@router.get("/conversations/{conversation_id}")
def get_conversation(
    conversation_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_auth),
):
    conv = db.query(Conversation).filter(
        Conversation.id == conversation_id,
        Conversation.user_id == current_user.id,
    ).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    messages = db.query(Message).filter(
        Message.conversation_id == conv.id
    ).order_by(Message.created_at).all()

    return {
        "id": conv.id,
        "title": conv.title,
        "created_at": conv.created_at.isoformat(),
        "messages": [
            {
                "id": m.id,
                "role": m.role,
                "content": m.content,
                "tokens": m.tokens,
                "created_at": m.created_at.isoformat(),
            }
            for m in messages
        ],
    }
