import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const timestamp = new Date().toISOString();
  let database: "connected" | "disconnected" = "disconnected";
  let schemaVersion: string | null = null;

  try {
    const meta = await prisma.systemMeta.findUnique({
      where: { key: "schema_version" },
    });
    database = "connected";
    schemaVersion = meta?.value ?? null;
  } catch {
    database = "disconnected";
  }

  const status = database === "connected" ? "ok" : "degraded";

  return NextResponse.json(
    {
      status,
      service: "agentplatform",
      phase: "0",
      timestamp,
      checks: {
        database,
        schemaVersion,
      },
    },
    { status: status === "ok" ? 200 : 503 },
  );
}
