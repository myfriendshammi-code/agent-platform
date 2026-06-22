import { NextResponse } from "next/server";
import { DEFAULT_DISCOVER_TARGET } from "@/lib/lead-finder/constants";
import { isSerperConfigured } from "@/lib/lead-finder/serper";
import {
  enqueuePodDiscover,
  getPodDiscoverJob,
  type DiscoverProgress,
  type DiscoverResult,
} from "@/lib/queue/pod-discover";
import { requirePodOutreachAdmin } from "@/lib/pod-outreach/admin-guard";

export async function POST(request: Request) {
  const authResult = await requirePodOutreachAdmin();
  if (authResult.error) return authResult.error;

  if (!isSerperConfigured()) {
    return NextResponse.json(
      {
        error: "Serper not configured. Set SERPER_API_KEY in .env",
      },
      { status: 503 },
    );
  }

  const body = (await request.json()) as { niches?: string[]; target?: number };
  const niches = body.niches?.map((n) => n.trim()).filter(Boolean) ?? [];
  if (niches.length === 0) {
    return NextResponse.json({ error: "Provide at least one niche keyword" }, { status: 400 });
  }
  if (niches.length > 5) {
    return NextResponse.json({ error: "Maximum 5 niches per run" }, { status: 400 });
  }

  const target =
    typeof body.target === "number" && body.target > 0
      ? Math.min(body.target, 20)
      : DEFAULT_DISCOVER_TARGET;

  try {
    const jobId = await enqueuePodDiscover({
      userId: authResult.session.user.id,
      niches,
      target,
    });
    return NextResponse.json({ jobId, target });
  } catch (error) {
    console.error("[pod-discover] enqueue failed", error);
    return NextResponse.json(
      { error: "Failed to start discover job. Is Redis running?" },
      { status: 503 },
    );
  }
}

export async function GET(request: Request) {
  const authResult = await requirePodOutreachAdmin();
  if (authResult.error) return authResult.error;

  const jobId = new URL(request.url).searchParams.get("jobId");
  if (!jobId) {
    return NextResponse.json({ error: "jobId query parameter required" }, { status: 400 });
  }

  const job = await getPodDiscoverJob(jobId);
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  if (job.data.userId !== authResult.session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const state = await job.getState();
  const progress = (job.progress as DiscoverProgress | number | undefined) ?? null;
  const result = job.returnvalue as DiscoverResult | undefined;
  const failedReason = job.failedReason;

  return NextResponse.json({
    jobId,
    state,
    progress: typeof progress === "object" ? progress : null,
    result: state === "completed" ? result : null,
    error: state === "failed" ? failedReason : null,
  });
}
