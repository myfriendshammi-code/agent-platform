# AgentPlatform — System Architecture

**Version:** 1.0  
**Status:** Approved for implementation planning  
**Source of truth:** `master_context.md`  
**Related:** `DATABASE.md`, `ROADMAP.md`

---

## 1. Architecture overview

AgentPlatform is a **modular monolith** delivered as a **Progressive Web App (PWA)**. One codebase hosts the platform shell (auth, billing, dashboard, admin) and pluggable **agent modules** (SEO first, others later).

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client (PWA)                            │
│  Service Worker │ Web App Manifest │ Responsive UI              │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS
┌────────────────────────────▼────────────────────────────────────┐
│                    Next.js Application                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ User         │  │ Admin        │  │ Agent Modules        │  │
│  │ Dashboard    │  │ Dashboard    │  │ SEO │ stubs │ ...    │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Platform Core: Auth │ Entitlements │ Billing │ Points    │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ API Routes / Server Actions                               │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────┬───────────────────────────────┬────────────────────┘
             │                               │
    ┌────────▼────────┐             ┌────────▼────────┐
    │   PostgreSQL    │             │      Redis      │
    │  (primary DB)   │             │ queue / cache   │
    └─────────────────┘             └────────┬────────┘
                                             │
                                    ┌────────▼────────┐
                                    │  Worker Process │
                                    │  (SEO crawls)   │
                                    └─────────────────┘
             │
    ┌────────▼────────┐     ┌─────────────────┐
    │     Stripe      │     │     PayPal      │
    │  (primary subs) │     │ (alt checkout)  │
    └─────────────────┘     └─────────────────┘
```

### Design principles

1. **One login, many agents** — single identity; entitlements are per agent.
2. **Agent = feature module** — not a separate app or database; a bounded module inside the monolith.
3. **Free by default, paid per agent** — every user gets every agent's free tier; paid unlocks higher limits per agent only.
4. **Explicit cross-agent sharing** — data stays siloed unless the user performs an explicit transfer action.
5. **Teams-ready, teams-deferred** — v1 is solo users; schema includes `organization_id` hooks for later.
6. **Profit-first metering** — usage limits enforced server-side before expensive work (crawls, exports).

---

## 2. Technology stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| **Language** | TypeScript | Type safety across frontend, API, agents, workers |
| **Framework** | Next.js 15 (App Router) | SSR/SSG, API routes, PWA-friendly, single deploy unit |
| **UI** | React 19 + Tailwind CSS + shadcn/ui | Fast dashboard UI, accessible components |
| **ORM** | Prisma | Migrations, type-safe queries, PostgreSQL-first |
| **Database** | PostgreSQL 16 | Relational billing, ledger, audit; JSON columns where needed |
| **Cache / queue** | Redis 7 | Job queue backing, rate limits, session cache |
| **Background jobs** | BullMQ | SEO crawl jobs, report generation, webhook retries |
| **Auth** | Auth.js v5 (NextAuth) | Credentials + extensible OAuth later; session JWT or DB sessions |
| **Payments** | Stripe (primary) + PayPal | Founder decision: both required; Stripe owns subscription lifecycle |
| **Email** | Resend (or SendGrid) | Verification, password reset, scan notifications |
| **File storage** | S3-compatible (e.g. R2, AWS S3) | PDF reports, exports (when enabled) |
| **Hosting** | Vercel (app) + Railway/Fly (worker + Redis) or single VPS for v1 | Start simple; split worker when crawl load grows |
| **Observability** | Sentry + structured logs | Error tracking; admin audit trail in DB |

### v1 defaults (unresolved founder blockers)

Documented assumptions until overridden in `master_context.md`:

| Topic | v1 default |
|-------|------------|
| Limit reset period | Calendar month (UTC) |
| Limit exceeded UX | Hard block + upsell modal |
| Usage metering | Separate counters **per agent** (not shared pool) |
| Auth at launch | Email/password + mandatory email verification |
| User roles | `user`, `support`, `admin`, `super_admin` |
| Paid tiers | One paid tier per agent (`pro`); SEO Pro ≈ $9/mo (from `pricing.md`) |
| Free trial | None at launch; points-based premium trials later |
| Other agents in v1 UI | Visible with **Coming soon** badge; not clickable |
| Domain verification | Required before first scan on a website (DNS TXT or meta tag) |
| SEO paid limits | 25 websites, 100 scans/month, 500 pages/scan (placeholder — update before paid launch) |
| PayPal model | Stripe Checkout with PayPal payment method where supported; native PayPal Subscriptions API as phase 2 if gap remains |
| Points vs subscriptions | Points **never** apply as coupons or subscription discounts (hard rule) |
| Report delivery (SEO) | In-app checklist primary; PDF export paid-only when export limits defined |

---

## 3. Folder structure

```
agentplatform/
├── docs/                          # Project documentation (this repo)
├── prisma/
│   ├── schema.prisma              # Database schema (see DATABASE.md)
│   └── migrations/
├── public/
│   ├── manifest.webmanifest       # PWA manifest
│   ├── icons/                     # App icons (192, 512)
│   └── sw.js                      # Service worker (or next-pwa generated)
├── src/
│   ├── app/                       # Next.js App Router
│   │   ├── (marketing)/           # Landing, pricing (public)
│   │   ├── (auth)/                # login, register, verify, reset-password
│   │   ├── (dashboard)/           # Authenticated user shell
│   │   │   ├── layout.tsx         # User dashboard layout + nav
│   │   │   ├── page.tsx           # Dashboard home (agent cards)
│   │   │   ├── billing/
│   │   │   ├── referrals/
│   │   │   ├── settings/
│   │   │   └── agents/
│   │   │       ├── seo/           # SEO Agent routes (only active agent v1)
│   │   │       └── [agentSlug]/   # Coming soon stub for others
│   │   ├── (admin)/               # Admin dashboard (role-gated)
│   │   │   ├── layout.tsx
│   │   │   ├── users/
│   │   │   ├── subscriptions/
│   │   │   ├── points/
│   │   │   ├── agents/
│   │   │   └── audit/
│   │   └── api/
│   │       ├── auth/[...nextauth]/
│   │       ├── webhooks/
│   │       │   ├── stripe/
│   │       │   └── paypal/
│   │       ├── agents/
│   │       │   └── seo/           # Scan trigger, report fetch
│   │       └── v1/                # Internal REST (future mobile/API clients)
│   ├── components/
│   │   ├── ui/                    # shadcn primitives
│   │   ├── dashboard/             # Shared dashboard widgets
│   │   ├── admin/
│   │   └── agents/
│   │       └── seo/
│   ├── lib/
│   │   ├── auth/                  # Auth.js config, guards, RBAC
│   │   ├── db/                    # Prisma client singleton
│   │   ├── billing/               # Stripe/PayPal, entitlements
│   │   ├── entitlements/          # Tier resolution, limit checks
│   │   ├── metering/              # Usage counters, period reset
│   │   ├── points/                # Ledger, referrals, activation rewards
│   │   ├── agents/                # Registry, loader, shared types
│   │   ├── transfers/             # Cross-agent data handoff
│   │   ├── email/
│   │   └── utils/
│   ├── agents/                    # Agent module implementations
│   │   ├── types.ts               # AgentModule interface
│   │   ├── registry.ts            # Agent catalog + metadata
│   │   ├── seo/
│   │   │   ├── index.ts           # Module export (manifest)
│   │   │   ├── routes.ts          # Route definitions
│   │   │   ├── services/          # Scan orchestration
│   │   │   ├── crawlers/          # Broken links, sitemap, etc.
│   │   │   ├── checks/            # robots, schema, index audit
│   │   │   └── reports/           # Report builder
│   │   ├── lead-finder/           # Stub (coming soon)
│   │   ├── outreach/              # Stub
│   │   └── mockup/                  # Stub
│   └── workers/
│       ├── index.ts               # Worker entrypoint
│       └── jobs/
│           ├── seo-scan.job.ts
│           └── webhook-retry.job.ts
├── tests/
│   ├── unit/
│   └── integration/
├── .env.example
├── docker-compose.yml             # Postgres + Redis local dev
├── package.json
└── tsconfig.json
```

### Module boundaries

| Path | Owns |
|------|------|
| `src/lib/*` | Platform services used by all agents |
| `src/agents/*` | Agent-specific business logic; registers with platform |
| `src/app/(dashboard)/agents/*` | Agent UI pages and layouts |
| `src/app/api/agents/*` | Agent HTTP endpoints |
| `src/workers/*` | Long-running agent jobs |

Agents **must not** import from each other directly. Cross-agent flows go through `src/lib/transfers/`.

---

## 4. Authentication system

### Requirements (founder + features.md)

- One account = one person (v1)
- Email/password at launch
- Email verification mandatory before agent use
- Password reset
- Session-based access to dashboard and agents
- Role-based access for admin panel

### Implementation

```
Register → Verify email → Login → Dashboard
                ↓
         (blocked until verified)
```

| Component | Design |
|-----------|--------|
| **Provider** | Auth.js v5 with Credentials provider |
| **Password storage** | bcrypt (cost factor 12) |
| **Session** | Database sessions (revocable) for security; optional JWT for edge |
| **Verification** | Token table `email_verification_tokens`; 24h expiry |
| **Reset** | `password_reset_tokens`; single-use, 1h expiry |
| **Guards** | Middleware on `(dashboard)` and `(admin)` route groups |

### Authorization (RBAC)

| Role | Access |
|------|--------|
| `user` | Own dashboard, agents, billing, referrals |
| `support` | Admin read + limited write (points adjust, impersonation with audit) |
| `admin` | Full admin except super_admin settings |
| `super_admin` | All admin + feature flags + role assignment |

### Future-ready (not v1)

- OAuth (Google, Microsoft) — add Auth.js providers without schema break
- `organization_id` on session context when teams ship
- Passkeys — WebAuthn provider

### Security controls

- Rate limit login/register (Redis)
- CSRF via Auth.js defaults
- HTTP-only secure cookies
- Admin routes require `role >= support` + optional IP allowlist in production

---

## 5. Subscription system

### Business rules (founder decisions)

- Each agent has independent free and paid tiers
- User may hold **multiple paid subscriptions** (SEO Pro + Outreach Pro later)
- Paying for one agent does **not** grant paid access to others
- Points **cannot** reduce subscription fees or act as coupons

### Billing architecture

```
User clicks Upgrade (SEO)
        ↓
Checkout Session (Stripe)
  ├── Card
  └── PayPal (via Stripe or parallel PayPal flow)
        ↓
Webhook: checkout.session.completed / subscription.updated
        ↓
Upsert subscription record → Refresh entitlements cache
        ↓
User sees SEO Pro limits immediately
```

| Concept | Implementation |
|---------|----------------|
| **Product catalog** | `agent_plans` table synced with Stripe Products/Prices |
| **Subscription record** | One row per `(user_id, agent_id)` active subscription |
| **Provider IDs** | Store `stripe_subscription_id`, `stripe_customer_id`; PayPal subscription ID if native |
| **Entitlement resolution** | `getEntitlement(userId, agentSlug)` → `{ tier: 'free' \| 'pro', limits: {...} }` |
| **Webhooks** | Idempotent handlers; log all events to `payment_webhook_events` |
| **Cancellation** | v1 default: access until period end (Stripe `cancel_at_period_end`) |
| **Failed payment** | Stripe dunning; downgrade to free tier on `subscription.deleted` |

### Entitlement check flow (before scan)

```
1. Resolve user tier for agent (free | pro)
2. Load tier limits from agent_plans + usage_counters
3. If limit exceeded → 402-style response + upsell payload
4. If ok → increment reserved usage → enqueue job
5. On job failure → refund usage reservation
```

### PayPal dual-provider strategy

**Phase 1 (v1):** Stripe as system of record; enable PayPal as payment method on Stripe Checkout where region supports it.

**Phase 2 (if needed):** Native PayPal Subscriptions for users who refuse card flow; map both to same `subscriptions` table with `provider` enum.

---

## 6. Agent framework

### Agent module contract

Every agent implements `AgentModule`:

```typescript
interface AgentModule {
  slug: string;                    // 'seo', 'lead-finder', ...
  name: string;
  description: string;
  status: 'active' | 'coming_soon';
  icon: string;

  // Free/paid capabilities (metadata; limits in DB)
  tiers: { free: TierLimits; pro: TierLimits };

  // First successful use → activation event
  activationEventTypes: string[];  // e.g. ['seo.scan.completed']

  // Route prefix under /dashboard/agents/{slug}
  routes: AgentRoute[];

  // Register API handlers
  registerApi(router: ApiRegistry): void;

  // Optional: register worker job types
  registerJobs?(registry: JobRegistry): void;
}
```

### Agent registry

`src/agents/registry.ts` loads all modules at startup:

| Agent | v1 status |
|-------|-----------|
| `seo` | **active** |
| `lead-finder` | coming_soon |
| `outreach` | coming_soon |
| `mockup` | coming_soon |

Dashboard renders cards from registry. Only `active` agents are navigable.

### Activation (Q20)

Platform listens for domain events (e.g. `seo.scan.completed`). On first occurrence per `(user_id, agent_id)`:

1. Insert `agent_activations` (idempotent unique constraint)
2. Award points if eligible (once per agent)
3. Emit analytics event

Activation is **not** page view or button click.

### Cross-agent data transfer (Q11)

```
Lead Finder ──[User: Send to Outreach]──► agent_data_transfers
                                              ↓
                                    Outreach ingests payload
```

- Source agent creates transfer request with typed payload schema
- User confirms in UI modal
- Platform writes `agent_data_transfers` row + notifies target agent
- Target agent imports into its own tables
- v1: infrastructure only; UI ships when Lead Finder + Outreach ship

### SEO Agent internal architecture (v1)

```
Website (project)
  └── Scan (job)
        ├── Sitemap check/generate
        ├── Robots.txt check
        ├── Schema check
        ├── Broken link crawl (max 100 pages free)
        └── Index/noindex audit
              └── Report (issues + fixes)
```

Crawl runs in **worker process**, not HTTP request thread.

---

## 7. PWA architecture

### Goals

- Installable on desktop and mobile
- App-like navigation within dashboard
- Offline: limited (show cached shell + "connection required" for scans)

### Components

| Piece | Purpose |
|-------|---------|
| `manifest.webmanifest` | Name, icons, theme, `start_url`, `display: standalone` |
| Service worker | Precache shell assets; network-first for API |
| Icons | 192×192, 512×512, maskable |
| HTTPS | Required for service worker (production) |

### Caching strategy

| Resource | Strategy |
|----------|----------|
| Static JS/CSS | Cache-first (versioned bundles) |
| Dashboard shell | Stale-while-revalidate |
| API / scans | Network-only (never cache authenticated responses) |
| Marketing pages | ISR or SSG |

### Install prompt

- Custom in-app "Install app" banner after second visit (desktop + Android)
- iOS: manual "Add to Home Screen" instructions

### Push notifications (later)

- Schema hook: `user_notification_preferences`
- Not in v1 SEO scope unless founder prioritizes scan-complete alerts

---

## 8. User dashboard architecture

### Purpose

Single home for account, agents, usage, billing, referrals, and points.

### Information architecture

```
/dashboard
├── Home          Agent cards, usage summary, points balance
├── Agents
│   └── SEO       Websites → Scan → Report
├── Billing       Per-agent subscriptions, invoices, upgrade CTAs
├── Referrals     Link, stats, earned points
└── Settings      Profile, password, email, delete account
```

### Key widgets (home)

| Widget | Data source |
|--------|-------------|
| Agent cards | `agents` registry + entitlement tier badge |
| Usage meters | `usage_counters` per agent (e.g. 7/10 scans) |
| Points balance | `point_balances` |
| Referral CTA | `referral_codes` |

### Agent card states

| State | UI |
|-------|-----|
| Active + free | "Open" + usage meter |
| Active + pro | "Open" + Pro badge |
| Coming soon | Disabled card + waitlist optional (later) |

### Shared layout

- Top nav: logo, agents menu, points, profile
- Mobile: bottom nav (Home, Agents, Billing, More)
- Breadcrumbs inside agent modules

---

## 9. Admin dashboard architecture

### Purpose

Operations for founder/support: users, billing overrides, points, agents, audit.

### Access

- Route group `(admin)` protected by `role >= support`
- All write actions logged to `audit_logs`

### Sections

| Section | Capabilities (v1) |
|---------|-------------------|
| **Users** | Search, view profile, entitlements, usage, verify status |
| **Subscriptions** | View Stripe linkage, manual comp extension (super_admin) |
| **Points** | Ledger view, manual adjust with reason code |
| **Agents** | Feature flags (disable agent globally) |
| **Audit** | Filterable log: impersonation, points adjust, comp subs |

### Support impersonation (v1 default: super_admin only)

- Start impersonation → new session flagged `impersonating_user_id`
- Banner visible in UI
- All actions logged with `actor_id` + `impersonating_user_id`

### Feature flags

`feature_flags` table: `{ key, enabled, agent_slug? }`  
Examples: `seo.enabled`, `maintenance.mode`

---

## 10. Metering and limits (SEO v1)

From founder Q52 + v1 defaults:

| Limit | Free | Pro (placeholder) |
|-------|------|-------------------|
| Websites | 3 | 25 |
| Scans / month | 10 | 100 |
| Pages / scan | 100 | 500 |
| Scheduled scans | No | TBD |
| Report exports | TBD | TBD |

- Counters stored in `usage_counters` keyed by `(user_id, agent_id, period_yyyymm, metric)`
- Crawl worker enforces page cap; API enforces scan and website caps
- Period reset: cron job 1st of month UTC (calendar month default)

---

## 11. Points and referrals (platform layer)

| Rule | Implementation |
|------|----------------|
| No subscription discounts | Redemption catalog excludes coupons; code guard in checkout |
| Activation reward | On `agent_activations` insert; idempotent |
| Referral reward | On referred user email verify + first paid sub (TBD trigger detail) |
| $20:$1 guideline | Admin review before new redemption types |
| Ledger | Append-only `point_transactions`; balance denormalized in `point_balances` |

---

## 12. Deployment topology (v1)

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Vercel    │     │  Worker VM  │     │  Managed    │
│   Next.js   │────►│  BullMQ     │────►│  PostgreSQL │
└─────────────┘     └──────┬──────┘     └─────────────┘
                           │
                    ┌──────▼──────┐
                    │    Redis    │
                    └─────────────┘
```

- Webhooks: Vercel serverless `/api/webhooks/*`
- Workers: long-running Node process (Railway/Fly/VPS)
- Env secrets: Stripe, PayPal, DB, Redis, email

---

## 13. Non-goals (v1)

- Team/org UI and multi-seat billing
- Native iOS/Android apps
- Public API for third parties
- GSC / Bing integrations (post-v1)
- Cross-agent automated workflows (manual transfer infra only)
- Bundle pricing across agents

---

## 14. Open items

Update `master_context.md` when founder resolves:

- SEO paid price and exact paid limits
- Report export limits
- Calendar vs rolling month (currently defaulted to calendar)
- PayPal phase 1 vs phase 2 scope
- Domain verification strictness
- Referral reward trigger timing

See `founder_questions_priority.md` Important tier.
