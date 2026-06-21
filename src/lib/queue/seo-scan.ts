import { Queue, Worker, type ConnectionOptions } from "bullmq";
import { runSeoScan } from "@/agents/seo/run-scan";

export const SEO_SCAN_QUEUE = "seo-scans";

function getConnection(): ConnectionOptions {
  return {
    url: process.env.REDIS_URL ?? "redis://localhost:6379",
    maxRetriesPerRequest: null,
  };
}

export function getSeoScanQueue(): Queue {
  return new Queue(SEO_SCAN_QUEUE, { connection: getConnection() });
}

export function createSeoScanWorker(): Worker {
  return new Worker(
    SEO_SCAN_QUEUE,
    async (job) => {
      const scanId = job.data.scanId as string;
      await runSeoScan(scanId);
    },
    { connection: getConnection() },
  );
}

export async function enqueueSeoScan(scanId: string): Promise<void> {
  const queue = getSeoScanQueue();
  await queue.add("run", { scanId }, { removeOnComplete: 100, removeOnFail: 50 });
}
