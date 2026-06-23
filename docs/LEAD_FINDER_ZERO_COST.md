# Lead Finder — Zero-Cost Design (First 20 Leads)

**Status:** Design only — no code  
**Goal:** **20 outreach-ready leads** at **$0 recurring cost**  
**Output fields:** `email`, `shop_name`, `shop_url`, `niche`  
**Rule:** No email → not a lead. No URL-only records.

---

## Recommendation (one approach)

**Google CSE (free tier) → public contact-page email harvest → mandatory manual review → POD Outreach.**

Use **manual Google search + CSV import** only as a **Day 0 bootstrap** if you need 20 leads before anything is built. The productized zero-cost Lead Finder is the approach above.

---

## Why this beats other zero-cost options

| Approach | Recurring cost | Time to first 20 | Repeatable? | Verdict |
|----------|----------------|------------------|-------------|---------|
| **A. Manual Google sprint + CSV import** | $0 | **2–4 hours** (today) | Manual every time | Best **bootstrap**, not a system |
| **B. Google CSE free + contact-page harvest + manual review** | $0 | **1 session** after ~2-day build; **4–6 hours** manual if run by hand first | Yes | **Recommended Lead Finder** |
| **C. Google CSE + Hunter free (25/mo) + review** | $0 | ~20 leads once/month max on Hunter credits | Partially | Hunter cap is too low; skip |
| **D. Apollo / Hunter paid tiers** | $35–130/mo | Fast | Yes | Out of scope (financial constraint) |
| **E. Etsy-first scraping** | $0 | Slow; emails rare | Poor | Skip as primary |

**Pick B** for the Lead Finder design. **Run A once** if you need revenue validation before spending build time.

---

## Approach B — exactly how leads are found

### Phase 1 — Discover store URLs (Shopify / POD first)

**Source:** [Google Programmable Search JSON API](https://developers.google.com/custom-search/v1/overview) — **100 free queries/day**, no credit card required for basic use.

**One-time setup (still $0):** Create a Programmable Search Engine + API key in Google Cloud (free tier).

**Queries per niche keyword** (run 4–5 niches for first batch):

| Priority | Query template | Finds |
|----------|----------------|-------|
| Primary | `{niche} site:myshopify.com` | Shopify stores |
| Primary | `{niche} "powered by Shopify"` | Shopify / POD shops |
| Primary | `{niche} print on demand store` | DTC POD sites |
| Secondary | `{niche} custom mug shop contact` | Stores mentioning contact |
| Secondary (Etsy) | `{niche} site:etsy.com/shop` | Etsy shops — **only keep if email found later** |

**Example niches for MockupExpo:** `dog mom mug`, `nurse life shirt`, `funny cat POD`, `golf gift shop`.

**Target for first 20 leads:** Collect **60–80 unique shop URLs** (expect duplicates across queries).

**Alternative with zero setup:** Manual Google search in browser using the same query strings → copy URLs into a spreadsheet. Same downstream steps.

---

### Phase 2 — Email harvest from public websites only

For each `shop_url`, try **public pages only** (no login, no checkout):

| Order | URL tried | What to extract |
|-------|-----------|-----------------|
| 1 | `{shop_url}/pages/contact` | `mailto:` links, visible emails |
| 2 | `{shop_url}/contact` | same |
| 3 | `{shop_url}/pages/contact-us` | same |
| 4 | `{shop_url}/about` or `/pages/about-us` | “email us at …” text |
| 5 | `{shop_url}/` (homepage footer) | footer email / `mailto:` |

**Valid email sources:**
- `mailto:support@store.com` in HTML
- Plain text on page: `hello@`, `contact@`, `info@`, owner-named addresses
- Linked external domain from Etsy shop page → repeat steps on that domain **only if email found**

**Discard immediately if:**
- No email found after all paths
- Only a contact form (no address shown)
- Email looks invalid (`example.com`, `sentry.io`, platform noreply)

**Do not store** the shop URL unless an email is attached in the same candidate row (staging) or after manual review confirms email.

**Realistic auto-extract hit rate:** **25–40%** of Shopify URLs (many stores hide email behind forms).

---

### Phase 3 — Manual review (required)

Every candidate with a proposed email goes to a **review queue** before becoming outreach-ready.

**Reviewer checks (2–3 min/lead):**

| Check | Pass? |
|-------|-------|
| Email looks like a real business inbox | ✓ |
| Store is actually POD / merch / print-related | ✓ |
| `shop_url` loads and matches shop name | ✓ |
| Niche tag is accurate | ✓ |
| Not a big brand / marketplace aggregator | ✓ |

**Actions:** Approve → push to POD Outreach (`pod_leads`) · Reject · Edit email/fields manually.

**Manual top-up:** When auto-extract yields **12–16** leads from 60–80 URLs, reviewer spends **30–60 minutes** opening remaining high-quality shops (About page, Instagram bio → website, FAQ) to manually find emails until **20 approved**.

This manual step is expected at zero cost — it replaces Apollo/Hunter.

---

### Phase 4 — Output row

| Field | Source |
|-------|--------|
| `email` | Contact page / about / manual entry |
| `shop_name` | Page `<title>`, store name in header, or Google result title |
| `shop_url` | Discovery URL |
| `niche` | Keyword that found the store |

---

## Free APIs and tools used

| Resource | Cost | Role |
|----------|------|------|
| **Google Programmable Search API** | **$0** — 100 queries/day | Find Shopify/POD URLs |
| **Public HTTP fetch** (your server or manual browser) | **$0** | Read contact/about pages |
| **Manual review** (founder) | **$0** | Confirm outreach-ready quality |
| **POD Outreach CSV import** (exists today) | **$0** | Bootstrap path without Lead Finder build |

**Explicitly not used (paid or too limited):** Apollo, Hunter paid tiers, BuiltWith, purchased lists.

**Optional, still $0 but capped:** Hunter free (25 searches/month) — only as manual fallback for 5–10 stubborn custom domains, not core pipeline.

---

## Path to first 20 leads (zero cost)

### Option 1 — Today, no build (bootstrap)

| Step | Time |
|------|------|
| 5 Google searches × 10 opens | 1 hr |
| Copy shop URL + find email on contact/about | 2 hr |
| Build CSV: `email, shop_name, shop_url, niche` | 15 min |
| Import into POD Outreach | 5 min |
| **Total** | **~3–4 hours → 20 leads** |

Uses existing product. Zero subscription. Zero code.

### Option 2 — After ~2-day Lead Finder build

| Step | Time |
|------|------|
| Enter 4 niches → Run (CSE + contact fetch) | 10 min automated |
| Review queue: approve ~15 auto-found | 45 min |
| Manual email hunt for ~5 gaps | 45 min |
| **Total** | **~2 hours → 20 leads** |

Repeatable for next batches without redoing discovery logic by hand.

---

## Expected volume (zero-cost ceiling)

| Metric | First batch | Ongoing (free tier) |
|--------|-------------|---------------------|
| Outreach-ready leads per session | **20** (target) | **15–25** per focused session |
| URLs processed | 60–80 | Up to ~100/day (CSE query budget) |
| Auto-found emails | 12–18 | 25–40/day if automated |
| Founder review time | 1–2 hr | 1–2 hr per batch |
| **Recurring cost** | **$0** | **$0** |

This will **not** scale to 50/day without paid enrichment — that is expected under financial constraints.

---

## Legal / compliance (zero-cost path)

| Risk | Level | Mitigation |
|------|-------|------------|
| Google ToS | Low | Use **Custom Search JSON API**, not scraped Google HTML |
| Store website ToS | Low–Medium | Public pages only; slow requests; no auth bypass |
| CAN-SPAM | Medium | Review-before-send in POD Outreach; opt-out in email |
| GDPR | Medium | Prefer US/CA/AU/UK stores; honor opt-out |
| Etsy | Medium | No bulk scraping; at most one public shop page for external link |
| Contact form-only stores | — | Skip unless reviewer manually finds email elsewhere |

---

## Implementation plan (when approved — no code now)

**~2 working days** for minimal zero-cost Lead Finder (admin-only):

| Day | Work |
|-----|------|
| **1** | CSE adapter (niche → queries); URL dedupe; public page fetcher for contact/about paths; `mailto:` + safe email regex; staging table or in-memory candidates |
| **2** | Review queue UI (approve / reject / edit); push approved rows to `pod_leads`; run stats; `.env` for `LEAD_GOOGLE_CSE_API_KEY` + `LEAD_GOOGLE_CSE_CX` |

**Skip for v1:** Hunter, Apollo, Etsy automation, scheduled cron, Shopify HEAD verification.

**Acceptance:** One run produces ≥12 auto candidates; after review, **20 rows** in POD Outreach with all four fields.

---

## When to upgrade off zero-cost

| Signal | Next step |
|--------|-----------|
| First 20 leads sent; ≥1 reply or trial | Consider Hunter Starter or Apollo Professional |
| Spending **>6 hrs/week** on manual email hunt | Paid enrichment pays for itself |
| Need **50+ leads/day** | Apollo-first plan (see `LEAD_FINDER_IMPLEMENTATION_PLAN.md`) |

---

## Summary

| Question | Answer |
|----------|--------|
| **Best zero-cost Lead Finder** | Google CSE (free) + public contact-page email extraction + **mandatory manual review** |
| **Fastest first 20 (no build)** | Manual Google sprint → CSV → POD Outreach (**~3–4 hours, $0**) |
| **Recurring cost** | **$0** |
| **Realistic first batch** | **20 outreach-ready leads** from 60–80 URLs + 1–2 hr review |
| **Time to build (optional)** | **~2 days** |
| **Go?** | **Yes** — for first 20 under financial constraints; accept manual review labor as the “cost” |

---

*Design only. Bootstrap with manual CSV today; build zero-cost Lead Finder when ready.*
