# AgentPlatform — Development Roadmap

**Version:** 1.0  
**Source of truth:** `master_context.md`, `ARCHITECTURE.md`, `DATABASE.md`  
**Development order (founder):** Platform foundation → SEO Agent → Lead Finder → Outreach → Mockup

---

## Roadmap overview

```
Phase 0 ──► Phase 1 ──► Phase 2 ──► Phase 3 ──► Phase 4 ──► Phase 5+
Setup       Foundation   SEO Agent    Billing+     SEO Paid    Future
                                   Points       Launch       Agents
```

| Phase | Name | Goal | Ship criteria |
|-------|------|------|---------------|
| **0** | Project setup | Dev environment, CI, empty deploy | App boots; DB migrates; health check passes |
| **1** | Platform foundation | Auth, dashboard shell, agent registry | User can register, verify email, see dashboard |
| **2** | SEO Agent (free) | Core SEO scans on free tier | User can add website, run scan, view report |
| **3** | Billing + points | Stripe/PayPal, subscriptions, referrals | User can upgrade SEO; points for activation/referral |
| **4** | SEO paid + polish | Paid limits, exports, admin ops | Paid tier live; admin can support users |
| **5+** | Expansion | GSC, new agents, teams | Per-agent roadmap below |

---

## Phase 0 — Project setup

**Duration estimate:** 1 week

### Deliverables

- [x] Initialize Next.js 15 + TypeScript + Tailwind + shadcn/ui
- [x] Docker Compose: PostgreSQL + Redis
- [x] Prisma init; first migration (empty or users-only stub)
- [x] Env template (`.env.example`)
- [x] ESLint, Prettier, basic CI (lint + typecheck)
- [x] Deploy pipeline: Vercel (web) + worker host placeholder
- [x] PWA manifest + placeholder icons
- [x] `docs/` linked in README

**Completed:** 2025-06-21 — see `docs/changelog.md` v0.1.0

### Exit criteria

- `npm run dev` serves landing page
- `npm run db:migrate` succeeds locally
- Production URL loads with HTTPS

---

## Phase 1 — Platform foundation

**Duration estimate:** 3–4 weeks  
**Depends on:** Phase 0

### 1.1 Authentication

- [x] Auth.js credentials provider
- [x] Register / login / logout
- [x] Email verification flow (block agent routes until verified)
- [x] Password reset flow
- [x] Session middleware on `(dashboard)` routes
- [x] RBAC roles seeded (`super_admin` for founder via `db:seed`)

**Completed:** 2025-06-21

### 1.2 Database — core tables

- [x] `users`, auth tables, `organizations` (empty usage)
- [x] `agents` seed (4 agents; all `coming_soon` in Phase 1 build)
- [x] `agent_plans` seed (SEO free limits from Q52)
- [x] `websites` table (schema only)
- [x] `agent_activations` table

### 1.3 Agent framework

- [x] `AgentModule` interface + registry
- [x] Agent stub pages (no SEO features)
- [x] Coming-soon stubs for all agents
- [x] Platform event bus for activation events (internal stub)

### 1.4 User dashboard shell

- [x] Layout: nav, mobile responsive
- [x] Home: agent cards from registry
- [x] Settings: profile, change password
- [ ] Usage meter component (deferred — Phase 2)
- [ ] Billing + referrals pages (deferred — Phase 3)

### 1.5 PWA baseline

- [x] Service worker (shell placeholder from Phase 0)
- [x] Installable manifest
- [ ] Offline fallback page (deferred)

### 1.6 Admin dashboard (minimal)

- [x] Role-gated `(admin)` layout
- [x] User list + search
- [x] Audit log table (writes from auth/settings actions)

**Phase 1 completed:** 2025-06-21 — see `docs/changelog.md` v0.2.0

### Exit criteria

- New user registers → verifies email → lands on dashboard
- SEO card opens stub; other agents show "Coming soon"
- Admin can list users
- PWA installable on Chrome desktop

---

## Phase 2 — SEO Agent (free tier)

**Duration estimate:** 4–5 weeks  
**Depends on:** Phase 1

### 2.1 Website (project) management

- [x] Add website by domain (normalize URL → domain)
- [x] Domain verification flow (DNS TXT or meta tag) — v1 default
- [x] List / delete websites
- [x] Enforce free limit: **3 websites** per account

### 2.2 Usage metering

- [x] `usage_periods` + `usage_counters`
- [x] Calendar month reset job
- [x] Enforce **10 scans/month**, **100 pages/scan**
- [x] Limit exceeded → hard block (upsell modal deferred to Phase 3)

### 2.3 Scan pipeline

- [x] BullMQ worker process
- [x] `seo_scans` lifecycle: queued → running → completed/failed
- [x] Scan orchestrator runs checks:
  - [x] Sitemap check/generation (download, not host)
  - [x] Robots.txt check
  - [x] Schema check (JSON-LD / microdata basics)
  - [x] Broken link crawl (respect robots.txt, page cap)
  - [x] Index/noindex audit (meta robots + headers; no GSC)
- [x] `seo_scan_pages`, `seo_issues` persistence

### 2.4 Reports

- [x] In-app report view: issues grouped by category/severity
- [x] Fix instructions per issue (founder: "exact fixes")
- [x] `seo_reports` summary JSON
- [x] Scan history per website

### 2.5 Activation + analytics

- [x] On first `seo.scan.completed` → `agent_activations` insert
- [x] Hook for points (award in Phase 3)

**Completed:** 2025-06-21 — see `docs/changelog.md` v0.3.0

### Exit criteria

- Verified user adds 3 sites max
- Full scan completes within page cap
- Report shows actionable fixes
- 11th scan in month is blocked (upgrade CTA in Phase 3)
- First scan triggers activation record

---

## Phase 3 — Billing, subscriptions, points

**Duration estimate:** 3–4 weeks  
**Depends on:** Phase 2

### 3.1 Stripe integration

- [ ] Stripe customer on user create (lazy ok)
- [ ] SEO Pro product/price in Stripe synced to `agent_plans`
- [ ] Checkout session for SEO upgrade
- [ ] Customer portal link (manage payment method, cancel)
- [ ] Webhooks: subscription created/updated/deleted
- [ ] Idempotent `payment_webhook_events`

### 3.2 PayPal integration

- [ ] Phase 3a: PayPal via Stripe Checkout if available
- [ ] Phase 3b (if gap): Native PayPal subscription + webhook mapping

**Founder alignment:** Q34 both Stripe and PayPal required

### 3.3 Entitlements

- [ ] `subscriptions` table populated from webhooks
- [ ] `getEntitlement(user, agent)` drives all limit checks
- [ ] Billing page: per-agent subscription status
- [ ] Multiple paid subs supported (structure only; one agent live)

### 3.4 Points and referrals

- [ ] `referral_codes`, `referrals`, `point_balances`, `point_transactions`
- [ ] Referral link on dashboard
- [ ] Award points: agent activation (once per agent)
- [ ] Award points: referral (trigger TBD — default: referred user verifies + first paid sub)
- [ ] Redemption catalog stub (no subscription discounts — hard rule)
- [ ] Idempotency keys on awards

### 3.5 User dashboard updates

- [ ] Billing page functional
- [ ] Referrals page with stats
- [ ] Points balance in header

### Exit criteria

- User upgrades SEO to Pro via Stripe (and PayPal if enabled)
- Webhook failure recovery tested
- Activation and referral points appear once only
- Cancelled sub reverts to free limits at period end

---

## Phase 4 — SEO paid tier + admin ops

**Duration estimate:** 2–3 weeks  
**Depends on:** Phase 3

### 4.1 SEO Pro limits

- [ ] Apply paid limits (placeholder: 25 sites / 100 scans / 500 pages — update from founder)
- [ ] SEO Pro price finalized (default $9/mo from `pricing.md`)

### 4.2 Report exports (if founder decides limits)

- [ ] PDF export for paid users (optional v1)
- [ ] Export usage counter if free tier capped

### 4.3 Admin panel completion

- [ ] Subscription view (read-only Stripe link)
- [ ] Points adjust with reason + audit
- [ ] Feature flags: disable SEO globally
- [ ] Super admin impersonation with banner + audit

### 4.4 Hardening

- [ ] Rate limiting on auth and scan APIs
- [ ] Sentry error tracking
- [ ] Webhook retry job
- [ ] Load test: 10 concurrent crawls

### 4.5 Launch prep

- [ ] Privacy policy + Terms + AUP pages
- [ ] Cookie consent if required
- [ ] Marketing landing page + pricing
- [ ] Email templates (verify, reset, scan complete optional)

### Exit criteria

- Paid user gets higher limits immediately after checkout
- Admin can diagnose user billing and adjust points
- Platform ready for public beta

---

## Phase 5+ — Post-MVP expansion

### 5A — SEO enhancements

| Item | Priority | Notes |
|------|----------|-------|
| Google Search Console OAuth | High | Index data, query metrics |
| Bing Webmaster integration | Medium | |
| Scheduled scans | Medium | Paid feature candidate |
| Scan diff / regression | Medium | Compare to previous scan |
| Email alerts on new critical issues | Low | |

### 5B — Lead Finder Agent

| Item | Notes |
|------|-------|
| Business discovery module | New agent tables |
| Contact collection + export | |
| `agent_data_transfers` → Outreach | First cross-agent handoff UI |
| Free + Pro tiers ($19/mo placeholder) | |

### 5C — Outreach Agent

| Item | Notes |
|------|-------|
| Email generation + campaigns | CAN-SPAM compliance |
| Import leads from transfer | |
| Pro tier ($49/mo placeholder) | |

### 5D — Mockup Agent

| Item | Notes |
|------|-------|
| Image generation | GPU cost, moderation |
| Asset library | Object storage |
| Pro tier ($9/mo placeholder) | |

### 5E — Platform maturity

| Item | Notes |
|------|-------|
| Teams / organizations | Use pre-built schema |
| OAuth login (Google) | |
| Annual billing | |
| Bundle plans | Founder: future only |
| Public API | |
| Agent marketplace | Long-term vision |

---

## Milestone timeline (indicative)

Assumes 1 full-time developer. Adjust for team size.

| Milestone | Target | Cumulative |
|-----------|--------|------------|
| M0: Dev setup | Week 1 | 1 week |
| M1: Foundation live | Week 5 | 5 weeks |
| M2: SEO free beta | Week 10 | 10 weeks |
| M3: Billing + points | Week 14 | 14 weeks |
| M4: Public launch (SEO) | Week 17 | 17 weeks |
| M5: Lead Finder alpha | Week 24+ | TBD |

---

## Dependency graph

```
Phase 0
   └── Phase 1 (auth, dashboard, registry)
          └── Phase 2 (SEO free, metering, worker)
                 └── Phase 3 (Stripe, PayPal, points)
                        └── Phase 4 (SEO paid, admin, launch)
                               ├── Phase 5A (GSC)
                               ├── Phase 5B (Lead Finder)
                               ├── Phase 5C (Outreach)
                               └── Phase 5D (Mockup)
```

**Parallel work (optional with 2+ devs):**

- Phase 1 admin UI ∥ auth backend
- Phase 2 crawler checks ∥ dashboard UI
- Phase 3 PayPal ∥ points UI

---

## Founder blockers → roadmap mapping

Resolve before starting the phase indicated:

| Blocker | Phase needed |
|---------|--------------|
| Q36 SEO paid price/limits | Before Phase 4 |
| Q53 limit reset period | Before Phase 2 (default: calendar month) |
| Q54 limit exceeded UX | Before Phase 2 (default: hard block + upsell) |
| Q66 report format | Before Phase 2 (default: in-app) |
| Q71 domain verification | Before Phase 2 (default: required) |
| Q76 points hard rule | Before Phase 3 (default: confirmed yes) |
| PayPal integration model | Before Phase 3 |
| Q35 tax / merchant of record | Before Phase 3 public launch |

---

## Risk register (roadmap)

| Risk | Phase | Mitigation |
|------|-------|------------|
| Crawl cost blowout on free tier | 2 | Domain verify + hard page cap + rate limits |
| Stripe/PayPal dual complexity | 3 | Stripe-first; PayPal phase 3b if needed |
| SEO value without GSC | 2–4 | Clear UX: "on-page audit"; GSC in 5A |
| Referral fraud | 3 | Email verify gate; clawback on chargeback |
| Solo dev timeline slip | All | Ship Phase 2 beta before Phase 3 if needed |

---

## Definition of done — platform foundation (Phase 1)

Matches founder need for "done before SEO Agent ships" (Q3 default):

1. User registration with email verification
2. Login/logout and password reset
3. User dashboard with agent cards (SEO active, others coming soon)
4. Agent registry with module contract
5. Admin user list + audit logging
6. Database migrated through core + catalog tables
7. PWA installable shell
8. No SEO scan functionality yet (Phase 2)

---

## Success metrics by phase

| Phase | Metric |
|-------|--------|
| 1 | 10 internal test accounts registered |
| 2 | 50 scans completed; <5% job failure rate |
| 3 | First paid conversion; webhook 100% idempotent |
| 4 | 10 paying SEO users; support ticket <24h response |
| 5+ | MRR growth per agent; churn <8% monthly |

---

## Document maintenance

- Update this roadmap when phases slip or scope changes
- Record date + decision in `master_context.md` and `decisions.md`
- Do not start a phase until exit criteria of prior phase are met
