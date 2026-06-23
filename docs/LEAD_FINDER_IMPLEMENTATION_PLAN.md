# Lead Finder — Apollo-First Implementation Plan

**Status:** Plan only — no code  
**Target:** ≥ **50 outreach-ready leads/day** (`email`, `shop_name`, `shop_url`, `niche`)  
**Scope:** Admin-only internal tool for **MockupExpo GTM** (not a customer-facing Apollo resale feature)

---

## Executive summary

| Item | Answer |
|------|--------|
| **Apollo plan** | **Professional (1 seat, annual billing)** + **~800–1,000 export-credit add-on/month** |
| **Monthly cost** | **~$99–130/month** ($79 base + ~$20–50 add-on credits; verify in Apollo billing) |
| **Leads/day (realistic)** | **50–70/day** sustained; **40–50/day** conservative first month while tuning filters |
| **API endpoints** | See §4 below (2-step: free search → paid enrichment) |
| **Time to build** | **~3.5–4 working days** |
| **Go / No-Go** | **Conditional GO** — see §7 |

---

## 1. Apollo plan required

### Why not Free / Basic

| Plan | Export credits (typical)* | Max sustainable enriched leads/day |
|------|---------------------------|-------------------------------------|
| Free | ~10/month | Not viable |
| Basic ($49/seat/mo) | ~1,000/month | ~25–33/day |
| **Professional ($79/seat/mo)** | **~2,000/month** | **~45–55/day** without add-ons |
| Organization ($119/seat/mo, 3-seat min) | ~4,000/month | ~80–130/day |

\*Apollo migrated to a unified credit system for new accounts. **Verify exact export-credit allowance in Apollo → Settings → Credits** before purchase. Apollo states Person API enrichment consumes **export credits** when data leaves Apollo ([pricing FAQ](https://www.apollo.io/pricing)).

### Recommended purchase

**Apollo Professional — 1 seat — annual billing ($79/user/month).**

Add **~800–1,000 export credits/month** via Apollo’s in-app credit purchase so daily enrichment budget is:

| Daily need | Credits/month |
|------------|---------------|
| Target 50 valid leads | ~50 enrichments if filters are tight |
| Buffer (no-email + non-store discards) | +30–40/day |
| **Plan for** | **~2,400–2,700 export credits/month** |

Professional’s included ~2,000 credits + ~700 add-on ≈ **2,700/month** → supports **50+/day**.

### Alternative (only if add-ons are expensive)

**Organization (3 seats, $119/user/month annual = $357/month minimum)** if export add-ons cost more than the seat delta. Only choose this if you already need 3 Apollo seats.

### Account setup requirements

1. **Master API key** with access to Search + Enrichment endpoints ([Create API Keys](https://docs.apollo.io/docs/create-api-key)).
2. **`mixed_people/api_search` requires master key** per Apollo docs.
3. Track usage via `GET /api/v1/usage_stats/api_usage_stats` (or Apollo developer dashboard).

---

## 2. Monthly cost

| Line item | Cost |
|-----------|------|
| Apollo Professional (1 seat, annual) | **$79/mo** |
| Export credit add-on (~800–1,000/mo) | **~$20–50/mo** (Apollo in-app pricing; ~$0.02–0.05/credit industry typical) |
| **Total** | **~$99–130/month** |
| Cost per outreach-ready lead (50/day) | **~$0.07–0.09** |

No Hunter or Google CSE subscription required on this path.

---

## 3. Realistic leads/day

### Credit math (corrected API model)

Apollo does **not** return emails from search. Workflow is:

1. **Search (free)** → get person `id`, org name, org website, `has_email` flag  
2. **Enrich (paid)** → `people/bulk_match` returns email; **1 export credit per enriched person** (typical)

### Yield assumptions

| Stage | Rate |
|-------|------|
| Search results with `has_email: true` + verified status filter | Pre-filter before spending credits |
| Enrichment returns business email | ~75–85% of `has_email:true` rows |
| Pass Shopify/POD store post-filter (`shop_url` valid) | ~60–70% of enriched rows |
| **Net from 100 enrichments** | **~45–60 outreach-ready leads** |

### Daily target

| Mode | Leads/day | Enrichments/day | Notes |
|------|-----------|-----------------|-------|
| **Conservative** | **40–50** | ~75 | First 2 weeks; filters being tuned |
| **Steady state** | **50–70** | ~85–100 | 3–5 niche keywords, 2 runs/day possible |
| **Ceiling (Pro + add-ons)** | **~80** | ~120 | Before rate limits or credit cap |

**Etsy:** expect **0–3/day** via Apollo (most Etsy sellers lack org website in Apollo). Etsy-only URLs without email are never stored.

**Important:** POD Outreach currently caps **20 sends/day**. Lead Finder can produce 50+ leads/day into review queue; send cap is a separate product decision.

---

## 4. Apollo API endpoints

**Base URL:** `https://api.apollo.io/api/v1`  
**Auth:** `x-api-key: {APOLLO_API_KEY}` (master key)  
**Official pricing doc:** [API Pricing](https://docs.apollo.io/docs/api-pricing)

### Primary pipeline (use these)

| Step | Method | Endpoint | Credits | Purpose |
|------|--------|----------|---------|---------|
| 1 | `POST` | `/mixed_people/api_search` | **0** | Discover owners/founders at Shopify/POD companies |
| 2 | `POST` | `/people/bulk_match` | **~1 per person** (up to 10/call) | Reveal email + firmographics; discard if no email |
| 3 | `GET` | `/usage_stats/api_usage_stats` | 0 | Monitor credits + rate limits |

### Step 1 — `api_search` parameters (fixed template + admin niche)

| Parameter | Value |
|-----------|--------|
| `person_titles[]` | `owner`, `founder`, `ceo`, `co-founder`, `ecommerce manager` |
| `person_seniorities[]` | `owner`, `founder`, `c_suite` |
| `organization_num_employees_ranges[]` | `1,10`, `11,50` |
| `organization_locations[]` | `United States`, `United Kingdom`, `Canada`, `Australia` |
| `q_keywords` | `{admin_niche}` (e.g. `dog mom mug print on demand`) |
| `currently_using_any_of_technology_uids[]` | `shopify` |
| `contact_email_status[]` | `verified` (expand to `likely to engage` only if volume short) |
| `include_similar_titles` | `false` |
| `per_page` | `100` |
| `page` | Paginate until daily enrichment quota reached |

**Use `has_email: true` in response** to decide who to enrich — do not enrich rows flagged without email.

### Step 2 — `bulk_match` parameters

| Parameter | Value |
|-----------|--------|
| `details[]` | Up to 10 objects with `id` from Step 1 |
| `reveal_personal_emails` | `false` (business emails only; GDPR) |
| `reveal_phone_number` | `false` (not needed) |

Map enriched row → output:

| Output | Source |
|--------|--------|
| `email` | `person.email` — **required**; no email → discard |
| `shop_name` | `organization.name` |
| `shop_url` | `organization.website_url` — **required**; no URL → discard |
| `niche` | Admin keyword for this run |

### Optional (not in v1 hot path)

| Endpoint | When | Credits |
|----------|------|---------|
| `POST /mixed_companies/search` | If people search too noisy | Consumes credits — avoid in v1 |
| `POST /people/match` | Single-row fallback | 1/person — use only for bulk_match failures |
| `POST /organizations/enrich` | Domain validation | 1/org — skip unless needed |

### Do NOT use

| Endpoint | Reason |
|----------|--------|
| `POST /mixed_people/search` | Legacy UI search; deprecated for API-first flows; may 403 on some plans |
| Any save/export without email gate | Violates Lead Finder rules |

### Rate limits (typical)

- `bulk_match`: up to **600 calls/hour** (per Apollo usage stats examples) → sufficient for 50/day
- `api_search`: **6,000 calls/day** tier common → sufficient

---

## 5. Apollo terms — does this workflow allow?

### Allowed (supports GO)

| Source | Permits |
|--------|---------|
| [Apollo Terms of Service](https://www.apollo.io/terms) | Services for **internal business purposes**: B2B sales, marketing, business development; identify prospective sales opportunities |
| [API Terms §2](https://www.apollo.io/terms/api) | API use for **internal business purposes** |
| [Pricing FAQ](https://www.apollo.io/pricing) | Standard plans = **internal business use** |

This workflow: founder uses Lead Finder to build **MockupExpo’s own** prospect list → enrich → review in POD Outreach → send cold email. **Not** reselling Apollo data.

### Restricted (must design around)

| Source | Restriction | Design response |
|--------|-------------|-----------------|
| [Pricing FAQ](https://www.apollo.io/pricing) | Plans **cannot power external products**, share data with customers, or resell data | Lead Finder **admin-only**; **not** exposed to AgentPlatform customers |
| [API Terms §3](https://www.apollo.io/terms/api) | Cannot integrate APIs into **your product/services** without Apollo authorization | Scope as **internal operator tool** for MockupExpo; do not market “Apollo-powered lead search” to end users |
| [API Terms §5(i)](https://www.apollo.io/terms/api) | Cannot replicate/compete with Apollo | Do not rebuild Apollo search UI for general B2B prospecting |
| GDPR | Personal emails in EU | Use `reveal_personal_emails=false`; geo-filter US/UK/CA/AU; honor opt-out |
| CAN-SPAM | Cold email | POD Outreach review-before-send; opt-out + physical address in templates |

### Etsy

Only ingest when Apollo provides **both** email and shop URL. No Etsy scraping in v1.

**Terms verdict:** Workflow is **permitted for internal MockupExpo GTM** if Lead Finder remains **super_admin-only** and Apollo data is **not** shown to or consumed by platform customers.

---

## 6. Implementation plan (no code)

### Day 1 — Apollo adapter + config

| Task | Detail |
|------|--------|
| Env | `APOLLO_API_KEY` (master), optional `LEAD_FINDER_DAILY_TARGET=50` |
| `src/lib/lead-finder/apollo-client.ts` | HTTP client, auth header, error typing |
| `src/lib/lead-finder/apollo-search.ts` | `api_search` with fixed POD/Shopify filter template + niche param |
| `src/lib/lead-finder/apollo-enrich.ts` | Batch `bulk_match` (10 per call), parse email/org/website |
| `src/lib/lead-finder/lead-mapper.ts` | Map to `{ email, shop_name, shop_url, niche }`; return `null` if missing email or URL |
| `src/lib/lead-finder/credits.ts` | Stop run when daily enrichment budget hit |

### Day 2 — Pipeline + persistence

| Task | Detail |
|------|--------|
| `src/lib/lead-finder/run-pipeline.ts` | Orchestrate: search pages → filter `has_email` → enrich batches → map → dedupe by email |
| Prisma | `LeadFinderRun` (status, niche, counts, creditsUsed, startedAt) — optional `LeadFinderCandidate` only if audit needed; prefer direct push to `pod_leads` |
| Dedupe | Skip if `email` already in `pod_leads` |
| Push | Insert into `pod_leads` with source `apollo_lead_finder` |
| Shopify confirm | Optional lightweight check: `shop_url` contains `myshopify.com` OR HEAD request for Shopify CDN markers (borderline orgs only) |

### Day 3 — API routes + worker

| Task | Detail |
|------|--------|
| `POST /api/agents/lead-finder/run` | Admin-only; body: `{ niches: string[] }`; enqueue job |
| Worker | Reuse existing BullMQ/redis pattern from SEO agent (`src/lib/queue/`) |
| `GET /api/agents/lead-finder/runs` | List recent runs + stats (searched, enriched, saved, discarded) |
| `GET /api/agents/lead-finder/usage` | Proxy Apollo credit stats or store local counters |

### Day 4 — Admin UI + hardening

| Task | Detail |
|------|--------|
| Route | `/dashboard/agents/lead-finder` (admin-only, mirror pod-outreach guard) |
| UI | Niche keyword input (3–5), Run button, progress, today’s counts vs 50 target |
| Seed | Set `lead-finder` agent status `active` for admins |
| Dashboard card | Show on admin dashboard only |
| Guards | Max enrichments/run (e.g. 120), max niches/run (5), idempotent daily cron optional |
| `.env.example` | Document `APOLLO_API_KEY` |

### Acceptance criteria

| # | Criterion |
|---|-----------|
| 1 | One run with 3 niches produces **≥50 rows** in `pod_leads` with all four fields populated |
| 2 | **Zero** rows stored without `email` |
| 3 | **Zero** rows stored without `shop_url` |
| 4 | Duplicate emails across runs are skipped |
| 5 | Run stops before exceeding configured daily credit budget |
| 6 | Non-admin users cannot access Lead Finder or API routes |

### Pre-build checklist (founder)

- [ ] Purchase Apollo Professional (annual, 1 seat)
- [ ] Purchase ~800–1,000 export credit add-on
- [ ] Create **master API key** with Search + Enrichment scopes
- [ ] Run one manual `api_search` + `bulk_match` test in Apollo docs / Postman to confirm credit burn rate on your account
- [ ] Confirm Lead Finder stays **admin-only** (terms compliance)

---

## 7. Go / No-Go recommendation

### **Conditional GO**

**Proceed with implementation if all of the following are true:**

1. Lead Finder is **MockupExpo internal GTM only** (super_admin operator), **not** a feature sold to AgentPlatform customers.
2. Apollo account is **Professional + export credit add-on** (or Organization if cheaper at your volume).
3. Founder accepts **~$99–130/month** Apollo cost and **40–70 leads/day** realistic range while filters are tuned.
4. Outreach compliance stays in POD Outreach (review-before-send, opt-out, CAN-SPAM/GDPR).
5. Optional but recommended: email **Apollo support** confirming API integration in an internal admin tool is acceptable under your plan.

### **No-Go if:**

- Lead Finder will be exposed to **paying platform users** or multi-tenant customers → requires **Apollo custom data agreement** ([pricing FAQ](https://www.apollo.io/pricing), [API FAQs data licensing](https://docs.apollo.io/docs/apollo-api-faqs)).
- Budget cap is **<$80/month** → cannot reliably sustain 50 enriched leads/day.
- You need **guaranteed Etsy volume** → Apollo is wrong primary source.

---

## 8. Correction vs prior design doc

Prior [`LEAD_FINDER_DESIGN.md`](LEAD_FINDER_DESIGN.md) assumed `mixed_people/search` returns emails in one call. **Apollo’s current API does not.** Correct flow:

```
api_search (free, no email) → bulk_match (paid, email reveal) → email gate → pod_leads
```

Update design doc when implementation starts.

---

*Plan only. No code until explicitly approved.*
