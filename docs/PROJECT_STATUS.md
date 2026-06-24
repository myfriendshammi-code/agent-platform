# Project Status

**As of:** 2026-06-23  
**Tag:** `stable-baseline` → next: Lead Finder MVP commit  
**Purpose:** Handoff snapshot after stripping outreach and shipping discover + export only.

---

## Verified working

| Item | Evidence |
|------|----------|
| **Lead Finder discover** | Serper search → contact-page email extract → save to `pod_leads` |
| **Merchant filtering** | Vendor/app homepage skip (`vendor-filter.ts`); app/vendor classification at save |
| **Duplicate prevention** | Unique `(user_id, email)`; discover skips seen emails |
| **Email source URL** | `email_source_url` column; shown in lead list (3-line format) |
| **CSV export** | `GET /api/agents/pod-outreach/leads/export` → `leadfinder-YYYY-MM-DD.csv` |
| **Existing leads intact** | 6 historical leads retained; `email_source_url` preserved |
| **Auth / JWT** | Login, dashboard, session restart handling (commit `f6d416c`) |
| **SEO Agent** | Shipped; not re-tested this cycle |
| **Build** | `npm run typecheck` passes |

**CSV columns:** `discovered_date`, `niche`, `shop_name`, `shop_url`, `email`, `email_source_url`, `lead_type`, `confidence_score`, `notes`

**Route:** `/dashboard/agents/pod-outreach` (admin+; agent card: **Lead Finder**)

**Local start:**

```powershell
docker compose up -d
npm run db:migrate
npm run dev          # http://localhost:3001
npm run worker:dev   # required for discover jobs
```

---

## Intentionally NOT built (this phase)

| Area | Status |
|------|--------|
| SMTP / email send | Removed |
| Outreach email generation | Removed |
| Copy for Gmail | Removed |
| CSV import for outreach | Removed |
| Daily send counters | Removed |
| Reply / interested tracking UI | Removed |
| Review & send panel | Removed |
| Billing / Stripe / PayPal | Not built |
| Referrals / points | Not built |
| Public multi-user Lead Finder | Admin-only |
| Hosting / domain setup | Not built |
| MyDollar integration | Not built |
| Separate `/agents/lead-finder` route | Uses existing `pod-outreach` slug/path |

---

## Not verified (future phases)

| Item | Notes |
|------|-------|
| **Full 20-lead discover run post-refactor** | Requires `SERPER_API_KEY` + Redis + worker in this session |
| **Production deploy** | Local dev only |
| **Lead type accuracy at scale** | Heuristic classifier; manual review recommended |
| **MockupExpo revenue** | Out of scope for Lead Finder MVP |

---

## Known issues

| Issue | Impact |
|-------|--------|
| **`shop_name` often page titles** | e.g. "Contact" — edit in CSV after export |
| **Legacy outreach columns remain in DB** | `subject`, `body_*`, `status`, `sent_at` unused; data kept for history |
| **6 legacy leads include 1 app company** | Customily — filter on export or delete manually |
| **`AUTH_SECRET` must stay stable** | Changing invalidates sessions |

---

## Next highest-impact task (future phase — NOT now)

**Outreach phase (when approved):** import CSV export into a separate Outreach agent with review-before-send, SMTP, and reply tracking. Lead Finder MVP stops at export.

---

## Migrations (6 total)

1. `20250621000000_phase_0_system_meta`
2. `20250621120000_phase_1_platform`
3. `20250621200000_phase_2_seo_agent`
4. `20250621210000_pod_outreach_mvp`
5. `20250623120000_pod_lead_email_source_url`
6. `20250623140000_lead_finder_classification`

---

## Required environment variables

| Variable | Required |
|----------|----------|
| `DATABASE_URL` | Yes |
| `AUTH_SECRET` | Yes |
| `REDIS_URL` | Discover jobs |
| `SERPER_API_KEY` | Discover |
| `NEXT_PUBLIC_APP_URL` | Yes (`http://localhost:3001`) |

See `.env.example`.
