# BorjaxAI — Funding One-Pager

---

## The Problem

AI tools are built for developers. **95% of business owners** can't use LangChain, set up API keys, or write Python scripts. They're locked out of the AI revolution — even though they're the ones who need it most.

The current options:
- **ChatGPT/Claude** — great for chat, but no agents, no integrations, no background tasks
- **LangChain/CrewAI** — powerful, but requires Python knowledge
- **Enterprise platforms** — $500+/mo, built for Fortune 500

There's a massive gap: **a platform that gives non-technical users developer-level AI power**.

---

## The Solution

BorjaxAI is an AI platform that gives non-technical users the same power as developers — **no code required**.

| Feature | Description |
|---------|-------------|
| 💬 **AI Chat** | 8 models (Claude, GPT-4o, Gemini, Llama, DeepSeek), streaming, memory, web search |
| ⚡ **Background Tasks** | Delegate research, writing, analysis — get results async |
| 🤖 **Agent Builder** | Create custom AI assistants with a form: name, role, tools, instructions |
| 🔌 **19 Connectors** | Slack, Gmail, Notion, GitHub, Zapier, Google Docs/Sheets, HubSpot |
| 🎁 **Free Tier** | 5,000 tokens, no sign-up required to try |

---

## Business Model

Freemium SaaS with token-based billing (Stripe):

| Plan | Price | Tokens/month | Target |
|------|-------|-------------|--------|
| Free | $0 | 10,000 | Trial users |
| Starter | $9/mo | 100,000 | Individuals |
| Pro | $29/mo | 500,000 | Power users |
| Agency | $99/mo | 2,000,000 | Agencies + teams |

**Unit economics:** Average AI cost per 100K tokens ≈ $0.80 (Bedrock). Starter plan: 91% margin. Agency plan: 96% margin.

**Revenue multipliers:**
- Connector add-ons ($5-15/mo each)
- White-label for agencies
- Enterprise self-hosted licenses

---

## Market

- **400M+** small businesses globally
- **AI SaaS market:** $65B by 2027 (Gartner)
- **No-code market:** $52B by 2028
- **Target:** Non-technical business owners, freelancers, marketing agencies, consultants

**Comparable exits/raises:**
- Jasper AI: raised $125M at $1.5B valuation (AI writing)
- Copy.ai: raised $13.9M (AI content)
- AgentGPT: 25K+ GitHub stars (open source agents)
- CrewAI: raised $18M Series A (AI agent framework)

BorjaxAI sits at the intersection of all three: **AI + no-code + agents**.

---

## Traction

- ✅ Full platform deployed on AWS (landing, app, docs, API)
- ✅ Open source — MIT license
- ✅ 8 AI models integrated via AWS Bedrock
- ✅ 19 connector integrations
- ✅ Public chat (no sign-up required)
- ✅ Stripe billing integrated
- ✅ GitHub community files (Contributing, CoC, Security, Issue Templates)
- ✅ GitHub Sponsors configured

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| LLM Provider | AWS Bedrock (Claude 3.5 Sonnet, GPT-4o, etc.) |
| API Gateway | Hono (TypeScript) |
| AI Backend | FastAPI (Python 3.11) |
| Agent Framework | CrewAI |
| Database | PostgreSQL 16 + pgvector |
| Queue | Redis 7 + Celery |
| Billing | Stripe |
| Frontend | Vanilla JS + Vite |
| Infra | Docker Compose → AWS EC2 + S3 + CloudFront |

---

## Team

**Kurt Morales** — Full-stack engineer, solo founder
- Built and deployed the entire BorjaxAI platform
- Founder of KmWebDesign (web development agency)
- Stack expertise: React, TypeScript, Python, Rust, AWS, Cloudflare
- GitHub: [kurtmorales-tech](https://github.com/kurtmorales-tech)

---

## Use of Funds

Seeking **$50K – $150K** pre-seed:

| Category | Allocation | Purpose |
|----------|-----------|---------|
| Engineering | 40% | Full-time development, hire 1 contractor |
| Infrastructure | 20% | AWS (Bedrock inference, EC2, S3, CloudFront) |
| Marketing | 20% | Content, community, launch campaigns |
| Mobile | 15% | React Native app development |
| Legal/Ops | 5% | Entity setup, compliance |

**Milestones with funding:**
- Month 1-2: Mobile app MVP, 5 new connectors
- Month 3-4: 1,000 users, 50 paying customers
- Month 5-6: Agency white-label, team workspaces, seed-ready metrics

---

## Why Now

1. **AI is mainstream** — everyone wants it, most can't use it
2. **Agent frameworks are mature** — CrewAI, LangChain make this possible
3. **No-code is expected** — users won't tolerate setup friction
4. **Open source wins** — community-driven development beats closed SaaS
5. **Bedrock costs are dropping** — inference gets cheaper every quarter

---

## Contact

| | |
|--|--|
| **Email** | email@kmwebdesign.xyz |
| **GitHub** | https://github.com/BorjaxAI/borjax-ai |
| **Landing** | https://d2uyrcah4dstqz.cloudfront.net |
| **Live App** | https://d18813a3in0ap7.cloudfront.net |
| **Docs** | https://d1zf9tcidkzc8z.cloudfront.net |
| **API** | http://35.153.204.139:8000/docs |

---

## Grant & Accelerator Targets

| Program | Type | Amount | Notes |
|---------|------|--------|-------|
| Y Combinator | Accelerator | $500K | Apply at ycombinator.com/apply |
| Pioneer.app | Accelerator | $20K | Remote-first, weekly tournaments |
| Unshackled Ventures | Pre-seed | $100-500K | Immigrant founders |
| Indie.vc | Revenue-based | $100-500K | For bootstrappers |
| GitHub Sponsors | Donations | Variable | Already configured |
| Open Collective | Donations | Variable | Open source funding |
| AWS Activate | Credits | $10-100K | AWS startup credits |
| Google for Startups | Credits | $100K+ | GCP credits |
| Microsoft for Startups | Credits | $150K | Azure + OpenAI credits |
| Stripe Atlas | Program | N/A | Incorporation + credits |
| NVIDIA Inception | Program | N/A | GPU credits + mentorship |
| a]16z OPEN | Grant | $25K | Open source AI grants |
