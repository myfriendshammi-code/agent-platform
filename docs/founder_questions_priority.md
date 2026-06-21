# Founder Questions — Priority

**Source:** All 120 questions from `questions_for_founder.md`  
**Rule:** Every question appears exactly once. Nothing removed — only prioritized.

| Tier | Count | When to answer |
|------|-------|----------------|
| **Critical** | 10 | Must answer before architecture |
| **Important** | 20 | Should answer before coding |
| **Later** | 90 | Can defer with a written v1 default |

---

## Top 10 Critical Questions (before architecture)

These decisions lock data models, entitlements, billing integration, and core platform boundaries. Wrong answers here cause expensive rework.

| # | Question | Why critical |
|---|----------|--------------|
| **9** | What exactly is an **“agent”** in product terms: a feature module, a standalone workflow, a chat assistant, or a batch tool? | Defines module boundaries, routing, and how the codebase is organized. |
| **11** | Will agents share data (e.g., leads from Lead Finder feeding Outreach), or is each agent’s data siloed unless the user exports? | Determines shared vs. isolated data domains across the platform. |
| **15** | “Users can access free features of all agents” — confirm this means **every registered user** can open every agent without paying, subject only to free-tier limits? | Locks the platform-wide entitlement model. |
| **16** | “Users subscribe only to the agents they want” — confirm paid subscribers get **only** the agents they paid for, not platform-wide premium? | Locks per-agent subscription and access-control design. |
| **20** | What does **“activating additional agents”** mean for points rewards: clicking “Enable,” completing onboarding, or starting a paid subscription? | Defines a core platform event used by points, analytics, and onboarding. |
| **24** | Is one account = one human, or will you support **team / organization accounts** (shared billing, multiple seats)? | Foundational account model — solo vs. org affects nearly every table. |
| **25** | If teams are in scope (even later), must v1 data model avoid painting you into a corner (single `user_id` only)? | Prevents irreversible schema choices during foundation build. |
| **34** | Which payment provider(s) are approved: Stripe, Paddle, Lemon Squeezy, other? | Drives subscription webhooks, checkout flows, and billing entity design. |
| **52** | For SEO Agent free tier, what are the hard limits: sites per account, scans per month, pages crawled per scan, report exports, scheduled scans? | Directly sizes infrastructure, job queues, and metering architecture. |
| **59** | What is the user’s unit of work: one **website/domain**, one **URL**, or multiple properties under one project? | Core entity for SEO Agent and shared platform project model. |

---

## Top 20 Important Questions (before coding)

Answer these before implementation starts. Architecture can proceed with reasonable assumptions, but coding without these invites rework on auth, billing UX, crawl behavior, and points.

| # | Question | Why important |
|---|----------|---------------|
| **10** | Can users use multiple agents in one session/workflow (e.g., Lead Finder → Outreach), or are agents strictly isolated? | Affects navigation, state management, and cross-agent UX patterns. |
| **12** | Is the SEO Agent the only agent in v1, or must the foundation also expose placeholders for the other three agents? | Scopes foundation UI and agent registry work. |
| **17** | If a user has paid for Agent A but uses Agent B on the free tier, is that the intended model? | Confirms mixed entitlement states that billing and dashboard must handle. |
| **18** | Can a user hold **multiple paid plans** simultaneously (e.g., SEO Pro + Outreach Pro)? | Affects subscription records, checkout, and account billing page. |
| **21** | Should “activation” be a explicit user action (opt-in per agent) or implicit on first visit? | Drives onboarding flows and when points/events fire. |
| **26** | What authentication methods are required at launch: email/password only, Google, Microsoft, magic link, passkeys? | Scopes auth implementation and identity provider integration. |
| **27** | Is email verification mandatory before using any agent? | Gates feature access and referral/points eligibility. |
| **29** | What user roles exist: end user, support agent, billing admin, super admin — anything else? | Required before admin panel and permission checks are built. |
| **35** | Who is merchant of record (you vs. marketplace provider handling tax)? | Affects checkout, invoicing, and compliance implementation. |
| **36** | Exact **SEO Agent** pricing for v1: free tier limits and paid tier price(s)? | Needed for paywalls, plan labels, and Stripe/Paddle product setup. |
| **37** | Will each agent have one paid tier at launch, or multiple tiers (Starter / Pro / Agency)? | Determines plan catalog complexity and upgrade paths. |
| **40** | Free trial model for paid plans: none, 7-day, 14-day, or “premium trial via points only”? | Affects checkout, entitlement transitions, and cron jobs. |
| **53** | Are limits enforced per calendar month, rolling 30 days, or lifetime for free users? | Implementation detail for usage counters and reset logic. |
| **54** | What happens when a free user hits a limit: hard block, upsell modal, queue with delay? | Drives error handling, UI states, and conversion UX. |
| **57** | Do all agents share one platform-wide “usage pool,” or separate meters per agent? | Metering service design across agents. |
| **60** | How many domains can a free user add vs. paid user? | Enforces plan limits in SEO Agent UI and API. |
| **63** | Broken link check: max crawl depth, max pages, respect robots.txt, rate limits — what are acceptable defaults? | Crawler implementation parameters and cost control. |
| **66** | SEO report “with exact fixes”: format (PDF, in-app checklist, email), white-label branding, shareable link? | Report generation, storage, and delivery features. |
| **71** | Does SEO Agent require the user to **verify domain ownership** before scanning (DNS, HTML file, meta tag)? | Abuse prevention, legal risk, and verification flow build. |
| **76** | Confirm the hard rule: points **never** reduce subscription price, apply as coupons, or extend paid plans at a discount? | Hard constraint on points ledger and redemption logic. |

---

## Later (90 questions)

Can be deferred with a documented v1 default. Grouped by original section for easy cross-reference to `questions_for_founder.md`.

### 1. Business strategy and success criteria

| # | Question |
|---|----------|
| **1** | What is the primary customer segment for v1: solo founders, SMB marketers, agencies, or enterprise teams? |
| **2** | What does “the platform must make profit first” mean in practice for the first 12 months? (Minimum revenue target? Maximum acceptable burn? Which agent is expected to be the first profit driver?) |
| **3** | What is the definition of “done” for the **platform foundation** milestone (before SEO Agent ships)? |
| **4** | What KPIs define success for launch: signups, paid conversions, MRR, retention, referral rate, or something else? |
| **5** | Is v1 US-only, English-only, or multi-region from day one? |
| **6** | Are there any industries or use cases you will **not** serve (e.g., adult content, gambling, regulated healthcare)? |
| **7** | Is the long-term vision B2C self-serve, B2B sales-assisted, or both? |
| **8** | Will you offer annual billing discounts at launch, or monthly only? |

### 2. Product scope and agent model

| # | Question |
|---|----------|
| **13** | For agents marked “later” (Lead Finder, Outreach, Mockup), should the UI show “Coming soon,” hide them entirely, or allow waitlist signup? |
| **14** | What is the minimum viable **free tier** experience per agent: teaser, limited runs, or full basic feature set with caps? |
| **19** | What happens when a new agent launches: are existing users auto-granted free tier access, or must they “activate” it? |
| **22** | Will any agent ever be **paid-only** with no free tier? |
| **23** | Is Mockup Agent image generation in scope for v1 foundation planning (GPU cost, content moderation), or truly post-MVP? |

### 3. Identity, accounts, and access control

| # | Question |
|---|----------|
| **28** | Is phone verification or CAPTCHA required at signup to reduce referral fraud? |
| **30** | Can one email address belong to only one account? |
| **31** | What is the account deletion policy (GDPR-style erasure, grace period, export before delete)? |
| **32** | Minimum age / parental consent requirements? |
| **33** | Will users log in on multiple devices simultaneously without restriction? |

### 4. Subscription, billing, and monetization

| # | Question |
|---|----------|
| **38** | What currency(ies) at launch? |
| **39** | How is tax (VAT/sales tax) handled? |
| **41** | “Premium trials” via points — can points unlock **full paid features** temporarily? For how long? How often per user? |
| **42** | If points can unlock premium trials, how do you prevent trial cycling from replacing subscriptions? |
| **43** | Upgrade/downgrade rules: immediate proration, end-of-period, or no downgrades in v1? |
| **44** | Cancellation: access until period end, or immediate cutoff? |
| **45** | Refund policy: none, 7-day, pro-rata, case-by-case? |
| **46** | Failed payment / dunning: how many retries, grace period, downgrade to free or hard lockout? |
| **47** | Chargebacks and fraud: who handles, and what account action is taken? |
| **48** | Will invoices/receipts be self-serve downloadable? |
| **49** | Per-agent subscription is clear — is there **any** platform-level paid plan (bundle discount across agents)? |
| **50** | If a user cancels SEO paid but keeps Outreach paid, what do they retain access to? |
| **51** | Are subscriptions per **user** or per **workspace/organization** if teams exist later? |

### 5. Free tier limits and usage metering

| # | Question |
|---|----------|
| **55** | For paid SEO tier, what limits still apply (fair use cap vs. truly unlimited)? |
| **56** | Will usage be metered for **overage billing** on paid plans, or strictly tier caps with no overage? |
| **58** | Should admins be able to override limits for specific users (comps, support exceptions)? |

### 6. SEO Agent — functional and product requirements

| # | Question |
|---|----------|
| **61** | Sitemap check/generation: generate and **host** sitemap on your platform, or only validate/generate for download? |
| **62** | Robots.txt and schema checks: fetch live URL only, or also accept pasted content / file upload? |
| **64** | Who is liable if crawling a customer site causes load issues — acceptable use policy needed? |
| **65** | Index/noindex audit: source of truth is live crawl, sitemap, or manual URL list? |
| **67** | Are reports stored historically for comparison over time, or generated on demand only? |
| **68** | Google Search Console integration “later” — is OAuth + read-only metrics in v1 scope or strictly post-launch? |
| **69** | Bing Webmaster “later” — same question. |
| **70** | Without GSC in v1, how do you validate “index status” claims to users? |
| **72** | Can users scan **any** URL (competitive analysis), or only domains they prove they own? |
| **73** | Scheduled/recurring scans in v1, or manual trigger only? |
| **74** | Notifications when issues are found: email, in-app, webhook, none in v1? |
| **75** | Multi-language sites and international SEO in scope for v1? |

### 7. Points, referrals, and rewards economics

| # | Question |
|---|----------|
| **77** | “Rewards must generate at least $20 revenue for every $1 cost” — is this a **design guideline** or an enforced automated check before launching any reward? |
| **78** | How do you calculate “$1 cost” for a reward: infra cost, opportunity cost, blended CAC, or nominal retail value? |
| **79** | Full list of **allowed** point redemptions at launch (extra scans, bonus reports, premium trials, perks — specify each). |
| **80** | Full list of **point-earning actions** at launch: referral signup, referral conversion to paid, activating agents — anything else? |
| **81** | Referral mechanics: unique link, code, both? Cookie/window attribution length (7, 30, 90 days)? |
| **82** | Referral reward triggers on: signup, email verify, first paid subscription, first payment cleared? |
| **83** | Points for “activating additional agents” — paid activation only, or free tier activation counts? |
| **84** | “Each bonus should be given only once per qualifying action” — define qualifying actions and edge cases (user deletes account and re-registers, same referral from two devices). |
| **85** | Point expiration: never, 12 months, rolling? |
| **86** | Point transfer between users: allowed or forbidden? |
| **87** | Maximum points balance cap? |
| **88** | Anti-abuse: self-referral, disposable emails, VPN farms — what verification or clawback rules apply? |
| **89** | If a referred user refunds/chargebacks, are points revoked from referrer? |
| **90** | Will points have a **visible cash equivalent** in UI (even if not redeemable for cash)? Legal implications acknowledged? |
| **91** | Premium trials via points — which agent tiers can be unlocked, and does it stack with paid subscription? |

### 8. Dashboard, admin panel, and operations

| # | Question |
|---|----------|
| **92** | What must the **user dashboard** show at launch: agent cards, usage meters, billing, points balance, referral link — full list? |
| **93** | What must the **admin panel** support at launch: user search, subscription override, points adjustment, usage logs, agent feature flags, impersonation? |
| **94** | Who uses the admin panel initially: only founder, or support staff with role-based permissions? |
| **95** | Is impersonation (“login as user”) required for support — security and audit requirements? |
| **96** | Feature flags per agent: can admin disable an agent globally or per user without deploy? |
| **97** | Content moderation needs for user-generated inputs (URLs, outreach copy, mockup prompts) — human review queue in v1? |
| **98** | Support channel: email only, in-app chat, ticketing integration? |
| **99** | Status page / incident communication required at launch? |

### 9. Legal, compliance, privacy, and trust

| # | Question |
|---|----------|
| **100** | Privacy policy, Terms of Service, Acceptable Use Policy — exist already or must be drafted pre-launch? |
| **101** | GDPR / CCPA: data residency requirements, DPA with subprocessors, cookie consent for PWA? |
| **102** | What personal data is collected beyond email/password (IP, analytics, crawl targets, payment metadata)? |
| **103** | Data retention: how long keep scan results, logs, deleted user backups? |
| **104** | Subprocessor list (hosting, email, payments, analytics) — any vendor restrictions? |
| **105** | SEO crawling and third-party sites: legal review completed for ToS of target sites and your own AUP? |
| **106** | Outreach Agent (future): CAN-SPAM, GDPR email rules, opt-out handling — any constraints that affect **platform** design now? |
| **107** | AI-generated content (Mockup, future agents): copyright, NSFW, deepfake policy — platform-level moderation rules? |

### 10. Technical constraints (business-driven)

| # | Question |
|---|----------|
| **108** | PWA-only is mandated — confirm no native mobile apps in v1; any requirement for offline mode in SEO Agent? |
| **109** | “One shared database” — any regulatory requirement for data isolation by region (EU data in EU)? |
| **110** | Expected scale at 6 and 12 months: registered users, concurrent scans, paid subscribers — order of magnitude? |
| **111** | Uptime expectation for paying customers: best-effort vs. stated SLA? |
| **112** | Backup and disaster recovery: acceptable RPO/RTO from a business standpoint? |
| **113** | Must the platform be self-hostable or cloud-only SaaS? |
| **114** | Open API for customers in v1, or UI-only? |
| **115** | Export/portability: can users export all their data (reports, settings, billing history)? |

### 11. Go-to-market, branding, and positioning

| # | Question |
|---|----------|
| **116** | Product name for the **platform** (AgentPlatform is internal?) vs. individual agent names/customer-facing branding? |
| **117** | Is each agent marketed as a separate product or one suite with modules? |
| **118** | Referral program public terms: max rewards per user, marketing copy approval? |
| **119** | Launch strategy: waitlist, beta cohort, public launch — and is SEO Agent usable without the other three? |
| **120** | Competitor positioning: which products are you replacing (Ahrefs lite, Screaming Frog cloud, etc.) for SEO Agent messaging? |

---

## Quick reference — assignment by number

**Critical (10):** 9, 11, 15, 16, 20, 24, 25, 34, 52, 59

**Important (20):** 10, 12, 17, 18, 21, 26, 27, 29, 35, 36, 37, 40, 53, 54, 57, 60, 63, 66, 71, 76

**Later (90):** 1–8, 13–14, 19, 22–23, 28, 30–33, 38–39, 41–51, 55–56, 58, 61–62, 64–65, 67–70, 72–75, 77–91, 92–120

> **Note:** Questions **70** and **72** (index validation without GSC; competitive vs. owned scanning) are Later. Question **71** (domain verification requirement) is Important.

---

## Suggested workflow

1. **Founder answers Critical 10** → update `master_context.md` → architecture can begin.
2. **Founder answers Important 20** → update `master_context.md` → coding can begin.
3. **Later 90** → answer incrementally; for each deferred item, record a v1 default in `master_context.md`.

---

*Prioritized from `questions_for_founder.md`. Contradiction items A–G from that file map to Critical/Important questions above (e.g., A → 15/16, B → 20/21, C → 40/76/91, E → 70, F → 84).*
