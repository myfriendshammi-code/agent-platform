# AgentPlatform

Multi-agent SaaS PWA — one login, many specialized business agents.

## Documentation

All project documentation lives in [`docs/`](./docs/):

| Document | Purpose |
|----------|---------|
| [master_context.md](./docs/master_context.md) | Business rules and founder decisions |
| [ARCHITECTURE.md](./docs/ARCHITECTURE.md) | System design, stack, folder structure |
| [DATABASE.md](./docs/DATABASE.md) | Database schema design |
| [ROADMAP.md](./docs/ROADMAP.md) | Development phases |
| [changelog.md](./docs/changelog.md) | Change history |

## Stack

- **Next.js 15** (App Router) + TypeScript + Tailwind CSS
- **PostgreSQL 16** + Prisma
- **Redis 7** + BullMQ (worker — Phase 2)
- **PWA** — manifest + service worker placeholder

## Prerequisites

- Node.js 20+
- Docker Desktop (for PostgreSQL and Redis)

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Copy environment file
cp .env.example .env

# 3. Start database and Redis
docker compose up -d

# 4. Run migrations
npm run db:migrate:dev

# 5. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Health check: [http://localhost:3000/api/health](http://localhost:3000/api/health)

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check |
| `npm run format` | Prettier write |
| `npm run db:migrate:dev` | Apply migrations (dev) |
| `npm run db:migrate` | Apply migrations (prod) |
| `npm run db:seed` | Seed agents + optional admin |
| `npm run db:studio` | Prisma Studio |
| `npm run worker:dev` | Worker placeholder (Phase 0) |

## Project structure

```
agentplatform/
├── docs/                 # Documentation
├── prisma/               # Schema and migrations
├── public/               # Static assets, PWA manifest
├── src/
│   ├── app/              # Next.js routes
│   ├── components/       # UI components (Phase 1+)
│   ├── lib/              # Platform services
│   ├── agents/           # Agent modules (Phase 1+)
│   └── workers/          # Background jobs (Phase 2+)
├── docker-compose.yml
└── vercel.json
```

## Deployment

- **Web app:** Vercel — see `vercel.json`
- **Worker:** Railway placeholder — see `railway.worker.json` (Phase 2)

## Current phase

**Phase 1 — Platform foundation** (complete)  
Next: **Phase 2 — SEO Agent (free tier)** — see [ROADMAP.md](./docs/ROADMAP.md)

### First-time setup after Phase 1

```bash
npm run db:migrate:dev
npm run db:seed
```

Set `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` in `.env` before seeding to create a super admin.
