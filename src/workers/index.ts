import { createSeoScanWorker } from "@/lib/queue/seo-scan";

/**
 * Background worker — processes SEO scan jobs from Redis/BullMQ.
 * Run: npm run worker:dev
 */
console.info("[worker] AgentPlatform worker starting");
console.info(`[worker] Redis: ${process.env.REDIS_URL ?? "redis://localhost:6379"}`);

const worker = createSeoScanWorker();

worker.on("completed", (job) => {
  console.info(`[worker] SEO scan job ${job.id} completed`);
});

worker.on("failed", (job, error) => {
  console.error(`[worker] SEO scan job ${job?.id} failed`, error);
});

function shutdown(signal: string) {
  console.info(`[worker] Received ${signal}, shutting down`);
  worker.close().finally(() => process.exit(0));
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

console.info("[worker] Listening for SEO scan jobs on queue: seo-scans");
