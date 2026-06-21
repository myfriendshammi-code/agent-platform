# AgentPlatform Master Context

## Project Goal
Build one PWA SaaS platform that hosts multiple AI agents/tools.

## Core Business Model
- One website/platform.
- One user registration.
- One login and password for all agents.
- Users can access free features of all agents.
- Each agent has its own separate paid subscription.
- Users subscribe only to the agents they want.
- The platform must make profit first.

## Planned Agents
1. SEO Agent
2. Lead Finder Agent
3. Outreach Agent
4. Mockup Agent

## Pricing Concept
- SEO Agent: Free + paid plan
- Lead Finder Agent: Free + paid plan
- Outreach Agent: Free + paid plan
- Mockup Agent: Free + paid plan
- Exact pricing can change later.

## Referral and Points Rules
- Points must never replace monthly subscription payments.
- Points must not reduce subscription fees.
- Points are used only for extra usage, bonuses, premium trials, reports, or low-cost perks.
- Rewards must generate at least $20 revenue for every $1 cost.
- Users can earn points by referrals and by activating additional agents.
- Each bonus should be given only once per qualifying action.

## Technical Direction
- Build as one PWA.
- One shared database.
- One authentication system.
- One dashboard.
- One admin panel.
- Agents are modules inside the same platform.

## Development Rule
Before any coding:
1. Read this file.
2. Follow these decisions.
3. Do not invent business rules.
4. Ask before changing pricing, referral rules, or subscription logic.
5. Update this file after important decisions.

## First Build Target
Start with the platform foundation and SEO Agent first.

## First SEO Agent Features
- Sitemap check/generation
- Robots.txt check
- Schema check
- Broken link check
- Index/noindex audit
- Google Search Console integration later
- Bing Webmaster integration later
- SEO report with exact fixes

---

## Founder Decisions (Critical — recorded 2025-06-21)

These decisions answer Critical Questions 9, 11, 15, 16, 20, 24, 25, 34, 52, and 59 from `questions_for_founder.md`. Architecture may proceed; coding should wait until Important-tier blockers are resolved or given v1 defaults.

### Q9 — What is an agent?
**Decision:** An agent is a **feature module**.

Examples: SEO Agent, Lead Finder Agent, Outreach Agent, Mockup Agent.

Each agent module may include:
- Chat
- Reports
- Automation
- Workflows

Agents are not a single interaction pattern (not chat-only, not batch-only). The module is the product boundary; capabilities inside vary by agent.

### Q11 — Cross-agent data sharing
**Decision:** **Shared data is allowed, but only with explicit user permission.**

Example flow: Lead Finder → user clicks **"Send to Outreach"** → data passes to Outreach Agent.

Default: agent data is isolated. Sharing requires an explicit user action per transfer. No automatic cross-agent sync.

### Q15 — Free access to all agents
**Decision:** **Yes.** Every registered user can open every agent and use its free tier, subject to that agent's free-tier limits.

### Q16 — Per-agent paid subscriptions
**Decision:** **Yes.** Paid access is per agent. Buying SEO Agent paid does **not** unlock Lead Finder Agent or any other agent's paid features.

### Q20 — Agent activation (for points and analytics)
**Decision:** **Activation = first successful use of an agent.**

Not activation:
- Clicking a button
- Opening a page

Examples of activation:
- First SEO scan completed
- First lead search completed

Points reward for activating an additional agent is granted **once per agent per user**, on first successful use.

### Q24 — Teams in v1
**Decision:** **No teams in v1.** One account = one person.

### Q25 — Future team support in data model
**Decision:** **Yes — design the database so teams can be added later.** Do not build team features, team UI, or multi-seat billing in v1.

### Q34 — Payment providers
**Decision:** **Stripe and PayPal — both required, not either/or.** Many users prefer PayPal.

Implementation approach (product default until overridden): use Stripe as primary subscription engine; expose PayPal as a checkout option. Confirm exact integration model before billing code (see Remaining Blockers).

### Q52 — SEO Agent v1 usage limits

**Free tier:**
- 3 websites (projects) per account
- 10 scans per month
- 100 pages per scan
- No scheduled scans

**Paid tier:**
- Higher limits — exact numbers and price TBD before paid checkout ships

Report export limits on free tier: **TBD** (not decided in founder answer).

Limit reset period (calendar month vs rolling 30 days): **TBD**.

### Q59 — Unit of work (project model)
**Decision:** **Project = Website** (domain-level).

Examples: `mockupexpo.com`, `client1.com`

Each website (project) contains:
- URLs
- Scans
- Reports

URL is not the primary object; website/domain is.

---

## Remaining Blockers

See `founder_questions_priority.md` — **Important tier (20 questions)** should be answered or given a written v1 default before coding.

Priority blockers surfaced by these decisions:

| # | Topic | Why still open |
|---|--------|----------------|
| **35** | Merchant of record / tax | Required alongside Stripe + PayPal |
| **36** | SEO paid price and paid-tier limits | Q52 leaves paid tier TBD |
| **53** | Limit reset period | Q52 silent on calendar vs rolling month |
| **54** | Behavior when limit hit | Upsell UX vs hard block |
| **60** | Paid website count | Q52 sets free at 3; paid count undefined |
| **63** | Crawl defaults | Depth, rate limits beyond 100 pages/scan |
| **66** | Report format and delivery | PDF, in-app, email, shareable link |
| **71** | Domain ownership verification | Abuse/legal risk for crawls |
| **76** | Points hard rule confirmation | Explicit yes/no for ledger design |
| **10** | Cross-agent workflows in v1 | Q11 allows sharing; scope for v1 UI unclear |
| **12** | Placeholder agents in v1 UI | Show coming soon vs hide |
| **26–27** | Auth methods and email verification | Implementation scope |
| **29** | User roles | Admin panel permissions |
| **37, 40** | Paid tier count and free trial model | Billing catalog |
| **57** | Shared vs per-agent usage meters | Metering service design |
| **PayPal integration model** | Stripe + PayPal both | Native PayPal Subscriptions vs Stripe with PayPal payment method — affects webhooks and reconciliation |

Critical questions: **resolved.** Architecture may begin. Coding: wait on Important blockers or documented v1 defaults.

---

## Implementation Status

### Phase 0 — Project setup ✅ (2025-06-21)

Repository scaffold complete. No business features implemented yet.

**Stack implemented:** Next.js 15, React 19, TypeScript, Tailwind CSS v4, Prisma 6, PostgreSQL 16 (docker-compose), Redis 7 (docker-compose), ESLint, Prettier, GitHub Actions CI, Vercel config, PWA manifest + placeholder icons.

**Key paths:**

| Path | Contents |
|------|----------|
| `src/app/` | Landing page, health API |
| `src/lib/db/` | Prisma client |
| `src/workers/` | Worker placeholder |
| `prisma/` | Phase 0 schema (`system_meta` stub) |
| `public/` | PWA manifest, icons, service worker |
| `docs/` | All project documentation |

**Scripts:** `npm run dev`, `build`, `lint`, `typecheck`, `db:migrate`, `worker:dev` — see `README.md`.

**Local setup:**

```bash
docker compose up -d
cp .env.example .env
npm install
npm run db:migrate:dev
npm run dev
```

**Full file list:** `docs/changelog.md` v0.1.0

**Next phase:** Phase 1 — Platform foundation (auth, dashboard shell, agent registry). See `docs/ROADMAP.md`.

### Phase 1 — Platform foundation ✅ (2025-06-21)

Authentication, user dashboard shell, agent registry, and minimal admin panel are implemented.

**Included:**

- Register / login / logout (email + password)
- Mandatory email verification before dashboard access
- Password reset flow
- JWT sessions via Auth.js v5
- RBAC: `user`, `support`, `admin`, `super_admin`
- User dashboard with agent cards (all agents `coming_soon` — SEO deferred per build scope)
- Agent registry loaded from `agents` table + stub detail pages
- Settings: profile name, change password
- Admin: user search, audit log viewer
- Platform event bus stub for future agent activation
- Database tables: users, auth, agents, agent_plans, agent_activations, websites (schema), audit_logs

**Excluded from this phase (as requested):**

- Billing / subscriptions
- Referrals / points
- SEO Agent functionality

**Admin setup:**

```bash
# In .env
SEED_ADMIN_EMAIL=admin@example.com
SEED_ADMIN_PASSWORD=your-secure-password
npm run db:seed
```

**User flow:** Register → verify email (link in console in dev) → login → `/dashboard`

**Next phase:** Phase 2 — SEO Agent (free tier). See `docs/ROADMAP.md`.

### Documentation index

| Document | Purpose |
|----------|---------|
| `docs/master_context.md` | This file — business rules and status |
| `docs/ARCHITECTURE.md` | System design |
| `docs/DATABASE.md` | Full schema design (Phase 1+) |
| `docs/ROADMAP.md` | Development phases |
| `docs/changelog.md` | Change history |
