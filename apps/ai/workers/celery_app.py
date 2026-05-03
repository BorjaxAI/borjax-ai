import os
from celery import Celery

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "borjaxai",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=["workers.task_worker"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    result_expires=86400,  # 24h
    task_soft_time_limit=600,   # 10 min soft
    task_time_limit=660,         # 11 min hard
)
