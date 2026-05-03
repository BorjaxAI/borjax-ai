import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Boolean, DateTime, Text, ForeignKey, JSON
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from db.database import Base


def gen_uuid():
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    email = Column(String(255), unique=True, nullable=False, index=True)
    full_name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    plan = Column(String(50), default="free", nullable=False)
    tokens_used = Column(Integer, default=0, nullable=False)
    tokens_limit = Column(Integer, default=10000, nullable=False)
    stripe_customer_id = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    conversations = relationship("Conversation", back_populates="user", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="user", cascade="all, delete-orphan")
    agents = relationship("Agent", back_populates="user", cascade="all, delete-orphan")


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan", order_by="Message.created_at")


class Message(Base):
    __tablename__ = "messages"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    conversation_id = Column(UUID(as_uuid=False), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(20), nullable=False)  # user | assistant
    content = Column(Text, nullable=False)
    tokens = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    conversation = relationship("Conversation", back_populates="messages")


class Task(Base):
    __tablename__ = "tasks"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    celery_task_id = Column(String(255), nullable=True)
    type = Column(String(50), nullable=False)  # research | write | analyze | custom
    prompt = Column(Text, nullable=False)
    status = Column(String(50), default="pending", nullable=False, index=True)
    result = Column(Text, nullable=True)
    error = Column(Text, nullable=True)
    agent_id = Column(UUID(as_uuid=False), ForeignKey("agents.id", ondelete="SET NULL"), nullable=True)
    tokens_used = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="tasks")
    agent = relationship("Agent")


class Agent(Base):
    __tablename__ = "agents"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    role = Column(String(500), nullable=False)
    goal = Column(Text, nullable=False)
    backstory = Column(Text, nullable=False)
    tools = Column(JSON, default=list)
    verbose = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="agents")
