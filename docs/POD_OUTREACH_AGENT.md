# POD Lead Finder + Auto Outreach Agent (MockupExpo GTM)

**Version:** 1.0  
**Status:** Planning — no code yet  
**Goal:** Acquire MockupExpo paying customers as fast as possible  
**Agent slug:** `pod-outreach`  
**Source of truth:** `master_context.md`, `ARCHITECTURE.md`, `DATABASE.md`

---

## 0. Executive summary

This agent is a **MockupExpo-specific growth module** that combines lead discovery and automated outreach into one end-to-end workflow. It targets **Print-on-Demand (POD) sellers** — the highest-intent audience for MockupExpo — and moves them through a pipeline from discovery → qualification → personalized outreach → reply tracking → conversion signal.

It is **not** the generic Lead Finder or Outreach agents (those remain `coming_soon` stubs). It is a vertical, combined agent purpose-built for MockupExpo customer acquisition.

### Hard constraints (from request)

| Area | Rule |
|------|------|
| SEO Agent | **Do not modify** |
| Billing / subscriptions | **Do not modify** — use existing entitlement hooks only |
| Referrals / points | **Do not modify** |
| This phase | Architecture, workflow, data model, implementation plan only — **no code** |

### Success metrics (90-day targets)

| Metric | Target | Why |
|--------|--------|-----|
| Qualified leads discovered / week | 200+ | Pipeline volume |
| Outreach emails sent / week | 50–100 (ramped) | Controlled, compliant volume |
| Reply rate | ≥ 8% | Message-market fit |
| Trial/signup from outreach | ≥ 30/month | Top-of-funnel |
| Paid conversion from outreach cohort | ≥ 10/month | Revenue goal |
| Cost per acquired paying customer | < $50 infra + tooling | Profit-first rule |

---

## 1. Problem and ICP

### Problem

MockupExpo needs paying customers quickly. POD sellers constantly need product mockups for listings (Etsy, Shopify, Amazon, etc.) but often use slow manual workflows or generic tools. They are identifiable at scale and reachable via email.

### Ideal Customer Profile (ICP)

| Attribute | Criteria |
|-----------|----------|
| Business type | Print-on-Demand seller or POD-focused brand |
| Platforms | Etsy, Shopify, Amazon Merch/KDP, Redbubble, Printful/Printify-connected stores |
| Signals | Active listings, new shop (< 2 years), low mockup quality, high SKU count, seasonal niches |
| Geography (v1) | US, UK, CA, AU — English outreach |
| Disqualifiers | No contact email, explicit no-solicitation, adult/gambling niches (per founder Q6 default) |

### Value proposition (outreach angle)

MockupExpo helps POD sellers create professional product mockups faster → better listings → more sales. Outreach should lead with a **specific pain point** (e.g., "your mug listing uses a flat PNG — here's what a lifestyle mockup could look like") rather than generic SaaS pitch.

---

## 2. Architecture

### 2.1 Position in AgentPlatform

```
┌─────────────────────────────────────────────────────────────────────┐
│                     AgentPlatform (unchanged shell)                  │
│  Auth │ Dashboard │ Metering │ Agent Registry │ Worker │ Events     │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
   ┌────▼────┐            ┌─────▼─────┐          ┌─────▼──────┐
   │   SEO   │            │ pod-outreach│         │ lead-finder│
   │ (active)│            │  (NEW)      │         │ (stub)     │
   │ NO TOUCH│            │  MockupExpo │         │ outreach   │
   └─────────┘            │  GTM only   │         │ (stubs)    │
                          └──────┬──────┘          └────────────┘
                                 │
                    ┌────────────┼────────────┐
                    │            │            │
              Lead Sources   Enrichment   Email Send
              (scrapers/APIs) (email find) (Resend/etc.)
```

### 2.2 Module layout (follows SEO agent pattern)

```
src/
├── agents/pod-outreach/
│   ├── index.ts                    # Module metadata export
│   ├── discover-leads.ts           # Discovery orchestration
│   ├── enrich-lead.ts              # Email + metadata enrichment
│   ├── score-lead.ts               # ICP scoring
│   ├── generate-message.ts         # AI/template message generation
│   ├── send-outreach.ts            # Email dispatch + tracking
│   ├── handle-reply.ts             # Inbound reply processing (webhook)
│   ├── sources/                    # Per-source adapters
│   │   ├── etsy.ts
│   │   ├── shopify.ts
│   │   └── google-search.ts
│   └── templates/                  # Outreach templates by niche
├── lib/queue/
│   ├── pod-discovery.job.ts        # BullMQ: run discovery search
│   ├── pod-enrichment.job.ts       # BullMQ: enrich lead batch
│   └── pod-outreach.job.ts         # BullMQ: send approved messages
├── lib/metering/
│   └── pod-outreach-limits.ts      # Free-tier limit helpers
├── app/(dashboard)/dashboard/agents/pod-outreach/
│   ├── page.tsx                    # Pipeline overview
│   ├── searches/page.tsx           # Search configs
│   ├── leads/page.tsx              # Lead inbox + review queue
│   ├── campaigns/page.tsx          # Outreach campaigns
│   └── leads/[id]/page.tsx         # Lead detail + timeline
├── app/api/agents/pod-outreach/
│   ├── searches/route.ts
│   ├── leads/route.ts
│   ├── campaigns/route.ts
│   ├── outreach/route.ts           # Approve + send
│   └── webhooks/inbound/route.ts   # Reply tracking (Resend inbound)
└── components/agents/pod-outreach/
    ├── lead-table.tsx
    ├── lead-score-badge.tsx
    ├── review-queue.tsx
    ├── campaign-stats.tsx
    └── outreach-preview.tsx
```

### 2.3 External dependencies (agent-owned, not platform billing)

| Service | Purpose | Phase |
|---------|---------|-------|
| **Resend** (existing platform email) | Transactional + outreach send, inbound parse | MVP |
| **Hunter.io / Apollo / Snov.io** (one chosen) | Email discovery | MVP |
| **Google Custom Search API** | Shopify/Etsy store discovery | MVP |
| **OpenAI / Anthropic API** | Personalized message generation | MVP |
| **Clearbit / optional** | Company enrichment | Later |
| **Stripe metadata tag** (read-only) | Attribute signup to outreach lead | Later |

No changes to Stripe/PayPal checkout or subscription tables. Conversion attribution uses UTM params + optional read of existing `users.referred_by` pattern in a **new** `pod_lead_conversions` table.

### 2.4 Access model (v1)

| Mode | Who | Rationale |
|------|-----|-----------|
| **Admin/founder only** | `role >= admin` | GTM tool; avoids CAN-SPAM liability on free-tier users |
| **Future: Pro tier** | Paying `pod-outreach` subscribers | When productized for MockupExpo customers who want their own lead gen |

v1 ships **admin-only** to move fast on MockupExpo revenue without opening cold-email tooling to all free users (abuse + cost risk).

### 2.5 Design principles

1. **Human-in-the-loop by default** — auto-generate and queue; founder approves first N campaigns/day until templates prove out.
2. **Compliance-first** — unsubscribe link, physical address, opt-out ledger, rate limits, no purchased lists.
3. **Separate agent data** — all tables prefixed `pod_`; no cross-import from SEO; no `agent_data_transfers` in v1.
4. **Profit-first metering** — cap discovery and sends server-side before expensive API calls.
5. **Idempotent jobs** — same lead never emailed twice; same shop never duplicated in pipeline.

---

## 3. Workflow

### 3.1 Pipeline stages

```
┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│  CONFIG  │──►│ DISCOVER │──►│  ENRICH  │──►│  SCORE   │──►│  REVIEW  │──►│  OUTREACH│
│  Search  │   │  Leads   │   │  Contact │   │  & Rank  │   │  Queue   │   │  Send    │
└──────────┘   └──────────┘   └──────────┘   └──────────┘   └──────────┘   └────┬─────┘
                                                                                  │
                     ┌──────────┐   ┌──────────┐   ┌──────────┐                  │
                     │ CONVERT  │◄──│  REPLY   │◄──│  TRACK   │◄─────────────────┘
                     │ (signup) │   │  Handle  │   │  Opens   │
                     └──────────┘   └──────────┘   └──────────┘
```

### 3.2 Stage detail

#### Stage 1 — Configure search (`pod_searches`)

User (admin) defines a **lead search**:

- Source: Etsy shops | Shopify stores | Google query
- Keywords/niche: e.g., `"funny cat mug"`, `"nurse life shirt"`
- Filters: min listings, max shop age, geography
- Max results per run (bounded by tier limit)

**Trigger:** Manual "Run now" or scheduled cron (Pro later).

**Output:** `pod_discovery_runs` record + queued discovery job.

#### Stage 2 — Discover leads

Worker executes source adapter:

1. Fetch candidate shops/stores from source API or search
2. Normalize to canonical lead shape (shop URL, name, platform, niche tags)
3. Dedupe against existing `pod_leads` by `(platform, external_id)` unique key
4. Insert leads with status `discovered`
5. Queue enrichment job for new leads

**Activation event:** `pod.discovery.completed` (first successful discovery run).

#### Stage 3 — Enrich contact

For each `discovered` lead:

1. Fetch shop about page / contact page / social links
2. Run email finder API (shop owner email preferred)
3. Extract metadata: listing count, avg price, mockup quality score (image analysis heuristic)
4. Update lead → status `enriched` or `enrichment_failed`

#### Stage 4 — Score and rank

Scoring model (0–100):

| Factor | Weight | Signal |
|--------|--------|--------|
| Platform fit | 20 | Etsy/Shopify = high |
| Listing volume | 20 | 10–500 sweet spot |
| Mockup quality gap | 25 | Low quality = high opportunity |
| Contact found | 20 | Valid email |
| Recency | 15 | Active shop (recent listings) |

Leads ≥ threshold (default 60) → status `qualified`.  
Leads below → status `archived` (retained for analytics).

#### Stage 5 — Review queue (human gate)

**Auto-outreach modes:**

| Mode | Behavior |
|------|----------|
| `manual` (v1 default) | All qualified leads sit in review queue until admin approves |
| `auto_high_score` (v1.1) | Score ≥ 85 auto-approved up to daily send cap |
| `full_auto` (later) | Template-proven niches only; still respects global caps |

Admin sees:

- Lead profile (shop link, sample listing thumbnails, score breakdown)
- Generated email preview (subject + body)
- Approve | Edit | Skip | Blacklist

#### Stage 6 — Outreach send

On approve:

1. Create `pod_outreach_messages` row (status `queued`)
2. Enqueue send job
3. Worker sends via Resend with:
   - Unique tracking pixel / link (UTM: `utm_source=pod-outreach&utm_campaign={campaign_id}&utm_lead={lead_id}`)
   - List-Unsubscribe header + footer
   - Reply-To: tracked inbound address
4. Update message → `sent`; lead → `contacted`
5. Increment usage counter `outreach_sent`

**Follow-up sequence (v1.1):**

- Day 3: soft bump (if no reply)
- Day 7: value-add bump (mockup tip)
- Max 2 follow-ups; auto-stop on reply or unsubscribe

#### Stage 7 — Track and reply

- **Opens/clicks:** Resend webhooks → `pod_outreach_events`
- **Replies:** Inbound webhook parses reply → links to lead → status `replied`
- **Unsubscribe:** One-click → `pod_suppressions` → never contact again

#### Stage 8 — Conversion attribution

When a new user registers with UTM matching a lead:

1. Match `utm_lead` or email hash to `pod_leads`
2. Insert `pod_lead_conversions` (signup)
3. On first paid Mockup Agent subscription (read-only webhook listener or nightly job) → mark `converted_paid`

No modification to billing flow — attribution is observational.

### 3.3 User journeys

#### Journey A — Founder daily GTM (v1 primary)

1. Login → `/dashboard/agents/pod-outreach`
2. Create search: "Etsy mug shops, US, 20+ listings"
3. Run discovery → 47 new leads after dedupe
4. Review queue: approve 15, skip 30, blacklist 2
5. 15 emails sent over 2 hours (rate-limited)
6. Next day: 3 opens, 1 reply → mark interested, send manual Calendly link
7. Weekly dashboard: reply rate, signups, paid conversions

#### Journey B — Scheduled discovery (v1.1)

1. Search config on weekly cron
2. New qualified leads appear in queue each Monday
3. Founder batch-approves in 10 minutes

---

## 4. Data model

All new tables are agent-scoped. No changes to SEO, billing, referral, or points tables.

### 4.1 Entity relationship

```
users
  │
  ├── pod_searches
  │       └── pod_discovery_runs
  │               └── (creates) pod_leads
  │
  ├── pod_leads
  │       ├── pod_lead_scores
  │       ├── pod_outreach_messages
  │       │       └── pod_outreach_events
  │       └── pod_lead_conversions
  │
  ├── pod_campaigns
  │       └── pod_outreach_messages (campaign_id)
  │
  └── pod_suppressions (global opt-out list)

agents (catalog)
  └── agent_plans (free limits for pod-outreach — seed only, no billing code)
```

### 4.2 Table definitions

#### `pod_searches`

Lead discovery configuration.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| user_id | UUID FK → users | Owner |
| name | VARCHAR(255) | e.g. "Etsy mugs US" |
| source | ENUM | `etsy`, `shopify`, `google` |
| query_config | JSONB | Keywords, filters, geo — source-specific schema |
| schedule_cron | VARCHAR(50) NULL | NULL = manual only |
| is_active | BOOLEAN | Default true |
| last_run_at | TIMESTAMPTZ NULL | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**Index:** `(user_id, is_active)`

#### `pod_discovery_runs`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| search_id | UUID FK → pod_searches | |
| user_id | UUID FK | |
| status | ENUM | `queued`, `running`, `completed`, `failed` |
| leads_found | INT | Default 0 |
| leads_new | INT | After dedupe |
| error_message | TEXT NULL | |
| started_at | TIMESTAMPTZ NULL | |
| completed_at | TIMESTAMPTZ NULL | |
| created_at | TIMESTAMPTZ | |

#### `pod_leads`

Canonical lead record.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| user_id | UUID FK | Pipeline owner |
| discovery_run_id | UUID FK NULL | |
| platform | ENUM | `etsy`, `shopify`, `amazon`, `other` |
| external_id | VARCHAR(255) | Platform shop ID |
| shop_name | VARCHAR(255) | |
| shop_url | TEXT | |
| owner_name | VARCHAR(255) NULL | |
| email | VARCHAR(255) NULL | |
| email_verified | BOOLEAN | From finder API |
| niche_tags | TEXT[] | e.g. `{mugs, cats, pod}` |
| listing_count | INT NULL | |
| mockup_quality_score | INT NULL | 0–100 (higher = worse mockups = opportunity) |
| icp_score | INT NULL | 0–100 composite |
| status | ENUM | See lifecycle below |
| metadata | JSONB | Sample listing URLs, social links, raw source payload |
| first_contacted_at | TIMESTAMPTZ NULL | |
| last_contacted_at | TIMESTAMPTZ NULL | |
| replied_at | TIMESTAMPTZ NULL | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**Unique:** `(user_id, platform, external_id)`  
**Index:** `(user_id, status)`, `(user_id, icp_score DESC)`

**Status lifecycle:**

```
discovered → enriched → qualified → approved → contacted → opened → replied → converted
                ↓           ↓          ↓
         enrichment_failed  archived   skipped
                                    ↓
                              unsubscribed / blacklisted
```

#### `pod_lead_scores`

Score audit trail (optional but useful for tuning).

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| lead_id | UUID FK | |
| factors | JSONB | `{ platform_fit: 18, listing_volume: 15, ... }` |
| total_score | INT | |
| scored_at | TIMESTAMPTZ | |

#### `pod_campaigns`

Groups outreach under a message template / experiment.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| user_id | UUID FK | |
| name | VARCHAR(255) | e.g. "Mug sellers — mockup gap angle" |
| template_subject | TEXT | With `{{variables}}` |
| template_body | TEXT | |
| outreach_mode | ENUM | `manual`, `auto_high_score`, `full_auto` |
| daily_send_cap | INT | Default 25 |
| is_active | BOOLEAN | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

#### `pod_outreach_messages`

Individual email instances.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| lead_id | UUID FK | |
| campaign_id | UUID FK NULL | |
| user_id | UUID FK | |
| sequence_step | INT | 0 = initial, 1 = follow-up 1, … |
| subject | TEXT | Rendered |
| body_html | TEXT | Rendered |
| body_text | TEXT | Plain-text fallback |
| status | ENUM | `draft`, `queued`, `sent`, `delivered`, `bounced`, `failed` |
| provider_message_id | VARCHAR NULL | Resend ID |
| sent_at | TIMESTAMPTZ NULL | |
| error_message | TEXT NULL | |
| created_at | TIMESTAMPTZ | |

**Unique partial:** one `sent` message per `(lead_id, sequence_step)` — prevent duplicate sends

#### `pod_outreach_events`

Tracking events from provider webhooks.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| message_id | UUID FK | |
| event_type | ENUM | `delivered`, `opened`, `clicked`, `bounced`, `complained`, `replied` |
| metadata | JSONB | URL clicked, bounce reason, etc. |
| occurred_at | TIMESTAMPTZ | |

#### `pod_suppressions`

Global do-not-contact list (compliance).

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| email | VARCHAR(255) UNIQUE | Normalized lowercase |
| reason | ENUM | `unsubscribe`, `bounce`, `complaint`, `manual` |
| source_lead_id | UUID FK NULL | |
| created_at | TIMESTAMPTZ | |

#### `pod_lead_conversions`

Attribution (read-only relative to billing).

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| lead_id | UUID FK | |
| converted_user_id | UUID FK NULL → users | When they sign up |
| conversion_type | ENUM | `signup`, `trial`, `paid` |
| attributed_at | TIMESTAMPTZ | |
| metadata | JSONB | UTM snapshot |

### 4.3 Agent catalog seed (no billing code)

Add to `agents` seed:

| slug | name | status (v1) | sort_order |
|------|------|-------------|------------|
| `pod-outreach` | POD Lead Finder + Outreach | `active` (admin-only gate in UI) | 5 |

**Free tier limits JSON** (metering only — no Stripe product yet):

```json
{
  "searches_max": 3,
  "discoveries_per_month": 5,
  "leads_per_discovery": 50,
  "enrichments_per_month": 100,
  "outreach_sent_per_month": 50,
  "follow_ups_enabled": false
}
```

**Pro tier placeholder** (defined in seed for future; billing integration out of scope):

```json
{
  "searches_max": 25,
  "discoveries_per_month": 50,
  "leads_per_discovery": 200,
  "enrichments_per_month": 1000,
  "outreach_sent_per_month": 500,
  "follow_ups_enabled": true,
  "auto_outreach_mode": true
}
```

### 4.4 Usage metrics (existing `usage_counters`)

| Metric key | Increment when |
|------------|----------------|
| `discoveries` | Discovery run completes |
| `leads_enriched` | Enrichment succeeds |
| `outreach_sent` | Email sent |

Uses existing `usage_periods` + `usage_counters` pattern from SEO — **no schema change** to metering tables.

### 4.5 Activation event

| Event | Trigger |
|-------|---------|
| `pod.discovery.completed` | First discovery run completes with ≥ 1 new lead |

Hooks into existing `recordAgentActivation()` — **no changes** to activation service.

---

## 5. API surface (planned)

Base path: `/api/agents/pod-outreach`

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/searches` | List search configs |
| POST | `/searches` | Create search |
| PATCH | `/searches/[id]` | Update search |
| POST | `/searches/[id]/run` | Trigger discovery (metered) |
| GET | `/discovery-runs` | Run history |
| GET | `/leads` | List/filter leads |
| GET | `/leads/[id]` | Lead detail + timeline |
| PATCH | `/leads/[id]` | Update status (approve/skip/blacklist) |
| POST | `/leads/[id]/generate-message` | AI generate preview |
| GET | `/campaigns` | List campaigns |
| POST | `/campaigns` | Create campaign |
| POST | `/outreach/send` | Approve + queue send(s) |
| GET | `/stats` | Funnel metrics |
| POST | `/webhooks/inbound` | Resend inbound (replies) |
| POST | `/webhooks/events` | Resend delivery/open/click |

All routes: auth required + `role >= admin` in v1 + entitlement check via existing metering helpers.

---

## 6. Worker jobs

| Queue | Job | Payload | Concurrency |
|-------|-----|---------|-------------|
| `pod-discovery` | `run` | `{ discoveryRunId }` | 2 |
| `pod-enrichment` | `enrich` | `{ leadId }` or `{ leadIds[] }` | 5 |
| `pod-outreach` | `send` | `{ messageId }` | 1 (rate limit) |

Register in `src/workers/index.ts` alongside SEO worker — **additive only**.

### Rate limits (worker-enforced)

| Limit | Value |
|-------|-------|
| Emails per hour | 20 |
| Emails per domain per day | 50 |
| Discovery API calls per minute | 10 |
| Enrichment API calls per minute | 15 |

---

## 7. Compliance and risk

| Requirement | Implementation |
|-------------|----------------|
| CAN-SPAM | Physical address in footer, clear sender identity, unsubscribe |
| GDPR (EU leads) | Legitimate interest assessment; easy opt-out; minimal data retention |
| No purchased lists | Source only from public shop/listing data |
| Suppression list | Check `pod_suppressions` before every send |
| Content moderation | Admin reviews all messages in v1 |
| Platform ToS | Respect Etsy/Shopify scraping limits; prefer official APIs where available |
| Bounce handling | Hard bounce → suppress + mark lead |
| Complaint handling | Auto-suppress on spam complaint webhook |

**Data retention:** `pod_leads` + messages 18 months; suppressions indefinite.

---

## 8. UI wireframe (dashboard)

### `/dashboard/agents/pod-outreach` — Overview

- Funnel cards: Discovered → Qualified → Contacted → Replied → Converted
- Usage meters (discoveries, enrichments, sends remaining)
- Quick actions: New search, Review queue (badge count)
- Recent activity feed

### `/dashboard/agents/pod-outreach/leads` — Lead inbox

- Tabs: Review queue | Contacted | Replied | Archived
- Sort by score, date, platform
- Bulk approve/skip
- Lead row: shop name, platform icon, score, email status, actions

### `/dashboard/agents/pod-outreach/leads/[id]` — Lead detail

- Shop preview (link + thumbnail grid)
- Score breakdown
- Message preview + edit + approve send
- Event timeline (sent, opened, clicked, replied)

### `/dashboard/agents/pod-outreach/searches` — Search management

- CRUD search configs
- Run history with lead counts

---

## 9. Implementation plan

### Phase A — Foundation (Week 1)

**Goal:** Agent shell visible; empty pipeline; metering wired.

| Task | Details |
|------|---------|
| A1 | Add `pod-outreach` to agent seed + `agent_plans` free limits |
| A2 | Prisma migration: all `pod_*` tables |
| A3 | Admin-only route guard middleware/helper |
| A4 | Dashboard stub pages (overview, empty states) |
| A5 | `pod-outreach-limits.ts` metering helpers (mirror SEO pattern) |
| A6 | API routes skeleton with auth + limit checks |

**Exit:** Admin sees agent card; can create a search config; no discovery yet.

### Phase B — Discovery (Week 2)

**Goal:** Find POD shops and store leads.

| Task | Details |
|------|---------|
| B1 | `pod-discovery` BullMQ queue + worker registration |
| B2 | Google Custom Search adapter (Shopify/Etsy store queries) |
| B3 | Etsy public data adapter (API or structured scrape — legal review) |
| B4 | Lead normalization + dedupe |
| B5 | Discovery run UI + status polling |
| B6 | Activation on first completed discovery |

**Exit:** Run search → leads appear in inbox with status `discovered`.

### Phase C — Enrichment + scoring (Week 3)

**Goal:** Emails found; leads ranked.

| Task | Details |
|------|---------|
| C1 | `pod-enrichment` queue |
| C2 | Email finder integration (Hunter.io or equivalent) |
| C3 | Mockup quality heuristic (listing image analysis) |
| C4 | Scoring engine + `pod_lead_scores` |
| C5 | Auto-transition to `qualified` / `archived` |
| C6 | Lead inbox filters + score badges |

**Exit:** Qualified leads sorted in review queue with emails.

### Phase D — Outreach (Week 4)

**Goal:** Send compliant cold emails.

| Task | Details |
|------|---------|
| D1 | Campaign + template CRUD |
| D2 | Message generation (template + optional AI personalization) |
| D3 | Review queue approve flow |
| D4 | `pod-outreach` send queue with rate limiting |
| D5 | Resend send integration |
| D6 | Suppression list checks |
| D7 | `pod_outreach_events` webhook handler (opens/clicks/bounces) |

**Exit:** Founder can approve and send 50 emails/month; events tracked.

### Phase E — Reply + attribution (Week 5)

**Goal:** Close the loop to revenue.

| Task | Details |
|------|---------|
| E1 | Resend inbound webhook → reply detection |
| E2 | Lead timeline UI |
| E3 | UTM link generation in emails |
| E4 | Signup attribution job (match UTM/email to lead) |
| E5 | Stats dashboard (reply rate, conversion funnel) |
| E6 | Export leads CSV |

**Exit:** Full pipeline measurable; founder knows which outreach drives signups.

### Phase F — Optimize (Week 6+)

| Task | Details |
|------|---------|
| F1 | Follow-up sequences |
| F2 | Auto-approve high-score leads (configurable) |
| F3 | A/B test campaign variants |
| F4 | Shopify-specific adapter improvements |
| F5 | Paid tier limits in seed (still no billing code until Phase 3 platform billing ships) |

---

## 10. Dependencies and blockers

### Depends on (existing — no changes needed)

- Phase 1 auth + admin RBAC ✅
- Agent registry + dashboard shell ✅
- Usage metering infrastructure ✅
- BullMQ worker pattern (SEO) ✅
- Resend email config (platform) ✅

### New env vars (agent-scoped)

```
POD_OUTREACH_ENABLED=true
POD_GOOGLE_CSE_API_KEY=
POD_GOOGLE_CSE_CX=
POD_EMAIL_FINDER_API_KEY=
POD_OUTREACH_FROM_EMAIL=outreach@mockupexpo.com
POD_OUTREACH_FROM_NAME=MockupExpo
POD_OUTREACH_REPLY_DOMAIN=replies.mockupexpo.com
POD_OUTREACH_PHYSICAL_ADDRESS=...   # CAN-SPAM
OPENAI_API_KEY=                     # message personalization
```

### Founder decisions needed before coding

| # | Question | v1 default if deferred |
|---|----------|------------------------|
| 1 | Admin-only vs all users? | Admin-only |
| 2 | Primary discovery source first? | Google CSE + Etsy |
| 3 | Email finder vendor? | Hunter.io |
| 4 | MockupExpo landing URL for UTMs? | `https://mockupexpo.com/?utm_...` |
| 5 | Sending domain warmed up? | Use subdomain `outreach.mockupexpo.com` |
| 6 | AI message generation on or templates only? | Templates v1; AI v1.1 |
| 7 | Legal review of cold email to shop owners? | Required before Phase D |

---

## 11. Testing strategy

| Layer | Tests |
|-------|-------|
| Unit | Scoring engine, dedupe, template rendering, suppression checks |
| Integration | Discovery job → leads created; send job → Resend mock; webhook → events |
| E2E | Admin creates search → approves lead → send queued (staging, mocked provider) |
| Compliance | Unsubscribe flow; bounce → suppress; duplicate send blocked |

---

## 12. What this document does NOT cover

- SEO Agent changes
- Billing / Stripe / PayPal integration for `pod-outreach` Pro
- Referrals / points modifications
- Generic Lead Finder or Outreach agent implementation
- Mockup Agent product features

---

## 13. Document maintenance

- Update this file when founder answers blockers in §10
- Record implementation progress in `docs/changelog.md` per phase
- Add Prisma details to `docs/DATABASE.md` §19 when schema is finalized
- Add roadmap entry to `docs/ROADMAP.md` Phase 5F when approved
