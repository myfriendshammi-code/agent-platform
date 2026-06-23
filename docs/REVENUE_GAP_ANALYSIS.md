# Goal vs Reality — MockupExpo Revenue Gap Analysis

**Date:** 2025-06-21  
**Status:** Review only — no code changes  
**Evidence sources:** `docs/POD_OUTREACH_AGENT.md`, `docs/changelog.md` (v0.4.0, v0.4.1), `src/lib/pod-outreach/*`, `src/components/agents/pod-outreach/*`, `prisma/schema.prisma`

---

## 1. Original business goal

**Generate MockupExpo paying customers as fast as possible.**

Target audience: Print-on-Demand (POD) sellers on Etsy, Shopify, and similar platforms who need product mockups for listings.

Success was defined in planning (`POD_OUTREACH_AGENT.md`) as a full pipeline:

```
Discover → Enrich → Score → Review → Send → Track replies → Convert to paid
```

---

## 2. What you believed POD Outreach would do

| # | Expected capability | Planned in `POD_OUTREACH_AGENT.md`? |
|---|---------------------|-------------------------------------|
| 1 | Automatically find POD/Etsy/Shopify sellers | Yes — `discover-leads.ts`, `sources/etsy.ts`, `shopify.ts`, `google-search.ts` |
| 2 | Collect leads automatically | Yes — `pod_searches`, `pod_discovery_runs`, BullMQ `pod-discovery` job |
| 3 | Enrich leads automatically | Yes — `enrich-lead.ts`, email finder API, BullMQ `pod-enrichment` job |
| 4 | Generate outreach | Yes | 
| 5 | Send outreach | Yes |

---

## 3. What is actually built (evidence)

Shipped in **v0.4.0** per `docs/changelog.md`:

| Capability | Built? | Evidence |
|------------|--------|----------|
| CSV import (max 50 leads) | **Yes** | `src/lib/pod-outreach/csv-import.ts`, UI “Import leads (CSV)” |
| Store leads | **Yes** | `pod_leads` table, `prisma/schema.prisma` |
| Generate outreach email | **Yes** | `src/lib/pod-outreach/generate-email.ts` — **template-based**, uses `name`, `shopName`, `shopUrl`, `niche` |
| Review screen | **Yes** | `src/components/agents/pod-outreach/pod-outreach-dashboard.tsx` |
| Send outreach | **Yes** | SMTP via `nodemailer` or “Copy for Gmail”; **20 emails/day cap** |
| Status tracking | **Yes** | `draft`, `sent`, `replied`, `interested` on `PodLead` |
| Admin-only access | **Yes** | `requirePodOutreachAdmin()`, dashboard filter |

Explicitly **not built** (same changelog entry):

> discovery scrapers, email finder, billing, referrals, points

**Files that do NOT exist** (planned in `POD_OUTREACH_AGENT.md` but never created):

- `discover-leads.ts`, `enrich-lead.ts`, `score-lead.ts`
- `sources/etsy.ts`, `sources/shopify.ts`, `sources/google-search.ts`
- `pod_searches`, `pod_discovery_runs` tables
- UI routes: `/searches`, `/campaigns`, lead detail timeline
- Reply webhooks, conversion attribution to MockupExpo signup/paid

**Why the gap exists:** The 24-hour MVP scope deliberately cut discovery and enrichment to ship outreach tooling first. The planning doc (`POD_OUTREACH_AGENT.md`) describes a **future** system; the shipped product is **manual lead input + automated email + send**.

---

## 4. What is missing (gap map)

### A. Lead acquisition (largest gap)

| Missing | Impact on revenue |
|---------|-----------------|
| Automatic Etsy/Shopify seller search | You must find leads yourself before the tool helps |
| Automatic lead collection | No pipeline volume without manual CSV work |
| Automatic email enrichment | CSV must already include `email` column |

**Automatic lead discovery is NOT implemented yet. Only CSV import is implemented.**

### B. Outreach quality / scale (secondary gap)

| Missing | Impact |
|---------|--------|
| AI-personalized copy (uses fixed template) | Lower reply rates vs shop-specific hooks |
| Follow-up sequences | No automated Day 3 / Day 7 bumps |
| Inbound reply detection | Status `replied` is **manual** only |
| Conversion tracking (signup → paid) | No link from outreach to MockupExpo revenue in-app |

### C. MockupExpo product & payment (outside AgentPlatform)

| Missing | Impact |
|---------|--------|
| MockupExpo checkout / billing in this repo | AgentPlatform links to `https://mockupexpo.com?utm_source=pod-outreach` but **does not process MockupExpo payments** |
| Mockup Agent (`mockup` slug) | Still `coming_soon` in seed — product not live here |
| AgentPlatform billing (Phase 3) | Not built — irrelevant to MockupExpo customer revenue today |

**Evidence:** `generate-email.ts` defaults to external URL; no Stripe/PayPal checkout for MockupExpo exists in codebase.

### D. Operational prerequisites (not code, but block revenue)

- SMTP / Gmail app password configured (`POD_SMTP_*` in `.env.example`) — without this, sends log to console only
- `mockupexpo.com` must convert visitors to **paying** customers on its own
- Cold email compliance (CAN-SPAM, opt-out) — not enforced in MVP beyond manual review

---

## 5. Fastest path to first paying MockupExpo customer

**Critical path today (no new code):**

```
Manual lead list → CSV import → Review → Send 20/day → Reply → Close on MockupExpo site
         ↑                              ↑
    YOU do this              Tool already does this
```

**Fastest realistic timeline:**

| Step | Who | Time |
|------|-----|------|
| Build CSV of 20–50 POD sellers with emails | Founder (Etsy search, store About pages, Apollo/Hunter free tier, niche communities) | 2–4 hours |
| Import + send via `/dashboard/agents/pod-outreach` | Tool | 1 hour |
| First replies | Market | 1–3 days |
| First **paying** customer | Requires working MockupExpo checkout + sales close | 3–14 days (typical cold outbound) |

**Honest constraint:** No amount of AgentPlatform code produces a paying customer until (1) emails go out, (2) someone replies, (3) MockupExpo can take payment. Steps 1–2 are partially unblocked **today** with CSV + send. Step 3 is **outside** this repo.

---

## 6. Next 3 development options — ranked

Scored for **MockupExpo paying customers**, not AgentPlatform subscriptions.

### Option 1 — Manual GTM sprint using existing CSV MVP (0 dev days)

| Dimension | Score | Rationale |
|-----------|-------|-----------|
| **Time to build** | **0 days** | Already shipped (`changelog` v0.4.0) |
| **Revenue potential in 24 hours** | **Highest** | Only option that can send real outreach today |
| **Revenue potential in 7 days** | **Medium** | Limited by manual lead sourcing (~50 leads/batch, 20 sends/day) |

**What it is:** Founder sources leads externally (Etsy shop browsing, “contact seller”, LinkedIn, Apollo export, niche Facebook groups), builds CSV, uses existing UI.

**Evidence it works structurally:** Import → generate → review → send path is complete in code.

---

### Option 2 — Google Custom Search shop discovery module (~2–3 dev days)

| Dimension | Score | Rationale |
|-----------|-------|-----------|
| **Time to build** | **2–3 days** | Phase B in `POD_OUTREACH_AGENT.md`; needs API keys, worker job, UI for “Run search” |
| **Revenue potential in 24 hours** | **Zero** | Cannot send until built + leads enriched with emails |
| **Revenue potential in 7 days** | **Medium–High** | Automates shop URL collection; still need emails (often missing from CSE alone) |

**What it is:** Admin enters niche keywords → worker finds Etsy/Shopify shop URLs → saves to `pod_leads` without email → still requires enrichment or manual email lookup.

**Gap it closes:** Automatic **finding** of sellers (partial — URLs not emails).

---

### Option 3 — Email enrichment API integration (~1–2 dev days)

| Dimension | Score | Rationale |
|-----------|-------|-----------|
| **Time to build** | **1–2 days** | Hunter.io / Apollo API + batch job on leads missing `email` |
| **Revenue potential in 24 hours** | **Zero** | Requires leads with shop URLs already in system |
| **Revenue potential in 7 days** | **Medium** | Speeds up CSV prep if you import shop-only rows; useless without lead sources |

**What it is:** Given `shop_url` or shop name, API finds owner email → fills `pod_leads.email`.

**Gap it closes:** Automatic **enrichment** only — not discovery.

---

### Options **not** recommended next (evidence)

| Option | Why not now |
|--------|-------------|
| Full Etsy scraper | Legal/ToS risk; longer build (1–2 weeks); planned as Phase B/C in doc but higher complexity than CSE |
| AgentPlatform billing / Mockup Agent | Does not directly acquire MockupExpo customers; Mockup Agent still stub |
| SEO Agent work | Unrelated to outbound sales motion |

---

## 7. Ranking summary

| Rank | Option | Build time | 24h revenue | 7d revenue |
|------|--------|------------|-------------|------------|
| **1** | Manual GTM + existing CSV MVP | 0 days | **Highest** | Medium |
| **2** | Google CSE shop discovery | 2–3 days | None | Medium–High |
| **3** | Email enrichment API | 1–2 days | None | Medium |

---

## 8. ONE recommendation

### **Run a manual GTM sprint using the CSV MVP that is already built. Do not build new features until you have sent 100 outreach emails and logged reply rate.**

**Why (evidence-based):**

1. **The bottleneck is leads, not email tooling.** Outreach generation, review, and send exist. Discovery and enrichment do not — but a founder can supply leads manually faster than waiting 2–3 days to build CSE discovery.

2. **24-hour revenue only comes from sending today.** Options 2 and 3 have **zero** 24-hour revenue potential because they require dev time before a single email goes out.

3. **Building discovery before sending optimizes the wrong thing.** You have no data on reply rate, message fit, or MockupExpo conversion from this channel. Sending 20/day for 5 days (100 emails) produces real signal; building scrapers produces none.

4. **MockupExpo payment is downstream.** Even perfect auto-discovery fails if `mockupexpo.com` does not close paid signups. Validate the sales motion manually first.

**Concrete actions (no code):**

1. Open `http://localhost:3001/dashboard/agents/pod-outreach`
2. Source 30–50 POD seller emails manually (Etsy shop About + contact, Shopify store pages)
3. Use `docs/sample-pod-leads.csv` format
4. Import → review → send up to 20/day
5. Mark replies `replied` / `interested` in UI
6. Close interested leads on MockupExpo (verify checkout works on live site)
7. **Only after** reply rate is known → decide if Option 2 (CSE discovery) is worth building

---

## 9. Expectation reset (one paragraph)

The name “POD Lead Finder + Auto Outreach” and the planning doc (`POD_OUTREACH_AGENT.md`) describe a **full auto pipeline**. What shipped (`changelog` v0.4.0) is an **Auto Outreach + Manual Lead Import** tool. Steps 1–3 of your original belief (auto find, auto collect, auto enrich) are **not in the product**. Step 4–5 (generate + send) **are**. Closing the revenue gap starts with manual leads + sends now, not with more architecture.

---

## 10. Document maintenance

Update this file when:

- First outreach batch is sent (add reply rate)
- First MockupExpo paying customer from `utm_source=pod-outreach`
- A discovery or enrichment feature is actually shipped (move from “missing” to “built”)
