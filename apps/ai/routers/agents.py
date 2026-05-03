from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from db.database import get_db
from db.models import User, Agent, Task
from routers.auth import require_auth

router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────────────
class CreateAgentRequest(BaseModel):
    name: str
    role: str
    goal: str
    backstory: str
    tools: list[str] = []
    verbose: bool = False


class UpdateAgentRequest(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    goal: Optional[str] = None
    backstory: Optional[str] = None
    tools: Optional[list[str]] = None
    verbose: Optional[bool] = None


class RunAgentRequest(BaseModel):
    prompt: str


VALID_TOOLS = {"web_search", "text_analysis", "code_execution", "file_reader"}


# ── Endpoints ─────────────────────────────────────────────────────────────────
@router.get("/")
def list_agents(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_auth),
):
    agents = db.query(Agent).filter(Agent.user_id == current_user.id).order_by(Agent.created_at.desc()).all()
    return [
        {
            "id": a.id,
            "name": a.name,
            "role": a.role,
            "goal": a.goal,
            "backstory": a.backstory,
            "tools": a.tools,
            "verbose": a.verbose,
            "created_at": a.created_at.isoformat(),
        }
        for a in agents
    ]


@router.post("/", status_code=201)
def create_agent(
    payload: CreateAgentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_auth),
):
    # Validate tools
    invalid_tools = set(payload.tools) - VALID_TOOLS
    if invalid_tools:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid tools: {invalid_tools}. Valid: {VALID_TOOLS}",
        )

    agent = Agent(
        user_id=current_user.id,
        name=payload.name,
        role=payload.role,
        goal=payload.goal,
        backstory=payload.backstory,
        tools=payload.tools,
        verbose=payload.verbose,
    )
    db.add(agent)
    db.commit()
    db.refresh(agent)

    return {
        "id": agent.id,
        "name": agent.name,
        "role": agent.role,
        "goal": agent.goal,
        "backstory": agent.backstory,
        "tools": agent.tools,
        "verbose": agent.verbose,
        "created_at": agent.created_at.isoformat(),
    }


@router.get("/{agent_id}")
def get_agent(
    agent_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_auth),
):
    agent = db.query(Agent).filter(
        Agent.id == agent_id,
        Agent.user_id == current_user.id,
    ).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    return {
        "id": agent.id,
        "name": agent.name,
        "role": agent.role,
        "goal": agent.goal,
        "backstory": agent.backstory,
        "tools": agent.tools,
        "verbose": agent.verbose,
        "created_at": agent.created_at.isoformat(),
        "updated_at": agent.updated_at.isoformat(),
    }


@router.put("/{agent_id}")
def update_agent(
    agent_id: str,
    payload: UpdateAgentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_auth),
):
    agent = db.query(Agent).filter(
        Agent.id == agent_id,
        Agent.user_id == current_user.id,
    ).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    updates = payload.model_dump(exclude_none=True)
    for field, value in updates.items():
        setattr(agent, field, value)

    agent.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(agent)

    return {"id": agent.id, "name": agent.name, "updated_at": agent.updated_at.isoformat()}


@router.delete("/{agent_id}", status_code=204)
def delete_agent(
    agent_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_auth),
):
    agent = db.query(Agent).filter(
        Agent.id == agent_id,
        Agent.user_id == current_user.id,
    ).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    db.delete(agent)
    db.commit()


@router.post("/{agent_id}/run", status_code=202)
def run_agent(
    agent_id: str,
    payload: RunAgentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_auth),
):
    agent = db.query(Agent).filter(
        Agent.id == agent_id,
        Agent.user_id == current_user.id,
    ).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    # Create a task and dispatch to Celery
    task = Task(
        user_id=current_user.id,
        type="custom",
        prompt=payload.prompt,
        agent_id=agent_id,
        status="pending",
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    from workers.task_worker import run_task
    celery_result = run_task.apply_async(
        args=[task.id, current_user.id, "custom", payload.prompt, agent_id],
    )
    task.celery_task_id = celery_result.id
    db.commit()

    return {
        "task_id": task.id,
        "status": "pending",
        "message": f"Agent '{agent.name}' started. Poll /tasks/{task.id} for results.",
    }
