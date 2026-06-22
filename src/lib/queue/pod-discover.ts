import { Queue, Worker, type ConnectionOptions, type Job } from "bullmq";
import { runLeadDiscover, type DiscoverProgress, type DiscoverResult } from "@/lib/lead-finder/run-discover";

export const POD_DISCOVER_QUEUE = "pod-discover";

export type PodDiscoverJobData = {
  userId: string;
  niches: string[];
  target: number;
};

function getConnection(): ConnectionOptions {
  return {
    url: process.env.REDIS_URL ?? "redis://localhost:6379",
    maxRetriesPerRequest: null,
  };
}

export function getPodDiscoverQueue(): Queue<PodDiscoverJobData> {
  return new Queue(POD_DISCOVER_QUEUE, { connection: getConnection() });
}

export async function enqueuePodDiscover(data: PodDiscoverJobData): Promise<string> {
  const queue = getPodDiscoverQueue();
  const job = await queue.add("run", data, {
    removeOnComplete: 50,
    removeOnFail: 25,
  });
  return job.id ?? "";
}

export async function getPodDiscoverJob(jobId: string): Promise<Job<PodDiscoverJobData> | undefined> {
  const queue = getPodDiscoverQueue();
  return queue.getJob(jobId);
}

export function createPodDiscoverWorker(): Worker<PodDiscoverJobData> {
  return new Worker(
    POD_DISCOVER_QUEUE,
    async (job) => {
      const result = await runLeadDiscover(
        job.data.userId,
        job.data.niches,
        job.data.target,
        async (progress: DiscoverProgress) => {
          await job.updateProgress(progress);
        },
      );
      return result;
    },
    { connection: getConnection() },
  );
}

export type { DiscoverProgress, DiscoverResult };
