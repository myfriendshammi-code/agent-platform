import { createPodDiscoverWorker } from "@/lib/queue/pod-discover";
import { createSeoScanWorker } from "@/lib/queue/seo-scan";

/**
 * Background worker — processes SEO scan and POD discover jobs from Redis/BullMQ.
 * Run: npm run worker:dev
 */
console.info("[worker] AgentPlatform worker starting");
console.info(`[worker] Redis: ${process.env.REDIS_URL ?? "redis://localhost:6379"}`);

const seoWorker = createSeoScanWorker();
const podDiscoverWorker = createPodDiscoverWorker();

const workers = [
  { name: "seo-scans", worker: seoWorker },
  { name: "pod-discover", worker: podDiscoverWorker },
];

for (const { name, worker } of workers) {
  worker.on("completed", (job) => {
    console.info(`[worker] ${name} job ${job.id} completed`);
  });
  worker.on("failed", (job, error) => {
    console.error(`[worker] ${name} job ${job?.id} failed`, error);
  });
}

function shutdown(signal: string) {
  console.info(`[worker] Received ${signal}, shutting down`);
  Promise.all(workers.map(({ worker }) => worker.close())).finally(() => process.exit(0));
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

console.info("[worker] Listening on queues: seo-scans, pod-discover");
