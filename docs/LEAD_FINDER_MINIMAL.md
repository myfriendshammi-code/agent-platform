# Minimal Lead Finder — First 20 Leads (Approve-Only)

**Status:** Design only — no code  
**Goal:** System **finds leads** + **prepares outreach**; founder **approves only**  
**Recurring cost:** **~$0** (Google CSE free tier + public pages)  
**Scope:** Smallest possible build — **extends existing POD Outreach**, no new agent

---

## Why the demand validation plan was rejected

[`MOCKUPEXPO_DEMAND_VALIDATION.md`](MOCKUPEXPO_DEMAND_VALIDATION.md) assumed **3–4 hours of manual Google + email hunting** per batch. That violates:

| Requirement | Validation plan | This design |
|-------------|-----------------|-------------|
| System finds leads | Founder Googles | **Google CSE API + contact-page fetch** |
| System prepares outreach | Founder imports CSV, clicks Generate | **Auto-save draft email on insert** |
| Founder approves only | Founder builds list + edits heavily | **Review → Send / Reject** |

---

## One sentence

**Google finds Shopify stores → system extracts public emails → system writes draft outreach → founder approves send in POD Outreach.**

---

## Exact data source

| # | Source | API / method | Cost |
|---|--------|--------------|------|
| 1 | **Google Programmable Search JSON API** | `GET https://www.googleapis.com/customsearch/v1` | **$0** — 100 queries/day free |
| 2 | **Public store websites** | HTTP GET on shop contact/about paths | **$0** |

**Not used:** Apollo, Hunter, Etsy API, purchased lists, manual Google, CSV import for discovery.

**One-time setup ($0):** Google Cloud API key + Programmable Search Engine ID (`cx`) scoped to web search.

**Discovery query (fixed template per niche):**

```
{niche} site:myshopify.com
```

Optional second query per niche if batch under 20 leads:

```
{niche} "powered by Shopify" print on demand
```

---

## Exact workflow

```
┌─────────────────────────────────────────────────────────────────┐
│ FOUNDER (once per run)                                          │
│  1. Open POD Outreach                                           │
│  2. Enter 3–4 niche keywords                                      │
│  3. Click "Find leads" (target: 20)                             │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ SYSTEM — Discover (automated)                                   │
│  For each niche:                                                │
│    → Google CSE → up to 10 shop URLs per query                  │
│    → Dedupe URLs across niches                                  │
│    → For each URL (until 20 leads saved OR 120 URLs tried):     │
│        → Fetch /pages/contact, /contact, /pages/contact-us,     │
│          /pages/about-us, / (footer)                            │
│        → Extract first valid business email (mailto: or regex)  │
│        → NO EMAIL → discard URL, do not store                   │
│        → HAS EMAIL → build lead row                             │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ SYSTEM — Prepare outreach (automated)                           │
│  For each saved lead:                                           │
│    → shop_name from CSE title or page <title>                   │
│    → shop_url, niche, email                                     │
│    → Call existing generateOutreachEmail()                      │
│    → Insert pod_leads: status=draft, subject/body pre-filled   │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ FOUNDER — Approve only                                          │
│  4. Review list (email + shop + pre-written email visible)      │
│  5. Reject bad rows (optional; rare if filters tight)           │
│  6. Send approved rows (existing Send / Copy for Gmail)         │
└─────────────────────────────────────────────────────────────────┘
```

**Outreach-ready definition:** row in `pod_leads` with `email`, `shop_name`, `shop_url`, `niche`, and **draft `subject` + `body`** — founder does not click Generate.

**Hard rules:**

- No email → never stored  
- No URL-only records  
- Stop run when **20 leads saved** or **120 URLs processed** (whichever first)

---

## Where it lives (smallest build)

| Build | Include | Skip |
|-------|---------|------|
| **Module** | `src/lib/lead-finder/` (CSE + contact email + run orchestrator) | Separate agent page |
| **API** | `POST /api/agents/pod-outreach/discover` | New agent slug |
| **UI** | "Find leads" panel on **existing** POD Outreach dashboard | Lead Finder dashboard, CSV import path for discovery |
| **Worker** | Background job (reuse SEO BullMQ pattern) so run doesn’t timeout | Separate `lead-finder` agent seed changes |

**No new agent.** One button on POD Outreach.

---

## Expected leads/day

| Scenario | Outreach-ready leads | Notes |
|----------|----------------------|-------|
| **First run (target 20)** | **12–20** in one run | If &lt;20, click Run again with new niche keywords (still $0) |
| **Single run ceiling** | **~15–25** | Contact-page email hit rate ~25–40% on Shopify |
| **Daily max (free CSE)** | **~20–35** | 100 CSE queries/day is not the bottleneck; email extraction is |
| **Etsy** | **0–2/day** | Excluded from v1 minimal scope |

**Honest constraint at $0:** Many shops use contact forms only — auto pipeline cannot reach 20 every run without a second run or extra niches. Founder does **not** hunt emails manually; they may **re-run** with different niches (one click).

---

## Expected implementation time

| Task | Time |
|------|------|
| Google CSE client + niche queries | 0.5 day |
| Contact-page fetch + email extract + validation | 0.5 day |
| Discover orchestrator → `pod_leads` + auto-generate email | 0.5 day |
| Background job + `POST .../discover` + run status | 0.25 day |
| POD Outreach UI: niche input, Find leads, progress, link to review | 0.25 day |
| **Total** | **~1.5–2 working days** |

---

## Founder actions required

| Action | When | Time |
|--------|------|------|
| Create Google CSE + API key (once) | Before first run | ~20 min |
| Enter 3–4 niche keywords | Per run | ~2 min |
| Click **Find leads** | Per run | ~1 click |
| Wait for run to finish | Per run | ~5–15 min (background) |
| **Review** pre-written emails; **Send** or **Reject** | Per batch | **~20–30 min** for 20 leads |
| Reply to inbound interest | After sends | As needed |

**Founder does NOT:** Google shops, copy emails, build CSV, click Generate per lead, or hunt contact pages.

---

## Recurring cost

| Item | Cost |
|------|------|
| Google CSE | **$0/mo** (100 queries/day) |
| Public page fetch | **$0** |
| **Total** | **~$0/mo** |

---

## Integration with MockupExpo validation

Replace manual Day 1 in [`MOCKUPEXPO_DEMAND_VALIDATION.md`](MOCKUPEXPO_DEMAND_VALIDATION.md):

| Old (manual) | New (this design) |
|--------------|-------------------|
| 3–4 hr CSV building | System discover (~15 min wall time) |
| Generate each email | Pre-generated drafts |
| 6–8 hr founder total | **~30–45 min founder** per 20-lead batch |

Validation metrics (≥2 replies / 20 sends) unchanged.

---

## v1 explicit exclusions (keep build small)

- Apollo / Hunter  
- Etsy discovery  
- Separate Lead Finder agent UI  
- Shopify technology verification HTTP  
- Auto-send without founder click  
- Follow-up sequences  

---

## Pre-build estimates (implemented)

| Question | Answer |
|----------|--------|
| **Email hit rate (Shopify contact pages)** | **~22–35%** realistic; plan for **~28%** |
| **URLs for 20 emails** | **~70–100** at 28% hit rate; hard cap **120** URLs/run |
| **Duplicate prevention** | Normalized `shop_url` in-run set; `@@unique([userId, email])` in DB |
| **Real emails only** | Blocklist (widgets/noreply); myshopify requires `mailto:` or domain match |
| **Contact form only** | **Discard** — counted in `noEmailSkipped`, never stored |

**Final decision:** **GO** — implemented as POD Outreach “Find leads” extension.

---

1. Founder enters niches → clicks Find leads → **≥12 leads** appear with email + draft outreach without manual import.  
2. **Zero** rows without email stored.  
3. Founder can Send from existing POD Outreach UI without clicking Generate.  
4. Second run with new niches can reach **20 total** unique emails (dedupe on email).

---

*Smallest Lead Finder: CSE + contact email + POD Outreach extension. No code until approved.*
