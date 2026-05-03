from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from db.database import get_db
from db.models import User, Task, Agent
from routers.auth import require_auth
from workers.celery_app import celery_app

router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────────────
class CreateTaskRequest(BaseModel):
    type: str  # research | write | analyze | custom
    prompt: str
    agent_id: Optional[str] = None


class TaskOut(BaseModel):
    id: str
    type: str
    status: str
    prompt: str
    result: Optional[str]
    error: Optional[str]
    tokens_used: int
    agent_id: Optional[str]
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True


VALID_TASK_TYPES = {"research", "write", "analyze", "custom"}


# ── Endpoints ─────────────────────────────────────────────────────────────────
@router.post("/", status_code=202)
def create_task(
    payload: CreateTaskRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_auth),
):
    if payload.type not in VALID_TASK_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid task type. Must be one of: {', '.join(VALID_TASK_TYPES)}",
        )

    if payload.type == "custom" and not payload.agent_id:
        raise HTTPException(
            status_code=400,
            detail="agent_id is required for custom tasks",
        )

    if payload.agent_id:
        agent = db.query(Agent).filter(
            Agent.id == payload.agent_id,
            Agent.user_id == current_user.id,
        ).first()
        if not agent:
            raise HTTPException(status_code=404, detail="Agent not found")

    # Create DB task record
    task = Task(
        user_id=current_user.id,
        type=payload.type,
        prompt=payload.prompt,
        agent_id=payload.agent_id,
        status="pending",
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    # Dispatch to Celery
    from workers.task_worker import run_task
    celery_result = run_task.apply_async(
        args=[task.id, current_user.id, payload.type, payload.prompt, payload.agent_id],
        task_id=str(task.id),
    )
    task.celery_task_id = celery_result.id
    db.commit()

    return {
        "id": task.id,
        "status": task.status,
        "type": task.type,
        "created_at": task.created_at.isoformat(),
    }


@router.get("/")
def list_tasks(
    page: int = 1,
    limit: int = 20,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_auth),
):
    query = db.query(Task).filter(Task.user_id == current_user.id)
    if status:
        query = query.filter(Task.status == status)

    total = query.count()
    tasks = (
        query.order_by(Task.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "tasks": [
            {
                "id": t.id,
                "type": t.type,
                "status": t.status,
                "prompt": t.prompt[:100] + "..." if len(t.prompt) > 100 else t.prompt,
                "tokens_used": t.tokens_used,
                "created_at": t.created_at.isoformat(),
                "completed_at": t.completed_at.isoformat() if t.completed_at else None,
            }
            for t in tasks
        ],
    }


@router.get("/{task_id}")
def get_task(
    task_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_auth),
):
    task = db.query(Task).filter(
        Task.id == task_id,
        Task.user_id == current_user.id,
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    return {
        "id": task.id,
        "type": task.type,
        "status": task.status,
        "prompt": task.prompt,
        "result": task.result,
        "error": task.error,
        "tokens_used": task.tokens_used,
        "agent_id": task.agent_id,
        "created_at": task.created_at.isoformat(),
        "updated_at": task.updated_at.isoformat(),
        "completed_at": task.completed_at.isoformat() if task.completed_at else None,
    }


@router.delete("/{task_id}", status_code=204)
def cancel_task(
    task_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_auth),
):
    task = db.query(Task).filter(
        Task.id == task_id,
        Task.user_id == current_user.id,
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if task.status in ("completed", "failed"):
        raise HTTPException(status_code=400, detail="Cannot cancel a completed or failed task")

    # Revoke Celery task
    if task.celery_task_id:
        celery_app.control.revoke(task.celery_task_id, terminate=True)

    task.status = "cancelled"
    db.commit()
