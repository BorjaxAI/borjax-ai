import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://borjaxai:borjaxai_dev@localhost:5432/borjaxai",
)

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    echo=os.getenv("DB_ECHO", "false").lower() == "true",
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create all tables (idempotent)."""
    from db.models import User, Conversation, Message, Task, Agent  # noqa: F401
    Base.metadata.create_all(bind=engine)
    print("[db] Tables created / verified.")
