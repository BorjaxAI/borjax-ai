import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from db.database import init_db
from routers import auth, chat, tasks, agents
from routers.internal import internal_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize DB on startup."""
    init_db()
    yield


app = FastAPI(
    title="BorjaxAI API",
    description="AI-powered backend: Chat, Tasks, Agents",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ─────────────────────────────────────────────────────────────────────
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(chat.router, prefix="/chat", tags=["chat"])
app.include_router(tasks.router, prefix="/tasks", tags=["tasks"])
app.include_router(agents.router, prefix="/agents", tags=["agents"])
app.include_router(internal_router, prefix="/internal", tags=["internal"])


@app.get("/health")
def health():
    return {"status": "ok", "service": "borjaxai-ai", "version": "1.0.0"}
