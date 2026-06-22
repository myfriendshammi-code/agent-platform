/** Target outreach-ready leads per discover run (default). */
export const DEFAULT_DISCOVER_TARGET = 20;

/** Stop after this many shop URLs processed (email not found counts). */
export const MAX_URLS_TRIED = 120;

/** Serper organic results per query. */
export const SEARCH_RESULTS_PER_QUERY = 10;

/** Delay between HTTP fetches to store pages (ms). */
export const FETCH_DELAY_MS = 400;

/** Timeout per page fetch (ms). */
export const FETCH_TIMEOUT_MS = 8_000;

export const CONTACT_PATHS = [
  "/pages/contact",
  "/contact",
  "/pages/contact-us",
  "/pages/about-us",
  "/about",
  "/",
] as const;

/** Domains that appear in widgets/scripts — never treat as merchant email. */
export const BLOCKED_EMAIL_DOMAINS = new Set([
  "sentry.io",
  "wixpress.com",
  "example.com",
  "email.com",
  "domain.com",
  "test.com",
  "intercom.io",
  "intercom-mail.com",
  "zendesk.com",
  "freshdesk.com",
  "hubspot.com",
  "google.com",
  "googlemail.com",
  "facebook.com",
  "instagram.com",
  "twitter.com",
  "youtube.com",
  "shopify.com",
  "myshopify.com",
  "shopifyemail.com",
  "crisp.chat",
  "tawk.to",
  "drift.com",
  "mailchimp.com",
  "klaviyo.com",
  "gorgias.com",
  "placeholder.com",
  "w3.org",
  "schema.org",
]);

/** Local parts that indicate system/no-reply addresses. */
export const BLOCKED_LOCAL_PARTS = new Set([
  "noreply",
  "no-reply",
  "donotreply",
  "do-not-reply",
  "mailer-daemon",
  "postmaster",
  "bounce",
  "unsubscribe",
]);

/** Prefer these local parts when multiple valid emails exist. */
export const PREFERRED_LOCAL_PARTS = [
  "hello",
  "contact",
  "info",
  "support",
  "sales",
  "team",
  "shop",
  "orders",
  "help",
] as const;
