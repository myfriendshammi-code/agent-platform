# Project Status

**As of:** 2026-06-23  
**Tag:** `stable-baseline`  
**Purpose:** Recoverable snapshot for handoff — what works, what is proven, what is not, and what to do next.  
**Branch:** `main`

---

## Working

Shipped code that runs locally when dependencies are up (Docker Postgres/Redis, `.env`, `npm run dev` on port 3001).

| Area | Notes |
|------|--------|
| **Platform shell** | Auth (register/login), dashboard, settings, admin users/audit |
| **SEO Agent** | Websites, scans, usage API, BullMQ worker (`seo-scans` queue) |
| **POD Outreach** | CSV import (max 50), lead storage, email generation, review UI, Copy for Gmail, 20/day send cap, status tracking |
| **Lead Finder (in POD Outreach)** | Serper search → contact-page email extract → save to `pod_leads` with draft email |
| **Lead list UX** | Three-line lead rows: shop name, email, email source URL (`email_source_url`) |
| **JWT / session** | Stable `AUTH_SECRET`, DB-resilient JWT callback, dashboard redirects to `/login` on invalid session |
| **Dev tooling** | `npm run typecheck` passes; CI workflow present |

**Local start (minimum):**

```powershell
docker compose up -d
npm run db:migrate
npm run dev
```

**Lead Finder also needs:** `npm run worker:dev` (Redis) + `SERPER_API_KEY` in `.env`.

---

## Verified

Tested or evidenced in repo / this development cycle.

| Item | Evidence |
|------|----------|
| **Login + dashboard** | JWT proof script passed; login → dashboard → dev restart → session OK or redirect to login (commit `f6d416c`) |
| **POD Outreach UI** | Route `/dashboard/agents/pod-outreach` (admin+); 6 leads in DB with drafts |
| **Email source URL persistence** | Migration `20250623120000_pod_lead_email_source_url`; 6 existing leads backfilled with contact-page URLs |
| **Lead quality review** | Manual page fetch confirmed emails on merchant contact/FAQ pages for all 6 leads |
| **SMTP status** | `POD_SMTP_*` unset → dev mode logs to console; Copy for Gmail format verified |
| **Build / types** | `npm run typecheck` exit 0 |
| **Migrations** | 5 migrations applied through `20250623120000_pod_lead_email_source_url` |

**Lead classifications (manual review, 2026-06-23):**

| Verdict | Leads |
|---------|-------|
| Likely POD merchants | petional, satsandstripes, furryjoystore, geckocustom (weak shop names) |
| POD merchant (print-domain caveat) | 365printinginc |
| Skip — app company | customily |

---

## Not verified

| Item | Why |
|------|-----|
| **Lead Finder end-to-end in production** | Requires Redis + worker + Serper; not re-run as full 20-lead job in this baseline |
| **Real SMTP send to prospect** | `POD_SMTP_*` not configured |
| **MockupExpo demand / revenue** | No completed 20-send experiment; conversions live on mockupexpo.com |
| **Reply / interest automation** | Manual status updates only |
| **SEO Agent (this cycle)** | Shipped earlier; not re-tested for baseline |
| **Billing / referrals / points** | Not built |
| **Shop name quality from discovery** | Scraper often stores page titles ("Contact") instead of brand names |

---

## Known issues

| Issue | Impact |
|-------|--------|
| **`AUTH_SECRET` must be stable in `.env`** | Changing it invalidates cookies; users must re-login |
| **Docker Desktop required locally** | Postgres/Redis via `docker compose`; app fails without DB |
| **Worker not auto-started** | Lead Finder discover jobs queue until `npm run worker:dev` runs |
| **SMTP unset** | Send button logs to server console only |
| **Lead Finder noise** | Can surface app vendors (e.g. Customily) and print vendors; vendor filter exists but not perfect |
| **`shop_name` from page titles** | Outreach subjects read awkwardly ("Better mockups for Contact us?") — needs manual edit before send |
| **`.env` not in repo** | Each machine needs copy from `.env.example` + generated `AUTH_SECRET` |

---

## Next highest-impact task

**Send a small demand-validation batch (5–10 emails) to verified POD merchants via Copy for Gmail — no new code.**

1. Open `/dashboard/agents/pod-outreach`
2. Select leads: petional, satsandstripes, furryjoystore (skip customily, review 365printinginc/geckocustom)
3. Fix shop name in subject/body where needed
4. **Copy for Gmail** → send manually
5. Track replies for 7 days; check mockupexpo.com for `utm_source=pod-outreach` traffic

This proves demand before investing in lead-quality fixes or SMTP automation.

---

## Related docs

| Doc | Purpose |
|-----|---------|
| `docs/changelog.md` | Version history |
| `docs/REVENUE_GAP_ANALYSIS.md` | Revenue blockers |
| `docs/LEAD_FINDER_ZERO_COST.md` | Lead Finder design (Serper path) |
| `docs/MOCKUPEXPO_DEMAND_VALIDATION.md` | Manual validation plan |
| `.env.example` | Required environment variables |
