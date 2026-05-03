# BorjaxAI — Your AI Team. No Code Required.

BorjaxAI is a SaaS AI platform that lets anyone build and run AI agents, chat with Claude, execute background tasks, and automate workflows — no code required.

## Architecture

```
apps/
├── landing/       Static landing page  → S3 + CloudFront
├── docs/          Static docs site     → S3 + CloudFront
├── web/           Vanilla JS + Vite    → S3 + CloudFront
├── gateway/       Hono API Gateway     → Docker / EC2 :3000
└── ai/            FastAPI + CrewAI     → Docker / EC2 :8000

deploy/            AWS deploy scripts
docker-compose.yml Full stack local dev
```

## Stack

| Layer | Tech |
|-------|------|
| LLM | AWS Bedrock (Claude 3.5 Sonnet) |
| API Gateway | Hono (TypeScript, Node 20) |
| AI Backend | FastAPI (Python 3.11) |
| Agents | CrewAI |
| DB | PostgreSQL 16 + pgvector |
| Queue | Redis 7 + Celery |
| Billing | Stripe |
| Frontend | Vanilla JS + Vite |
| Deploy | Docker Compose → EC2 |

## Quick Start

```bash
cp .env.example .env
# Fill in secrets
docker-compose up -d
```

- Gateway: http://localhost:3000
- AI API: http://localhost:8000
- Web App: http://localhost:5173 (dev)

## Deployment

```bash
# Deploy frontends to S3
./deploy/deploy-frontend.sh

# Deploy backend to EC2
./deploy/deploy-backend.sh
```

## Environment Variables

See `.env.example` for all required variables.
