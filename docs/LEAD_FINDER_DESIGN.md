# Lead Finder — Design (50+ Leads/Day)

**Status:** Design only — no code  
**Goal:** Minimum **50 outreach-ready leads per day** for MockupExpo  
**Output fields:** `email`, `shop_name`, `shop_url`, `niche`  
**Rule:** A lead exists only when a contact **email** is present. No URL-only records.

---

## Comparison of three approaches

All three enforce the same email gate: **no email → discard, do not store.**

| | **1. Apollo-first** | **2. Hunter-first** | **3. Google CSE + Hunter** |
|---|---------------------|---------------------|----------------------------|
| **How discovery works** | Apollo **People Search** / **Organization Search** API filtered for small e-commerce / POD / Shopify-adjacent companies + owner/founder titles | Google CSE at max volume to collect store **domains**; Hunter is the **only** email source (no Apollo) | Google CSE niche queries for Shopify/POD URLs; Hunter Domain Search for email; optional public contact-page `mailto:` fallback |
| **How email is obtained** | Email returned **in Apollo search results** (verified/guessed per Apollo scoring) | Hunter **Domain Search** on each domain from CSE | Hunter Domain Search (+ optional contact-page parse) |
| **Shopify / POD fit** | Strong — filter by keywords (`print on demand`, `custom apparel`, `merch`), employee count 1–50, titles Owner/Founder/CEO; post-filter where `website_url` looks like a store (Shopify subdomain, `/collections`, product-category pages) | Strong for Shopify URLs from CSE; weaker signal on “is this POD” until domain is opened | Strong — queries explicitly target `site:myshopify.com` and POD phrases |
| **Etsy** | Poor as primary — Apollo rarely maps to Etsy shop URLs; skip or treat as edge case | CSE `site:etsy.com/shop` → read public shop page for **external website** → Hunter on that domain only; discard if no email | Same as Hunter-first Etsy path |
| **API calls per lead** | **~1** (search record already includes email) | **~2** (CSE discovery + Hunter search) | **~2–3** (CSE + Hunter + occasional HTTP fetch) |
| **Realistic leads/day** | **50–120** | **35–60** (credit- and hit-rate-limited) | **25–50** (often **below 50** on typical tiers) |
| **Main bottleneck** | Apollo **export/search credits** and API rate limits | Hunter **domain-search credits** (~100+ searches/day needed) + CSE **10 results/query** ceiling | Same Hunter bottleneck + lower-quality domain list from CSE |
| **Monthly API cost (50/day target)** | **~$79–149** (Apollo Professional / Organization) | **~$104–349** (Hunter Growth or Business) + **~$0–15** CSE | **~$104–349** Hunter + **~$0–15** CSE |
| **Cost per outreach-ready lead** | **~$0.05–0.15** | **~$0.10–0.25** | **~$0.10–0.30** |
| **Time to implement** | **~3 days** | **~5 days** | **~4–5 days** |
| **Time to first 50 leads after build** | **Same day** (one scheduled run, ~15–30 min) | **Same day–next day** (may need 2 CSE batches + Hunter queue) | **Same day–next day** (often short of 50 without extra Hunter tier) |
| **Legal surface** | Apollo B2B database terms + CAN-SPAM/GDPR on send | CSE terms + Hunter terms + light Etsy page read + CAN-SPAM/GDPR | Same as Hunter-first |

### Why Apollo-first hits 50/day more reliably

- **Email is co-located with discovery.** Apollo returns owner/founder contacts with email on the same record. Hunter-first and CSE+Hunter must discover a domain first, then pay for a second lookup, and **40–60% of domains return no email** — so you need **~90–125 Hunter searches** to net 50 leads, every day.
- **Fewer moving parts.** One primary vendor, one credit pool, one dedupe key (`email`).
- **Better role targeting.** “Founder / Owner” at a 5-person ecommerce company is a higher-quality MockupExpo prospect than `support@` from a domain search.

### Why Hunter-first and CSE+Hunter struggle at 50/day

| Constraint | Impact |
|------------|--------|
| Hunter Starter (500 searches/mo) | **~16/day max** — non-starter for this goal |
| Hunter Growth (5,000/mo) | **~166/day** searches — enough only if hit rate ≥30% and you run daily |
| CSE free tier (100 queries/day) | ~10 results each → noisy, duplicate-heavy domain list |
| Domain email hit rate | 40–60% on cold Shopify domains → **must over-fetch** domains |

CSE+Hunter can reach 50/day only on **Hunter Business** (~20k searches/mo) **and** aggressive daily CSE runs — higher cost and complexity than Apollo-first for the same outcome.

---

## Recommendation: Apollo-first

**Use Apollo as the sole primary pipeline.** Run one daily batch per admin-defined niche keywords. Keep Hunter and Google CSE **out of the hot path** (optional manual supplements only if Apollo yield drops for a niche — not part of this design).

This is the **fastest path to 50+ outreach-ready leads/day** on build effort, API hops, and daily throughput.

---

## Apollo-first: exactly how leads will be found

### Step 1 — Admin input

Admin enters **1–5 niche keywords** (e.g. `dog mom mug`, `nurse life shirt`, `funny cat POD`).

Each keyword drives one Apollo search job.

### Step 2 — Apollo People Search (API)

For each niche, call **Apollo.io `mixed_people/search`** (or `people/search`) with fixed POD/Shopify-biased filters:

| Apollo parameter | Value |
|------------------|--------|
| `person_titles` | `owner`, `founder`, `ceo`, `co-founder`, `ecommerce manager` |
| `organization_num_employees_ranges` | `1,10`, `11,50` |
| `q_organization_keyword_tags` or `q_keywords` | `{niche}` + `ecommerce`, `shopify`, `print on demand`, `online store` |
| `organization_locations` | US, UK, CA, AU (reduce GDPR friction initially) |
| `per_page` | 100 (paginate until daily quota met) |

### Step 3 — Email gate + store filter (discard aggressively)

For each Apollo person record:

1. **No email in record** → **discard** (do not store).
2. **No organization website** → **discard**.
3. **Keep** if website looks like a **Shopify/POD store**:
   - `*.myshopify.com`, or
   - custom domain with Apollo org tags/keywords indicating retail/apparel/merch/POD, or
   - lightweight HTTP HEAD/GET confirming Shopify signals (`cdn.shopify.com`, `X-Shopify-Stage`, `/collections/` in HTML) — only for borderline rows.
4. **Etsy:** keep only if Apollo `website_url` or org name clearly maps to an Etsy shop **and** email is present (rare). Do **not** ingest Etsy URLs without email.

### Step 4 — Map to output fields

| Field | Source |
|-------|--------|
| `email` | Apollo person email (prefer `email_status` verified when available) |
| `shop_name` | Apollo `organization.name` |
| `shop_url` | Apollo `organization.website_url` |
| `niche` | Admin keyword for this search job |

Dedupe on **`email`** before insert. Push valid rows to existing **POD Outreach** (`pod_leads`).

### Step 5 — Daily volume control

| Control | Setting |
|---------|---------|
| Target | **50 valid leads/day** minimum |
| Apollo records fetched | **~70–90/day** (assume ~60–75% pass email + store filter) |
| Max stored per run | **100** (hard cap to control credits) |
| Schedule | **1 automatic run/day** + optional manual “Run now” |

---

## Exact data sources / APIs (recommended build)

| # | Service | API | Role |
|---|---------|-----|------|
| 1 | **Apollo.io** | `POST https://api.apollo.io/api/v1/mixed_people/search` | Discovery **and** email in one step |
| 2 | **Optional HTTP** | Public store URL | Confirm Shopify/POD for borderline Apollo orgs only |
| 3 | **POD Outreach** (internal) | Existing `pod_leads` | Review queue + outreach |

**Not in hot path:** Google CSE, Hunter.io (allowed tools, but not needed to hit 50/day with Apollo-first).

**Environment variables (when implemented):**

- `APOLLO_API_KEY`

---

## Expected leads per day (Apollo-first)

| Scenario | Leads/day |
|----------|-----------|
| **Conservative** (tight filters, 3 niches) | **50–70** |
| **Typical** (5 niches, paginated search) | **70–100** |
| **Upper bound** (credit-rich plan, broad niches) | **100–120** |

**Etsy contribution:** **0–5/day** — most valid leads will be Shopify/DTC POD via org website, not Etsy.

---

## Expected cost (Apollo-first, 50/day)

| Item | Monthly cost | Notes |
|------|--------------|-------|
| Apollo Professional / Organization | **~$79–149** | Covers ~1,500–3,000 export/search credits/mo; 50/day ≈ 1,500/mo |
| Optional HTTP checks | **~$0** | Low volume, borderline rows only |
| **Total** | **~$80–150/month** | **~$0.05–0.10 per outreach-ready lead** |

No Hunter or CSE subscription required for the recommended path.

---

## Legal / compliance risks (Apollo-first)

| Risk | Severity | Mitigation |
|------|----------|------------|
| **CAN-SPAM** | Medium | POD Outreach review-before-send; physical address, honest From, opt-out in body |
| **GDPR** | Medium | Geo-filter US/UK/CA/AU first; honor opt-out; delete on request; B2B legitimate-interest basis |
| **Apollo Terms of Use** | Medium | Use API for outbound prospecting per plan; no reselling data; respect credit limits |
| **Email accuracy** | Medium | Prefer Apollo verified emails; discard low-confidence; human review before send |
| **Mis-targeting** (not POD) | Low–Medium | Shopify/POD post-filter on `shop_url`; tighten keywords if noise rises |
| **Etsy** | Low | Only ingest when email + shop URL both present; no Etsy scraping |
| **Purchased static lists** | High | **Not used** |

Storing **email-only-valid rows** keeps PII minimal and purpose-bound.

---

## Time to implement (Apollo-first)

| Work | Estimate |
|------|----------|
| Admin UI: niche keywords + Run + daily stats | 0.5 day |
| Apollo search adapter + pagination + filters | 1 day |
| Email gate + Shopify/POD post-filter + field mapping | 1 day |
| Dedupe + push to `pod_leads` + POD Outreach hookup | 0.5 day |
| Credit metering + “50/day target” dashboard | 0.5 day |
| **Total** | **~3 working days** |

**First 50 outreach-ready leads:** same day as first production run (~15–30 minutes after Apollo key is live).

---

## Daily operating loop

1. Admin sets 3–5 niche keywords (or reuses saved set).
2. Lead Finder runs Apollo search once (scheduled or manual).
3. System drops all rows without email or without a valid store URL.
4. **≥50 leads** land in POD Outreach with `email`, `shop_name`, `shop_url`, `niche`.
5. Admin reviews and sends (note: POD Outreach today caps **20 sends/day** — leads can queue; raising send cap is separate from Lead Finder).

---

## Success criteria

| Metric | Target |
|--------|--------|
| Outreach-ready leads per day | **≥ 50** |
| URL-only rows stored | **0** |
| Manual CSV for lead discovery | **0** |
| Primary API integrations in hot path | **1** (Apollo) |
| Run → leads in POD Outreach | **< 30 minutes** |

---

*Recommended approach: **Apollo-first**. No code until explicitly requested.*
