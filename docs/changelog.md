# Changelog

All notable changes to AgentPlatform are documented here.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [0.1.0] — 2025-06-21 — Phase 0 complete

### Added

#### Project root

| File | Purpose |
|------|---------|
| `package.json` | Dependencies, scripts (dev, build, lint, typecheck, db, worker) |
| `tsconfig.json` | TypeScript config with `@/*` path alias |
| `next.config.ts` | Next.js 15 config, service worker headers |
| `postcss.config.mjs` | Tailwind CSS v4 PostCSS plugin |
| `eslint.config.mjs` | ESLint flat config (Next.js + Prettier) |
| `.prettierrc` / `.prettierignore` | Code formatting |
| `.gitignore` | Standard Next.js / Node ignores |
| `.env.example` | Environment variable template |
| `docker-compose.yml` | PostgreSQL 16 + Redis 7 for local dev |
| `vercel.json` | Vercel deployment config |
| `railway.worker.json` | Worker host placeholder (Phase 2) |
| `components.json` | shadcn/ui config (components in Phase 1) |
| `README.md` | Quick start, scripts, links to `docs/` |

#### CI / deploy

| File | Purpose |
|------|---------|
| `.github/workflows/ci.yml` | Lint, typecheck, Prettier check, build on push/PR |

#### Database (Prisma)

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | Phase 0 stub: `SystemMeta` model |
| `prisma/migrations/migration_lock.toml` | PostgreSQL provider lock |
| `prisma/migrations/20250621000000_phase_0_system_meta/migration.sql` | Creates `system_meta`, seeds `schema_version=phase_0` |

#### Application source (`src/`)

| Path | Purpose |
|------|---------|
| `src/app/layout.tsx` | Root layout, fonts, PWA metadata |
| `src/app/page.tsx` | Phase 0 landing page (no business features) |
| `src/app/globals.css` | Tailwind v4 + CSS variables (shadcn-ready) |
| `src/app/api/health/route.ts` | Health check API (DB connectivity + schema version) |
| `src/lib/db/index.ts` | Prisma client singleton |
| `src/lib/utils.ts` | `cn()` utility for shadcn/ui |
| `src/workers/index.ts` | Worker process placeholder (Phase 2) |

#### Reserved folder structure (Phase 1+ placeholders)

| Path | Planned use |
|------|-------------|
| `src/app/(auth)/` | Login, register, verify, reset |
| `src/app/(dashboard)/` | User dashboard |
| `src/app/(admin)/` | Admin panel |
| `src/app/api/auth/` | Auth.js routes |
| `src/app/api/webhooks/stripe/` | Stripe webhooks |
| `src/app/api/webhooks/paypal/` | PayPal webhooks |
| `src/app/api/agents/seo/` | SEO Agent API |
| `src/app/api/v1/` | Future public API |
| `src/lib/auth/` | Authentication |
| `src/lib/billing/` | Stripe + PayPal |
| `src/lib/entitlements/` | Per-agent tier resolution |
| `src/lib/metering/` | Usage counters |
| `src/lib/points/` | Points ledger |
| `src/lib/agents/` | Agent registry |
| `src/lib/transfers/` | Cross-agent data handoff |
| `src/lib/email/` | Transactional email |
| `src/agents/` | Agent module implementations |
| `src/components/ui/` | shadcn/ui components |
| `src/components/dashboard/` | Dashboard widgets |
| `src/components/admin/` | Admin components |
| `src/components/agents/seo/` | SEO Agent UI |
| `src/workers/jobs/` | BullMQ job definitions |
| `tests/unit/` | Unit tests |
| `tests/integration/` | Integration tests |

#### PWA assets (`public/`)

| File | Purpose |
|------|---------|
| `public/manifest.webmanifest` | Web app manifest |
| `public/sw.js` | Service worker placeholder (network-only) |
| `public/icons/icon-192.svg` | App icon 192 |
| `public/icons/icon-512.svg` | App icon 512 |
| `public/icons/icon-maskable.svg` | Maskable icon |

### Stack locked (from `docs/ARCHITECTURE.md`)

- Next.js 15, React 19, TypeScript
- Tailwind CSS v4, shadcn/ui config (components deferred to Phase 1)
- PostgreSQL 16 + Prisma 6
- Redis 7 (docker-compose; used in Phase 2 worker)
- Auth.js, Stripe, PayPal — configured in `.env.example`, implemented Phase 1+

### Verified locally

- `npm install` — success
- `npm run typecheck` — success
- `npm run lint` — success
- `npm run build` — success

### Requires manual setup

- **Docker Desktop** must be running for `docker compose up -d` and `npm run db:migrate`
- Copy `.env.example` → `.env` (done automatically in dev if copied manually)
- Replace SVG PWA icons with production PNGs before public launch

### Not included (by design — Phase 1+)

- Authentication / registration
- User or admin dashboards
- Agent modules (SEO, Lead Finder, etc.)
- Subscriptions, points, referrals
- Background crawl jobs

---

## [0.2.0] — 2025-06-21 — Phase 1 complete

Platform foundation: authentication, dashboard shell, agent registry, minimal admin. See `docs/master_context.md` for scope.

**Key routes:** `/register`, `/login`, `/dashboard`, `/dashboard/settings`, `/dashboard/agents/[slug]`, `/admin/users`, `/admin/audit`

**Not built:** billing, referrals, points, SEO Agent features.

**Setup:** `npm run db:migrate:dev` then `npm run db:seed` (optional admin via `SEED_ADMIN_*` env vars).

---

## [Unreleased]

---

## [0.3.0] — 2025-06-21 — Phase 2 complete

SEO Agent MVP on the free tier: website management, domain verification, usage metering, BullMQ scan pipeline, and in-app reports.

**Key routes:** `/dashboard/agents/seo`, `/dashboard/agents/seo/websites/[id]`, `/dashboard/agents/seo/scans/[id]`

**API:** `/api/agents/seo/websites`, `/api/agents/seo/scans`, `/api/agents/seo/usage`

**Worker:** `npm run worker:dev` (requires Redis via `docker compose up -d`)

**Free tier limits:** 3 websites, 10 scans/month, 100 pages/scan

**Not built:** billing, PayPal, Stripe, referrals, points, upsell modals.

**Setup:** `npm run db:migrate:dev` then `npm run db:seed` to activate SEO agent.
