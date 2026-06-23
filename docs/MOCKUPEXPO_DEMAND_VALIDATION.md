# MockupExpo Demand Validation Plan

**Site:** [mockupexpo.com](https://www.mockupexpo.com)  
**Status:** Superseded for lead acquisition — see [`LEAD_FINDER_MINIMAL.md`](LEAD_FINDER_MINIMAL.md)  
**Goal:** Prove whether **POD shop owners are interested** before any further investment  
**Budget:** **$0 recurring** + **~30–45 min founder time per batch** (approve-only; system finds + prepares)

> **Note:** The manual CSV / Google workflow below is **deprecated**. Use minimal Lead Finder (POD Outreach “Find leads”) for discovery; founder only reviews and sends.

---

## What you are (and are not) validating

| Validating | Not validating yet |
|------------|-------------------|
| Do sellers **reply** or express interest? | Automated lead discovery |
| Will they **click** or **start a free trial**? | 50 leads/day pipeline |
| Is the **offer/message** compelling for a niche? | Lead Finder / Apollo / Hunter |
| Is there **any path to payment**? | AgentPlatform billing, new agents |

**Success = interest signals, not necessarily revenue.** One paying customer is a strong validate; **3+ positive replies from 20 sends** is enough to justify modest next investment.

---

## Hypothesis

> Shopify/POD store owners who still use flat listing images will respond to a short, personalized email offering a **free before/after mockup walkthrough** on [mockupexpo.com](https://www.mockupexpo.com), at a rate that makes manual outreach worth scaling.

**Falsified if:** After 20 well-targeted sends, you get **0 replies** and **0 trial visits** from outreach (UTM) within 7 days.

---

## Use only what already exists

| Asset | Role | Cost |
|-------|------|------|
| **POD Outreach** (`/dashboard/agents/pod-outreach`) | Import CSV → generate email → review → send or **Copy for Gmail** | $0 |
| **Gmail** (copy/paste send) | Deliver mail without paid SMTP | $0 |
| **Google search** (browser) | Find shops + emails on public contact/about pages | $0 |
| **mockupexpo.com** | Landing + free trial (`utm_source=pod-outreach` already in default link) | $0 |
| **Spreadsheet or notes** | Track replies, trials, outcomes | $0 |

**Do not build:** Lead Finder, discovery scrapers, enrichment APIs, new agents, checkout changes in AgentPlatform.

---

## Validation metrics (7-day window)

Track in a simple sheet + POD Outreach lead statuses (`sent` → `replied` → `interested`).

| Signal | Strength | Target (20 sends) |
|--------|----------|-------------------|
| **Positive reply** (“yes”, “send example”, “how much”, “trial”) | Primary | **≥ 2** (10%+) = promising |
| **Neutral reply** (question, “not now”) | Weak positive | Count separately |
| **Trial start** with `utm_source=pod-outreach` | Strong | **≥ 1** = strong validate |
| **Paid conversion** | Strongest | **≥ 1** = demand proven |
| **Hard no / unsubscribe** | Negative | Note for message/list quality |

**Industry context:** Cold B2B email often sees **1–5%** positive replies. POD sellers may be lower. **10%+ positive** on a tiny sample is a green light; **0%** after careful targeting is a red light.

---

## 7-day execution plan

### Day 1 — Prepare list (3–4 hours, $0)

**Target:** **20 leads** with all fields: `email`, `shop_name`, `shop_url`, `niche`.

**Where to find them (free, manual):**

1. Google: `{niche} site:myshopify.com` (pick 4 niches you know — e.g. mug, nurse shirt, dog mom, golf gift).
2. Open **10 stores per niche** → contact/about page → copy **visible business email** only.
3. Skip contact-form-only stores unless you find email on About/Instagram/Facebook linked from footer.
4. Prefer **small shops** (handmade vibe, few collections) over big brands.

**Quality bar:** Would you honestly send them a mockup before/after? If no, drop them.

**Output:** CSV ready for POD Outreach import (max 50 rows; you need 20).

---

### Day 2 — Send batch 1 (1–1.5 hours, $0)

1. Log in as admin → **POD Outreach**.
2. Import CSV.
3. For each lead: **Generate email** → read → lightly edit subject/first line if shop-specific detail helps (still in review UI, no code).
4. Send **10 emails** via **Copy for Gmail** (or SMTP if already configured free).
5. Mark leads `sent` in UI.

**Why 10 first:** Lets you fix message/list issues before burning the second 10.

---

### Day 3 — Send batch 2 + monitor (1 hour, $0)

1. Send remaining **10** emails.
2. Check inbox for replies; update lead status manually.
3. Check MockupExpo analytics (or hosting dashboard) for visits/signups with **`utm_source=pod-outreach`** if available.

---

### Days 4–7 — Follow-up and classify (30 min/day, $0)

| Day | Action |
|-----|--------|
| 4 | Reply to anyone who responded; offer **one specific free before/after** on their product (manual mockup using MockupExpo). |
| 5 | **One manual follow-up** only to non-responders who opened no thread (short bump in same Gmail thread — no automation). |
| 6–7 | Record outcomes; score against go/no-go table below. |

**No paid follow-up tools.** No sequences. One bump max.

---

## Message (use existing template)

POD Outreach already generates:

- **Subject:** `Better mockups for {shop}?`
- **CTA:** Free walkthrough + link to `https://mockupexpo.com?utm_source=pod-outreach`

**Manual tweaks in review (no code):**

- Mention **one real product** from their shop in the opening line.
- Keep email **under 120 words**.
- Do not pitch price in email #1 — offer free walkthrough only (matches site’s free trial positioning).

---

## Tracking sheet (minimum columns)

| # | shop_name | niche | sent_date | reply? | interest (Y/N) | trial? | paid? | notes |
|---|-----------|-------|-----------|--------|----------------|--------|-------|-------|

Mirror interest in POD Outreach statuses when possible.

---

## Go / pivot / stop (after 20 sends + 7 days)

| Result | Decision |
|--------|----------|
| **≥ 2 positive replies** OR **≥ 1 trial** from outreach UTM | **GO** — demand signal exists; next investment can be **time** (more manual batches) or **paid enrichment**, not new agents yet |
| **1 weak/neutral reply only** | **PIVOT** — try different niche or sharper offer (e.g. “I made a mockup of your best seller — want to see it?”) with **another free 20-send batch** |
| **0 replies, 0 UTM trials** | **STOP or PIVOT hard** — problem is list quality, message, offer, or market; do **not** buy Apollo/Lead Finder until you change something and retest 20 sends |
| **≥ 1 paid customer** | **STRONG GO** — prioritize conversion path on mockupexpo.com, not AgentPlatform features |

---

## Cost and time budget

| Item | Amount |
|------|--------|
| **Recurring cost** | **$0** |
| **One-time cost** | **$0** (no trials that auto-bill — do not sign up for Apollo/Hunter) |
| **Development time** | **0 days** |
| **Founder time** | **~6–8 hours** total over 7 days |
| **Sends** | **20** (within existing 20/day cap) |

---

## Risks and mitigations (no code)

| Risk | Mitigation |
|------|------------|
| Emails go to spam | Send from a real Gmail you check; plain text; no links overload; personalize first line |
| Wrong audience | Stick to **Shopify POD** niches you can see use flat mockups |
| No SMTP | Use **Copy for Gmail** in POD Outreach |
| Can’t track trials | Ask repliers “did you get a chance to try the trial?”; check UTM in site analytics if installed |
| CAN-SPAM | Include opt-out line in manual edit if sending at volume later; for 20 sends, honest From + real reply address is enough |

---

## Explicit out of scope (this validation)

- Lead Finder implementation  
- Apollo, Hunter, Google CSE API setup  
- New agents or discovery workers  
- AgentPlatform code changes  
- Paid ads  
- Etsy API or scrapers  
- Building follow-up automation  

---

## Recommended next step (single action)

**Today:** Build a **20-row CSV** of Shopify POD shops with emails → import into **POD Outreach** → send **10 tomorrow, 10 the day after** → wait 7 days → score against the go/no-go table.

That is the lowest-cost, zero-development proof of whether [mockupexpo.com](https://www.mockupexpo.com) resonates with real sellers.

---

*Plan only. No implementation until validation results justify it.*
