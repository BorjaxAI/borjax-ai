"""
Celery task worker for BorjaxAI.
Processes background tasks: research, write, analyze, custom agent runs.
"""
import os
from datetime import datetime
from celery.utils.log import get_task_logger
from workers.celery_app import celery_app

logger = get_task_logger(__name__)


@celery_app.task(
    bind=True,
    max_retries=2,
    default_retry_delay=30,
    name="workers.task_worker.run_task",
)
def run_task(
    self,
    task_id: str,
    user_id: str,
    task_type: str,
    prompt: str,
    agent_id: str | None = None,
):
    """
    Main Celery task.
    Updates task status in DB, runs the appropriate crew/agent,
    saves results, and updates token counts.
    """
    from db.database import SessionLocal
    from db.models import Task, User, Agent

    db = SessionLocal()
    task_record = None

    try:
        # Mark as running
        task_record = db.query(Task).filter(Task.id == task_id).first()
        if not task_record:
            logger.error(f"Task {task_id} not found in DB")
            return

        task_record.status = "running"
        db.commit()
        logger.info(f"[task:{task_id}] Starting {task_type} task")

        # Execute based on type
        from agents.crew_builder import (
            run_research_crew,
            run_write_crew,
            run_analyze_crew,
            run_custom_agent,
        )

        if task_type == "research":
            result = run_research_crew(prompt)

        elif task_type == "write":
            result = run_write_crew(prompt)

        elif task_type == "analyze":
            result = run_analyze_crew(prompt)

        elif task_type == "custom":
            if not agent_id:
                raise ValueError("agent_id required for custom tasks")
            agent = db.query(Agent).filter(Agent.id == agent_id).first()
            if not agent:
                raise ValueError(f"Agent {agent_id} not found")
            agent_config = {
                "name": agent.name,
                "role": agent.role,
                "goal": agent.goal,
                "backstory": agent.backstory,
                "tools": agent.tools or [],
                "verbose": agent.verbose,
            }
            result = run_custom_agent(agent_config, prompt)
        else:
            raise ValueError(f"Unknown task type: {task_type}")

        # Estimate tokens (rough: 4 chars ≈ 1 token)
        tokens_used = len(result) // 4 + len(prompt) // 4

        # Update task record
        task_record.status = "completed"
        task_record.result = result
        task_record.tokens_used = tokens_used
        task_record.completed_at = datetime.utcnow()

        # Update user token count
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            user.tokens_used = (user.tokens_used or 0) + tokens_used

        db.commit()
        logger.info(f"[task:{task_id}] Completed. Tokens used: {tokens_used}")
        return {"status": "completed", "task_id": task_id}

    except Exception as exc:
        logger.error(f"[task:{task_id}] Failed: {exc}", exc_info=True)

        if task_record:
            try:
                task_record.status = "failed"
                task_record.error = str(exc)
                task_record.completed_at = datetime.utcnow()
                db.commit()
            except Exception:
                pass

        # Retry on transient errors
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc, countdown=30 * (self.request.retries + 1))

        raise

    finally:
        db.close()
