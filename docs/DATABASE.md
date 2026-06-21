# AgentPlatform — Database Design

**Version:** 1.0  
**ORM:** Prisma  
**Engine:** PostgreSQL 16  
**Source of truth:** `master_context.md` + `ARCHITECTURE.md`

---

## 1. Design principles

1. **Single shared database** — all agents and platform tables coexist; agent data prefixed or namespaced by `agent_id` where shared tables are used.
2. **Solo user v1, teams-ready** — every row owned by `user_id`; optional nullable `organization_id` for future team features without migration pain.
3. **Per-agent entitlements** — subscriptions and usage are scoped to `(user_id, agent_id)`, not platform-wide.
4. **Append-only ledger** — points and payment events are immutable audit trails.
5. **Idempotent webhooks** — provider event IDs are unique constraints.
6. **Activation = first success** — `agent_activations` enforces one row per `(user_id, agent_id)`.

---

## 2. Entity relationship overview

```
organizations (future)
    │
users ─────────────────────────────────────────────────────────┐
    │                                                          │
    ├── accounts / sessions (auth)                             │
    ├── websites (projects)                                    │
    │       └── seo_scans → seo_scan_pages, seo_issues         │
    │              └── seo_reports                             │
    ├── subscriptions (per agent)                              │
    ├── usage_counters (per agent, per period)                 │
    ├── agent_activations                                      │
    ├── point_balances / point_transactions                    │
    ├── referral_codes / referrals                             │
    └── agent_data_transfers                                   │
                                                               │
agents (catalog) ◄─────────────────────────────────────────────┘
agent_plans
feature_flags
audit_logs
payment_webhook_events
```

---

## 3. Conventions

| Convention | Rule |
|------------|------|
| Primary keys | `UUID` (`gen_random_uuid()`) |
| Timestamps | `created_at`, `updated_at` (timestamptz UTC) |
| Soft delete | `deleted_at` on user-facing entities where recovery needed |
| Enums | Postgres enums or Prisma enums for fixed sets |
| JSON | `jsonb` for flexible agent payloads, webhook raw bodies |
| Naming | `snake_case` tables and columns |

---

## 4. Core platform tables

### 4.1 `organizations` (future teams — empty in v1 UI)

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name | VARCHAR(255) | |
| slug | VARCHAR(100) UNIQUE | |
| billing_email | VARCHAR(255) | Future |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### 4.2 `users`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| organization_id | UUID FK NULL | Future team owner; NULL v1 |
| email | VARCHAR(255) UNIQUE | |
| email_verified_at | TIMESTAMPTZ NULL | Required before agent use |
| password_hash | VARCHAR(255) NULL | NULL if OAuth-only later |
| name | VARCHAR(255) NULL | |
| role | ENUM | `user`, `support`, `admin`, `super_admin` — default `user` |
| referral_code_id | UUID FK NULL | User's own referral code |
| referred_by_user_id | UUID FK NULL | Who referred them |
| stripe_customer_id | VARCHAR(255) NULL | |
| paypal_payer_id | VARCHAR(255) NULL | |
| status | ENUM | `active`, `suspended`, `deleted` |
| deleted_at | TIMESTAMPTZ NULL | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**Indexes:** `email`, `stripe_customer_id`, `organization_id`

### 4.3 Auth.js tables

#### `accounts`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| user_id | UUID FK → users | |
| type | VARCHAR | oauth provider type |
| provider | VARCHAR | `credentials`, `google`, ... |
| provider_account_id | VARCHAR | |
| refresh_token | TEXT NULL | |
| access_token | TEXT NULL | |
| expires_at | INT NULL | |
| token_type | VARCHAR NULL | |
| scope | VARCHAR NULL | |
| id_token | TEXT NULL | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**Unique:** `(provider, provider_account_id)`

#### `sessions`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| session_token | VARCHAR UNIQUE | |
| user_id | UUID FK → users | |
| expires | TIMESTAMPTZ | |
| impersonator_id | UUID FK NULL | Admin impersonation |
| created_at | TIMESTAMPTZ | |

#### `verification_tokens`

| Column | Type | Notes |
|--------|------|-------|
| identifier | VARCHAR | email |
| token | VARCHAR UNIQUE | |
| expires | TIMESTAMPTZ | |

### 4.4 `email_verification_tokens`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| user_id | UUID FK | |
| token_hash | VARCHAR UNIQUE | Store hash only |
| expires_at | TIMESTAMPTZ | |
| used_at | TIMESTAMPTZ NULL | |
| created_at | TIMESTAMPTZ | |

### 4.5 `password_reset_tokens`

Same shape as `email_verification_tokens`.

---

## 5. Agent catalog

### 5.1 `agents`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| slug | VARCHAR(50) UNIQUE | `seo`, `lead-finder`, `outreach`, `mockup` |
| name | VARCHAR(100) | Display name |
| description | TEXT | |
| status | ENUM | `active`, `coming_soon`, `disabled` |
| sort_order | INT | Dashboard card order |
| icon_key | VARCHAR(50) | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**Seed data:**

| slug | status (v1) |
|------|-------------|
| seo | active |
| lead-finder | coming_soon |
| outreach | coming_soon |
| mockup | coming_soon |

### 5.2 `agent_plans`

Defines free and paid tier limits per agent (founder Q52 for SEO free).

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| agent_id | UUID FK | |
| tier | ENUM | `free`, `pro` |
| name | VARCHAR(100) | e.g. "SEO Pro" |
| price_cents | INT | 0 for free; 900 for SEO Pro placeholder |
| currency | CHAR(3) | `USD` default |
| billing_interval | ENUM | `month`, `year` |
| limits | JSONB | Agent-specific limit object |
| stripe_price_id | VARCHAR NULL | |
| paypal_plan_id | VARCHAR NULL | |
| is_active | BOOLEAN | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**SEO `limits` JSON example (free):**

```json
{
  "websites_max": 3,
  "scans_per_month": 10,
  "pages_per_scan": 100,
  "scheduled_scans": false,
  "report_exports_per_month": null
}
```

**Unique:** `(agent_id, tier)`

### 5.3 `agent_activations`

Tracks first successful use (founder Q20).

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| user_id | UUID FK | |
| agent_id | UUID FK | |
| event_type | VARCHAR(100) | e.g. `seo.scan.completed` |
| event_ref_id | UUID NULL | e.g. first scan id |
| activated_at | TIMESTAMPTZ | |
| created_at | TIMESTAMPTZ | |

**Unique:** `(user_id, agent_id)` — one activation per agent per user

---

## 6. Websites (projects — founder Q59)

### 6.1 `websites`

Project = website/domain.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| user_id | UUID FK | Owner (v1) |
| organization_id | UUID FK NULL | Future |
| domain | VARCHAR(255) | Normalized: `mockupexpo.com` |
| display_name | VARCHAR(255) NULL | |
| verification_status | ENUM | `pending`, `verified`, `failed` |
| verification_method | ENUM NULL | `dns_txt`, `meta_tag`, `html_file` |
| verification_token | VARCHAR NULL | |
| verified_at | TIMESTAMPTZ NULL | |
| is_active | BOOLEAN | Default true |
| deleted_at | TIMESTAMPTZ NULL | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**Unique:** `(user_id, domain)` where `deleted_at IS NULL`

**Index:** `(user_id)`, `(domain)`

---

## 7. Subscriptions and billing

### 7.1 `subscriptions`

One active subscription row per `(user_id, agent_id)`.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| user_id | UUID FK | |
| organization_id | UUID FK NULL | Future billing owner |
| agent_id | UUID FK | |
| agent_plan_id | UUID FK | Current plan tier |
| provider | ENUM | `stripe`, `paypal` |
| provider_subscription_id | VARCHAR UNIQUE | |
| provider_customer_id | VARCHAR NULL | |
| status | ENUM | `trialing`, `active`, `past_due`, `canceled`, `unpaid` |
| current_period_start | TIMESTAMPTZ | |
| current_period_end | TIMESTAMPTZ | |
| cancel_at_period_end | BOOLEAN | Default false |
| canceled_at | TIMESTAMPTZ NULL | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**Unique (partial):** one `active`/`trialing`/`past_due` per `(user_id, agent_id)` — enforce in app or partial index

### 7.2 `payment_webhook_events`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| provider | ENUM | `stripe`, `paypal` |
| provider_event_id | VARCHAR UNIQUE | Idempotency |
| event_type | VARCHAR(100) | |
| payload | JSONB | Raw event |
| processed_at | TIMESTAMPTZ NULL | |
| error | TEXT NULL | |
| created_at | TIMESTAMPTZ | |

### 7.3 `invoices` (optional sync from Stripe)

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| user_id | UUID FK | |
| subscription_id | UUID FK NULL | |
| provider | ENUM | |
| provider_invoice_id | VARCHAR UNIQUE | |
| amount_cents | INT | |
| currency | CHAR(3) | |
| status | ENUM | `draft`, `open`, `paid`, `void` |
| invoice_pdf_url | VARCHAR NULL | |
| created_at | TIMESTAMPTZ | |

---

## 8. Usage metering

Per-agent counters (architecture default: separate meters per agent).

### 8.1 `usage_periods`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| user_id | UUID FK | |
| agent_id | UUID FK | |
| period | CHAR(7) | `YYYY-MM` calendar month UTC |
| created_at | TIMESTAMPTZ | |

**Unique:** `(user_id, agent_id, period)`

### 8.2 `usage_counters`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| usage_period_id | UUID FK | |
| metric | VARCHAR(50) | `scans`, `pages_crawled`, `report_exports` |
| count | INT | Default 0 |
| updated_at | TIMESTAMPTZ | |

**Unique:** `(usage_period_id, metric)`

**Website count** enforced by `COUNT(websites WHERE user_id AND deleted_at IS NULL)` against plan limit, not a counter row.

---

## 9. Points and referrals

### 9.1 `point_balances`

| Column | Type | Notes |
|--------|------|-------|
| user_id | UUID PK FK | |
| balance | INT | Denormalized; >= 0 |
| updated_at | TIMESTAMPTZ | |

### 9.2 `point_transactions` (append-only ledger)

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| user_id | UUID FK | |
| amount | INT | Positive = credit, negative = debit |
| type | ENUM | See below |
| reference_type | VARCHAR NULL | `agent_activation`, `referral`, `redemption` |
| reference_id | UUID NULL | |
| description | VARCHAR(255) | |
| idempotency_key | VARCHAR UNIQUE NULL | Prevent duplicate awards |
| created_by_user_id | UUID NULL | Admin adjust |
| created_at | TIMESTAMPTZ | |

**`type` enum:** `referral_signup`, `referral_paid`, `agent_activation`, `redemption`, `admin_adjust`, `expiration`, `clawback`

**Rule:** No transaction type may map to subscription discount (founder + Q76).

### 9.3 `referral_codes`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| user_id | UUID FK UNIQUE | One code per user |
| code | VARCHAR(20) UNIQUE | |
| is_active | BOOLEAN | |
| created_at | TIMESTAMPTZ | |

### 9.4 `referrals`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| referrer_user_id | UUID FK | |
| referred_user_id | UUID FK UNIQUE | One referrer per new user |
| referral_code_id | UUID FK | |
| status | ENUM | `pending`, `qualified`, `rewarded`, `clawed_back` |
| qualified_at | TIMESTAMPTZ NULL | |
| created_at | TIMESTAMPTZ | |

### 9.5 `point_redemptions`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| user_id | UUID FK | |
| redemption_type | VARCHAR(50) | `extra_scans`, `premium_trial`, ... |
| points_spent | INT | |
| metadata | JSONB | Agent, duration, etc. |
| created_at | TIMESTAMPTZ | |

---

## 10. Cross-agent data transfers (founder Q11)

### 10.1 `agent_data_transfers`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| user_id | UUID FK | Who authorized |
| source_agent_id | UUID FK | |
| target_agent_id | UUID FK | |
| payload_type | VARCHAR(50) | e.g. `leads` |
| payload | JSONB | Typed blob |
| status | ENUM | `pending`, `accepted`, `failed` |
| accepted_at | TIMESTAMPTZ NULL | |
| created_at | TIMESTAMPTZ | |

---

## 11. SEO Agent tables

### 11.1 `seo_scans`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| user_id | UUID FK | |
| website_id | UUID FK | |
| status | ENUM | `queued`, `running`, `completed`, `failed`, `canceled` |
| scan_type | ENUM | `full`, `sitemap`, `robots`, `schema`, `links`, `index` |
| pages_limit | INT | Cap at run time from entitlement |
| pages_crawled | INT | Default 0 |
| started_at | TIMESTAMPTZ NULL | |
| completed_at | TIMESTAMPTZ NULL | |
| error_message | TEXT NULL | |
| created_at | TIMESTAMPTZ | |

**Indexes:** `(website_id, created_at DESC)`, `(user_id, status)`

### 11.2 `seo_scan_pages`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| scan_id | UUID FK | |
| url | TEXT | |
| status_code | INT NULL | |
| crawled_at | TIMESTAMPTZ NULL | |
| meta_robots | VARCHAR NULL | index/noindex signal |
| created_at | TIMESTAMPTZ | |

**Index:** `(scan_id)`

### 11.3 `seo_issues`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| scan_id | UUID FK | |
| website_id | UUID FK | Denormalized for history queries |
| page_url | TEXT NULL | NULL for site-wide issues |
| category | ENUM | `sitemap`, `robots`, `schema`, `broken_link`, `indexing`, `other` |
| severity | ENUM | `critical`, `warning`, `info` |
| code | VARCHAR(50) | Machine-readable issue code |
| message | TEXT | Human-readable |
| fix_instruction | TEXT | "Exact fix" copy |
| metadata | JSONB NULL | |
| created_at | TIMESTAMPTZ | |

**Index:** `(scan_id, category)`, `(website_id, created_at DESC)`

### 11.4 `seo_reports`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| scan_id | UUID FK UNIQUE | One report per scan |
| user_id | UUID FK | |
| website_id | UUID FK | |
| summary | JSONB | Counts by severity/category |
| storage_url | VARCHAR NULL | PDF in object storage if exported |
| created_at | TIMESTAMPTZ | |

### 11.5 `seo_sitemaps` (generated/cache)

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| website_id | UUID FK | |
| source | ENUM | `detected`, `generated` |
| content | TEXT NULL | XML or URL reference |
| url_count | INT | |
| validated_at | TIMESTAMPTZ | |
| created_at | TIMESTAMPTZ | |

---

## 12. Admin and platform ops

### 12.1 `audit_logs`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| actor_user_id | UUID FK NULL | Admin user |
| target_user_id | UUID FK NULL | |
| action | VARCHAR(100) | `points.adjust`, `impersonate.start`, ... |
| metadata | JSONB | |
| ip_address | INET NULL | |
| created_at | TIMESTAMPTZ | |

**Index:** `(target_user_id, created_at DESC)`, `(actor_user_id, created_at DESC)`

### 12.2 `feature_flags`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| key | VARCHAR(100) UNIQUE | e.g. `agent.seo.enabled` |
| enabled | BOOLEAN | |
| agent_id | UUID FK NULL | |
| metadata | JSONB NULL | |
| updated_at | TIMESTAMPTZ | |

---

## 13. Future team tables (schema only, v1 unused)

### 13.1 `organization_members`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| organization_id | UUID FK | |
| user_id | UUID FK | |
| role | ENUM | `owner`, `admin`, `member` |
| invited_at | TIMESTAMPTZ | |
| joined_at | TIMESTAMPTZ NULL | |

**Unique:** `(organization_id, user_id)`

### 13.2 `organization_invites`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| organization_id | UUID FK | |
| email | VARCHAR(255) | |
| role | ENUM | |
| token_hash | VARCHAR | |
| expires_at | TIMESTAMPTZ | |
| accepted_at | TIMESTAMPTZ NULL | |
| created_at | TIMESTAMPTZ | |

---

## 14. Prisma schema sketch

Full implementation lives in `prisma/schema.prisma` when coding starts. Structural outline:

```prisma
// generator + datasource postgres

enum UserRole { user support admin super_admin }
enum AgentStatus { active coming_soon disabled }
enum PlanTier { free pro }
enum SubscriptionStatus { trialing active past_due canceled unpaid }
enum PaymentProvider { stripe paypal }

model User { ... }
model Organization { ... }
model Agent { ... }
model AgentPlan { ... }
model AgentActivation { ... }
model Website { ... }
model Subscription { ... }
model UsagePeriod { ... }
model UsageCounter { ... }
model PointBalance { ... }
model PointTransaction { ... }
model SeoScan { ... }
model SeoIssue { ... }
model SeoReport { ... }
// ... auth models, transfers, audit, etc.
```

---

## 15. Migration order (recommended)

1. Core: `organizations`, `users`, auth tables
2. Catalog: `agents`, `agent_plans` (+ seed)
3. Platform: `websites`, `subscriptions`, `payment_webhook_events`
4. Metering: `usage_periods`, `usage_counters`
5. Points: `referral_codes`, `referrals`, `point_balances`, `point_transactions`
6. SEO: `seo_scans`, `seo_scan_pages`, `seo_issues`, `seo_reports`, `seo_sitemaps`
7. Ops: `audit_logs`, `feature_flags`, `agent_data_transfers`
8. Future: `organization_members`, `organization_invites`

---

## 16. Key queries (reference)

### Resolve entitlement

```sql
-- Pseudocode: tier = active subscription plan OR free plan for agent
SELECT ap.tier, ap.limits
FROM agent_plans ap
JOIN agents a ON a.id = ap.agent_id
LEFT JOIN subscriptions s ON s.agent_id = a.id
  AND s.user_id = :userId
  AND s.status IN ('active', 'trialing', 'past_due')
LEFT JOIN agent_plans sp ON sp.id = s.agent_plan_id
WHERE a.slug = :agentSlug
  AND ap.tier = COALESCE(sp.tier, 'free');
```

### Check scan quota

```sql
SELECT count FROM usage_counters uc
JOIN usage_periods up ON up.id = uc.usage_period_id
WHERE up.user_id = :userId
  AND up.agent_id = :agentId
  AND up.period = to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM')
  AND uc.metric = 'scans';
```

### Record activation (idempotent)

```sql
INSERT INTO agent_activations (user_id, agent_id, event_type, event_ref_id, activated_at)
VALUES (...)
ON CONFLICT (user_id, agent_id) DO NOTHING
RETURNING id;
```

---

## 17. Data retention (v1 default)

| Data | Retention |
|------|-----------|
| `seo_scans` + issues | 12 months rolling |
| `audit_logs` | 24 months |
| `payment_webhook_events` | 7 years (tax/dispute) |
| Deleted users | Anonymize PII after 30-day grace; keep ledger IDs |

Confirm in `master_context.md` when founder decides.

---

## 18. Open schema decisions

| Item | Current default | Update when |
|------|-----------------|-------------|
| SEO Pro limits | 25 sites / 100 scans / 500 pages | Founder sets Q36/Q60 |
| Report export counter | Not enforced | Q52 export limit decided |
| Referral qualify trigger | Email verify + first paid sub | Referral rules finalized |
| Point expiration | No expiration | Founder decides Q85 |
