/* Phase 0 — minimal service worker placeholder.
 * Full PWA caching strategy: docs/ARCHITECTURE.md §7
 */
const CACHE_NAME = "agentplatform-shell-v0";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  // Network-only for Phase 0 — no API caching
  event.respondWith(fetch(event.request));
});
