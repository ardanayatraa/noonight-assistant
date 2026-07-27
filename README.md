# 🛸 Noonight Assistant

**Multi-tenant AI Developer Assistant** — connect client GitHub projects and let clients query their source code via WhatsApp.

## Stack

| Layer | Tech |
|---|---|
| Backend | **NestJS** (TypeScript) |
| Frontend | **Next.js 14** + Tailwind |
| Database | MySQL 8.0 (Prisma ORM) |
| Cache | Redis |
| WhatsApp | Hermes Agent |
| AI | OpenAI / Claude / DeepSeek / Gemini / OpenRouter |
| Container | Docker |

## Quick Start

```bash
# 1. Install
chmod +x install.sh && ./install.sh

# 2. Configure
cp .env.example .env
# Edit .env with your API keys + MySQL URL

# 3. Migrate database
cd src && npx prisma migrate dev --name init && cd ..

# 4. Run dev mode
npm run dev
```

Open http://localhost:3000 for the dashboard.

## API Endpoints

```
POST /api/v1/auth/login          Admin login
POST /api/v1/auth/setup          First-time setup

GET  /api/v1/clients             List clients
POST /api/v1/clients             Create client (name, company, whatsapp)
GET  /api/v1/clients/:uuid       Client detail

GET  /api/v1/clients/:uuid/projects  List projects
POST /api/v1/clients/:uuid/projects  Create project (GitHub URL)
GET  /api/v1/projects/:uuid      Project detail
POST /api/v1/projects/:uuid/sync     Sync from GitHub

POST /api/v1/webhook/whatsapp    Hermes WhatsApp webhook

GET  /api/v1/settings            All settings
POST /api/v1/settings/ai-providers  Configure AI provider

GET  /api/v1/health              Health check
```

## WhatsApp Flow

1. Admin registers client with WhatsApp number
2. Client messages bot → system recognizes by phone number
3. AI answers based on their project's source code
4. No access codes, no login

## Docker

```bash
docker compose up -d
```

## Architecture

See `.hermes/plans/2026-07-27_210000-noonight-assistant-architecture.md` for the complete architecture document.
