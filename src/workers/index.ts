/**
 * Background worker entrypoint (Phase 0 placeholder).
 * BullMQ job processors for SEO crawls ship in Phase 2.
 *
 * Run: npm run worker:dev
 */
const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

console.info("[worker] AgentPlatform worker starting (Phase 0 placeholder)");
console.info(`[worker] Redis target: ${REDIS_URL}`);
console.info("[worker] No job processors registered yet — see docs/ROADMAP.md Phase 2");

function shutdown(signal: string) {
  console.info(`[worker] Received ${signal}, shutting down`);
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

// Keep process alive in dev
setInterval(() => {
  // heartbeat — replaced by BullMQ worker in Phase 2
}, 60_000);
