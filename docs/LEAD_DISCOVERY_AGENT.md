# Lead Discovery Agent — Architecture & Implementation Plan

**Version:** 1.0  
**Status:** Planning only — no code yet  
**Goal:** Automatically find Shopify, POD, and Etsy seller contact details and deliver CSV-ready leads to POD Outreach **without manual collection or CSV upload**  
**Business goal:** Generate MockupExpo paying customers faster (`docs/REVENUE_GAP_ANALYSIS.md`)  
**Agent slug:** `lead-finder` (existing seed stub — display name **Lead Discovery**)  
**Downstream consumer:** `pod-outreach` (`pod_leads` table)

---

## 0. Executive summary

Lead Discovery Agent closes the gap identified in `REVENUE_GAP_ANALYSIS.md`: POD Outreach can generate and send email, but **cannot find leads**. This agent automates:

```
Configure search → Discover shops → Enrich contact → Validate → Push to POD Outreach
```

The founder never builds a CSV file. Leads appear in POD Outreach review queue with emails and generated outreach copy already attached.

**Hard constraints (unchanged):**

| Area | Rule |
|------|------|
| SEO Agent | Do not modify |
| Billing / referrals / points | Do not modify |
| POD Outreach send logic | Extend only via push API — do not rewrite outreach |
| This phase | Architecture + plan only — **no code** |

---

## 1. Problem statement

### Current state

| Step | POD Outreach today |
|------|-------------------|
| Find sellers | **Manual** — founder builds CSV externally |
| Import | Manual file upload |
| Generate email | Automatic on import |
| Send | Automatic (20/day cap) |

### Target state

| Step | After Lead Discovery |
|------|---------------------|
| Find sellers | **Automatic** — admin configures niche + platforms, clicks Run |
| Import | **Automatic push** to `pod_leads` (same shape as CSV rows) |
| Generate email | Automatic on push (reuse `generateOutreachEmail`) |
| Send | Unchanged — POD Outreach review screen |

---

## 2. Agent placement in AgentPlatform

### Relationship to existing agents

```
┌─────────────────────────────────────────────────────────────────┐
│                     AgentPlatform                                │
│  SEO (active) │ Lead Discovery (NEW) │ POD Outreach (active)    │
│  no touch     │  find + enrich       │  generate + send         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │  automatic push (no CSV file)
                              ▼
                    pod_leads + outreach drafts
```

| Agent | Slug | Role |
|-------|------|------|
| Lead Discovery | `lead-finder` | Discover + enrich seller contacts |
| POD Outreach | `pod-outreach` | Review + send MockupExpo outreach |

**Why reuse `lead-finder` slug:** Already in `prisma/seed.ts` and `docs/ARCHITECTURE.md` roadmap. Avoid a third overlapping agent. Display name: **Lead Discovery** (product name user requested).

**Why not merge into `pod-outreach`:** Platform model treats Lead Finder and Outreach as separate modules (`master_context.md`). Discovery has different metering, jobs, and data lifecycle than send. Separation keeps boundaries clean; integration is explicit push.

---

## 3. Output contract (CSV-ready, file optional)

POD Outreach import expects rows matching `CsvLeadRow` in `src/lib/pod-outreach/csv-import.ts`:

| Field | Required | Example |
|-------|----------|---------|
| `email` | **Yes** | `seller@example.com` |
| `name` | No | `Jane Doe` |
| `shopName` | No | `CozyMugCo` |
| `shopUrl` | No | `https://cozymugco.myshopify.com` |
| `niche` | No | `mug POD` |
| `notes` | No | `source:google-cse, score:72` |

**Push rule:** Only rows with **valid email** are pushed to `pod_leads`. Shop-only discoveries stay in Lead Discovery until enrichment succeeds.

**Optional export:** Admin may download CSV for audit — not required for workflow.

---

## 4. Legal & compliance strategy (design constraint)

Automatic discovery must use **permitted data sources only**. No purchased bulk lists. No Etsy HTML scraping that violates Etsy Terms of Use.

| Platform | Discovery method | Email method | Legal posture |
|----------|------------------|--------------|---------------|
| **Shopify** | Google Custom Search (`site:myshopify.com`, niche keywords); public store URLs | Hunter.io domain search; fallback: fetch public `/contact` or `mailto:` on **store's own domain** | Public web + B2B enrichment APIs |
| **POD (DTC)** | Google CSE (`print on demand`, niche + `shop`, `.com` stores) | Hunter.io on domain; contact page parse | Same |
| **Etsy** | Google CSE (`site:etsy.com/shop` + niche) — **URLs only** | If seller links external website on Etsy profile → enrich that domain; else Hunter limited; **many shops will fail enrichment** | No Etsy login scraping; no bypass of Etsy messaging |
| **Apollo (optional Phase 2)** | Keyword search API for small ecommerce | Included in Apollo record | B2B database terms |

**Etsy expectation (honest):** Plan for **30–50% email yield** on Etsy-sourced shops vs **60–80%** on Shopify/own-domain POD stores. Failed enrichments are visible in UI — not silently dropped without trace.

**Outbound:** Pushed leads still go through POD Outreach human review before send (existing MVP behavior). CAN-SPAM footer/opt-out remains outreach responsibility.

---

## 5. Architecture

### 5.1 High-level pipeline

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌──────────────────┐
│ lead_searches│──►│ discovery    │──►│ enrichment  │──►│ push to          │
│ (config UI) │    │ worker       │    │ worker      │    │ pod_leads        │
└─────────────┘    └──────────────┘    └─────────────┘    └──────────────────┘
                          │                    │                      │
                          ▼                    ▼                      ▼
                   lead_candidates      email + metadata      POD Outreach UI
                   (shop URL, platform)  validated           (review + send)
```

### 5.2 Module layout (follows SEO / POD Outreach patterns)

```
src/
├── agents/lead-finder/
│   ├── discover.ts              # Orchestrate one discovery run
│   ├── enrich.ts                # Orchestrate enrichment for candidates
│   ├── push-to-pod-outreach.ts  # Map enriched → pod_leads + generate email
│   ├── score.ts                 # Optional ICP score (Phase 2)
│   └── sources/
│       ├── google-cse.ts        # Shopify + Etsy shop URL discovery
│       ├── shopify-contact.ts   # Public contact page / mailto parse
│       └── hunter.ts            # Hunter.io email finder adapter
├── lib/queue/
│   ├── lead-discovery.job.ts    # BullMQ: run discovery
│   └── lead-enrichment.job.ts   # BullMQ: enrich batch
├── lib/lead-finder/
│   ├── admin-guard.ts           # admin+ only (v1)
│   ├── limits.ts                # Metering hooks
│   └── normalize.ts             # URL/platform dedupe helpers
├── app/(dashboard)/dashboard/agents/lead-finder/
│   ├── page.tsx                 # Search list + run history
│   └── runs/[id]/page.tsx       # Run detail: candidates → pushed count
├── app/api/agents/lead-finder/
│   ├── searches/route.ts
│   ├── searches/[id]/run/route.ts
│   ├── runs/route.ts
│   ├── runs/[id]/route.ts
│   ├── runs/[id]/push/route.ts  # Manual re-push qualified rows
│   └── export/route.ts          # Optional CSV download
└── components/agents/lead-finder/
    ├── discovery-dashboard.tsx
    └── search-form.tsx
```

**Worker registration:** Add to `src/workers/index.ts` alongside SEO scan worker (pattern from `src/lib/queue/seo-scan.ts`).

### 5.3 Integration with POD Outreach (no manual CSV)

**Primary path — direct write:**

```typescript
// Conceptual — not implemented yet
pushEnrichedLeadToPodOutreach(userId, enrichedLead)
  → validate email + dedupe pod_leads (user_id, email)
  → generateOutreachEmail({ name, shopName, shopUrl, niche })
  → prisma.podLead.create({ ... })
  → respect MAX_LEADS (50) cap — stop push with clear error if full
```

**Shared library:** `src/lib/pod-outreach/generate-email.ts` and `CsvLeadRow` shape — Lead Discovery **imports** these; POD Outreach code stays unchanged except optional shared export of types to `src/lib/leads/types.ts` if needed.

**No `agent_data_transfers` in v1:** Table exists in design docs only, not in Prisma schema. Direct push is simpler for MockupExpo GTM. Transfers can replace direct push in Phase 3 if productized for multi-user.

### 5.4 Access control

| v1 | Rule |
|----|------|
| Who | `role >= admin` (same as POD Outreach GTM) |
| Agent status | Activate `lead-finder` in seed (`active`) |
| Dashboard visibility | Show card only to admin+ (mirror `pod-outreach` filter on `dashboard/page.tsx`) |

---

## 6. Data model

New tables — prefix `lead_` (Lead Discovery owns discovery lifecycle; `pod_leads` owns outreach lifecycle).

### 6.1 Entity relationship

```
users
  ├── lead_searches
  │       └── lead_discovery_runs
  │               └── lead_candidates
  │                       └── (on enrich success) → pod_leads
  └── pod_leads (existing)
```

### 6.2 `lead_searches`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| user_id | UUID FK | |
| name | VARCHAR | e.g. "Mug POD Shopify US" |
| platforms | TEXT[] | `shopify`, `etsy`, `pod_dtc` |
| keywords | TEXT[] | Niche terms |
| query_config | JSONB | max_results, geo hint, min/max filters |
| is_active | BOOLEAN | |
| last_run_at | TIMESTAMPTZ | |
| created_at / updated_at | TIMESTAMPTZ | |

### 6.3 `lead_discovery_runs`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| search_id | UUID FK | |
| user_id | UUID FK | |
| status | ENUM | `queued`, `running`, `completed`, `failed` |
| phase | ENUM | `discovering`, `enriching`, `pushing`, `done` |
| candidates_found | INT | |
| enriched_count | INT | |
| pushed_count | INT | |
| skipped_duplicate | INT | |
| skipped_no_email | INT | |
| error_message | TEXT | |
| started_at / completed_at | TIMESTAMPTZ | |

### 6.4 `lead_candidates`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| run_id | UUID FK | |
| user_id | UUID FK | |
| platform | ENUM | `shopify`, `etsy`, `pod_dtc`, `other` |
| external_key | VARCHAR | Dedupe: shop slug or normalized domain |
| shop_name | VARCHAR | |
| shop_url | TEXT | |
| domain | VARCHAR | For Hunter (nullable for Etsy-only) |
| niche | VARCHAR | From search keywords |
| status | ENUM | `discovered`, `enriching`, `enriched`, `push_failed`, `pushed`, `no_contact` |
| email | VARCHAR NULL | Filled after enrichment |
| owner_name | VARCHAR NULL | |
| enrichment_source | VARCHAR NULL | `hunter`, `contact_page`, `apollo` |
| enrichment_confidence | INT NULL | 0–100 |
| pod_lead_id | UUID FK NULL | Set after successful push |
| metadata | JSONB | Raw CSE snippet, listing hints |
| created_at / updated_at | TIMESTAMPTZ | |

**Unique:** `(user_id, platform, external_key)` — prevent rediscovering same shop

### 6.5 Existing `pod_leads` — no schema change required

Push creates rows compatible with current model. Optional future column `source_candidate_id` UUID FK for traceability (recommended in Phase 1 migration).

### 6.6 Agent seed update

| slug | name | status | sort_order |
|------|------|--------|------------|
| `lead-finder` | Lead Discovery | `active` | 2.5 or 6 (after pod-outreach) |

**Free tier limits JSON (metering only):**

```json
{
  "searches_max": 5,
  "discoveries_per_month": 10,
  "candidates_per_run": 50,
  "enrichments_per_month": 100,
  "auto_push_enabled": true
}
```

---

## 7. Source adapters (detailed)

### 7.1 Google Custom Search (Phase 1 — primary discovery)

**Env:** `LEAD_GOOGLE_CSE_API_KEY`, `LEAD_GOOGLE_CSE_CX`

| Query template | Platform |
|----------------|----------|
| `{keywords} site:myshopify.com` | Shopify |
| `{keywords} site:etsy.com/shop` | Etsy |
| `{keywords} "print on demand" shop` | POD DTC |

**Output per result:** `shop_url`, inferred `shop_name` from title/snippet, `platform` enum.

**Rate:** Respect CSE quota (100 free/day); cap `candidates_per_run` server-side before API calls.

### 7.2 Hunter.io (Phase 1 — primary enrichment)

**Env:** `HUNTER_API_KEY`

**Input:** `domain` extracted from Shopify/custom store URL (not `myshopify.com` subdomain when possible — use custom domain if redirect detected).

**Output:** `email`, `owner_name`, confidence score.

**Fallback order:**

1. Hunter domain search
2. Fetch store `/contact`, `/pages/contact`, homepage `mailto:` links
3. Mark `no_contact` if all fail

### 7.3 Etsy-specific enrichment (Phase 1b)

Etsy shops often lack public email.

**Allowed steps:**

1. CSE → Etsy shop URL
2. Fetch public shop page HTML (single request, rate-limited) for **linked external website only**
3. Run Hunter on external domain if present
4. If no external site → status `no_contact` (do not guess `@gmail.com`)

**Not allowed:** Automated Etsy Messages, login-required APIs, bulk Etsy scraping.

### 7.4 Apollo.io (Phase 2 — optional accelerator)

Use when Google + Hunter yield low email rates for a niche. Search: small ecommerce + POD keywords. Higher cost; better for DTC than pure Etsy.

---

## 8. User workflow (zero manual CSV)

### Journey — founder MockupExpo GTM

1. Open **http://localhost:3001/dashboard/agents/lead-finder**
2. Create search: platforms `[shopify, etsy]`, keywords `["mug", "funny cat"]`, max 50 results
3. Click **Run discovery**
4. Worker: discover → enrich → push to `pod_leads` (with outreach drafts)
5. UI shows run summary: `47 discovered → 31 enriched → 28 pushed (3 duplicates skipped)`
6. Open **POD Outreach** — leads already in review queue
7. Review → send (existing flow)

**No CSV file is created or uploaded by the user.**

---

## 9. API surface (planned)

Base: `/api/agents/lead-finder`

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/searches` | List search configs |
| POST | `/searches` | Create search |
| PATCH | `/searches/[id]` | Update |
| POST | `/searches/[id]/run` | Start discovery run (metered) |
| GET | `/runs` | Run history |
| GET | `/runs/[id]` | Run detail + candidates |
| POST | `/runs/[id]/retry-enrich` | Re-run enrichment on `no_contact` |
| GET | `/export?runId=` | Download CSV (audit only) |

All routes: `requireLeadFinderAdmin()` + entitlement checks.

---

## 10. Worker jobs

| Queue | Job | Payload | Concurrency |
|-------|-----|---------|-------------|
| `lead-discovery` | `run` | `{ runId }` | 2 |
| `lead-enrichment` | `enrich` | `{ runId, candidateIds[] }` | 5 |

**Run lifecycle:**

```
POST run
  → lead_discovery_runs.status = queued
  → enqueue lead-discovery
      → CSE adapter(s) → insert lead_candidates (discovered)
      → enqueue lead-enrichment batches
          → Hunter + contact page → update email / no_contact
          → push-to-pod-outreach for enriched rows
      → run.completed_at, stats updated
```

**Activation event:** `lead-finder.discovery.completed` (first run with ≥1 pushed lead).

---

## 11. Metering & limits

Uses existing `usage_periods` / `usage_counters` (same pattern as SEO).

| Metric key | When incremented |
|------------|------------------|
| `discoveries` | Run completes discovery phase |
| `candidates_found` | Each new candidate row (or aggregate per run) |
| `enrichments` | Each successful Hunter/contact enrichment attempt |
| `leads_pushed` | Each row written to `pod_leads` |

**Hard caps (v1 admin):**

| Cap | Value | Reason |
|-----|-------|--------|
| Candidates per run | 50 | API cost control |
| Enrichments per run | 50 | Hunter credits |
| POD leads total | 50 | Existing `MAX_LEADS` on pod-outreach |
| Runs per day | 3 | Prevent accidental API burn |

---

## 12. UI wireframes

### `/dashboard/agents/lead-finder`

- **Create search** form: name, platforms (checkboxes), keywords (tags), max results
- **Active searches** list with last run stats + **Run now** button
- **Recent runs** table: discovered / enriched / pushed / failed
- Link: **Open POD Outreach →** when `pushed_count > 0`

### Run detail page

- Progress bar by phase
- Candidate table: shop, platform, email status, push status
- Filter: pushed | no_contact | duplicate
- Optional **Export CSV** button (audit)

---

## 13. Environment variables (new)

```env
# Lead Discovery
LEAD_GOOGLE_CSE_API_KEY=
LEAD_GOOGLE_CSE_CX=
HUNTER_API_KEY=

# Optional Phase 2
# APOLLO_API_KEY=

# Existing — push target URL in generated outreach (unchanged)
# POD_MOCKUPEXPO_URL=
```

---

## 14. Implementation plan

### Phase 1 — Shopify + POD DTC auto pipeline (Week 1)

**Goal:** First automatic leads in POD Outreach without CSV.

| # | Task | Deliverable |
|---|------|-------------|
| 1.1 | Prisma migration: `lead_searches`, `lead_discovery_runs`, `lead_candidates` | Schema |
| 1.2 | Activate `lead-finder` in seed; admin-only dashboard shell | UI stub |
| 1.3 | Google CSE adapter (Shopify + POD queries) | URLs in DB |
| 1.4 | Hunter adapter + contact-page fallback | Emails on candidates |
| 1.5 | `push-to-pod-outreach.ts` + `generateOutreachEmail` reuse | Rows in `pod_leads` |
| 1.6 | BullMQ discovery + enrichment workers | End-to-end run |
| 1.7 | Search form + Run button + run summary UI | Zero CSV workflow |
| 1.8 | Metering + rate limits | Cost control |

**Exit criteria:** Admin runs search → ≥10 Shopify leads appear in POD Outreach review queue with emails and draft copy.

**Estimated effort:** 4–5 dev days (1 developer).

---

### Phase 2 — Etsy discovery + enrichment heuristics (Week 2)

| # | Task | Deliverable |
|---|------|-------------|
| 2.1 | Etsy CSE query templates | Etsy shop URLs |
| 2.2 | External website extraction from public Etsy shop page | Domain for Hunter |
| 2.3 | UI: show `no_contact` rate per run; retry enrich button | Transparency |
| 2.4 | ICP scoring (optional) — deprioritize low-quality shops | `score.ts` |

**Exit criteria:** Mixed Shopify + Etsy run pushes all **email-found** leads automatically; `no_contact` rows visible but not pushed.

**Estimated effort:** 3–4 dev days.

---

### Phase 3 — Polish & optional accelerators (Week 3)

| # | Task | Deliverable |
|---|------|-------------|
| 3.1 | CSV export endpoint (audit/download only) | Optional file |
| 3.2 | Apollo adapter (if Hunter yield too low) | Higher email rate |
| 3.3 | Scheduled re-runs (cron) | Weekly niche prospecting |
| 3.4 | `source_candidate_id` on `pod_leads` | Traceability |
| 3.5 | Run diff: skip already-seen `external_key` across runs | Dedupe |

**Estimated effort:** 3–4 dev days.

---

### Total estimate

| Scope | Calendar time |
|-------|---------------|
| Phase 1 only (usable for MockupExpo) | ~1 week |
| Phase 1 + 2 (Shopify + Etsy) | ~2 weeks |
| Full Phase 1–3 | ~3 weeks |

---

## 15. Risks & mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Etsy emails rarely found | Low push volume from Etsy runs | Set expectations in UI; prioritize Shopify in default searches |
| Hunter API cost | Budget overrun | Hard caps per run; cache domain lookups 30 days |
| Google CSE quota | Runs fail mid-day | Queue remaining; show quota in UI |
| `pod_leads` 50 cap full | Push stops silently | Return clear error: "POD Outreach full — delete or send existing leads" |
| Platform ToS | Legal exposure | CSE + public pages + Hunter only; document disallowed methods |
| Duplicate outreach | Seller annoyance | Dedupe `(user_id, email)` on push; skip with count in run summary |

---

## 16. Success metrics

| Metric | Phase 1 target |
|--------|----------------|
| Time from "Run" to leads in POD Outreach | < 5 minutes for 50 candidates |
| Email yield (Shopify runs) | ≥ 50% of candidates pushed |
| Manual steps required | **0** (no CSV, no copy-paste) |
| Founder can send outreach same day | Yes, if SMTP configured |

---

## 17. Explicit non-goals (this agent)

- Etsy Message automation
- Instagram/TikTok scraping
- Purchased lead list import
- Billing / referrals / points integration
- SEO Agent changes
- Replacing POD Outreach send/review UI
- Public multi-tenant access (v1 admin-only GTM)

---

## 18. Document maintenance

- Update when Phase 1 starts implementation (`docs/changelog.md`)
- Sync schema details to `docs/DATABASE.md` §19 when migrated
- Revisit `docs/REVENUE_GAP_ANALYSIS.md` after first automated push to mark gap closed

---

## 19. Recommendation before coding

**Build Phase 1 first (Shopify + POD DTC only).** Evidence from `REVENUE_GAP_ANALYSIS.md` and prior research: Shopify/own-domain stores have the best email yield in the shortest build time. Etsy adds Phase 2 complexity with lower email success. Phase 1 alone unblocks the stated goal: **no manual CSV, automatic leads in POD Outreach.**
