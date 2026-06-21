"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Alert, Button, Card } from "@/components/ui/form";

type Issue = {
  id: string;
  pageUrl: string | null;
  category: string;
  severity: string;
  code: string;
  message: string;
  fixInstruction: string;
};

type ScanData = {
  id: string;
  status: string;
  pagesCrawled: number;
  pagesLimit: number;
  errorMessage: string | null;
  website: { domain: string; displayName: string | null };
  issues: Issue[];
  report: { summary: Record<string, unknown> } | null;
};

export function ScanReport({ scanId }: { scanId: string }) {
  const [scan, setScan] = useState<ScanData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      const response = await fetch(`/api/agents/seo/scans/${scanId}`);
      if (!response.ok) {
        if (active) setError("Scan not found");
        return;
      }
      const data = (await response.json()) as ScanData;
      if (active) setScan(data);
    }

    load();
    const interval = setInterval(load, 3000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [scanId]);

  if (error) {
    return <Alert variant="error">{error}</Alert>;
  }

  if (!scan) {
    return <p className="text-sm text-muted-foreground">Loading scan...</p>;
  }

  const summary = scan.report?.summary as
    | { total?: number; critical?: number; warning?: number; pagesCrawled?: number }
    | undefined;

  const isRunning = scan.status === "queued" || scan.status === "running";

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/agents/seo"
        className="text-sm text-muted-foreground underline underline-offset-4"
      >
        ← Back to SEO Agent
      </Link>

      <div>
        <h1 className="text-2xl font-bold">SEO Report</h1>
        <p className="text-muted-foreground">
          {scan.website.displayName ?? scan.website.domain} ·{" "}
          <span className="capitalize">{scan.status}</span>
        </p>
      </div>

      {isRunning && (
        <Alert variant="info">
          Scan in progress… This page refreshes automatically. Ensure{" "}
          <code className="text-xs">npm run worker:dev</code> is running.
        </Alert>
      )}

      {scan.status === "failed" && (
        <Alert variant="error">{scan.errorMessage ?? "Scan failed"}</Alert>
      )}

      {scan.status === "completed" && (
        <>
          <div className="grid gap-4 sm:grid-cols-4">
            <Card>
              <p className="text-sm text-muted-foreground">Issues</p>
              <p className="text-2xl font-semibold">{summary?.total ?? scan.issues.length}</p>
            </Card>
            <Card>
              <p className="text-sm text-muted-foreground">Critical</p>
              <p className="text-2xl font-semibold text-red-600">{summary?.critical ?? 0}</p>
            </Card>
            <Card>
              <p className="text-sm text-muted-foreground">Warnings</p>
              <p className="text-2xl font-semibold">{summary?.warning ?? 0}</p>
            </Card>
            <Card>
              <p className="text-sm text-muted-foreground">Pages crawled</p>
              <p className="text-2xl font-semibold">{scan.pagesCrawled}</p>
            </Card>
          </div>

          <div className="space-y-4">
            <h2 className="font-semibold">Issues & fixes</h2>
            {scan.issues.length === 0 ? (
              <p className="text-sm text-muted-foreground">No issues found. Great job!</p>
            ) : (
              scan.issues.map((issue) => (
                <Card key={issue.id}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize">
                      {issue.severity}
                    </span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{issue.category}</span>
                    <span className="font-mono text-xs text-muted-foreground">{issue.code}</span>
                  </div>
                  <p className="mt-2 font-medium">{issue.message}</p>
                  {issue.pageUrl && (
                    <p className="mt-1 text-xs text-muted-foreground break-all">{issue.pageUrl}</p>
                  )}
                  <p className="mt-3 text-sm">
                    <span className="font-medium">Fix: </span>
                    {issue.fixInstruction}
                  </p>
                </Card>
              ))
            )}
          </div>
        </>
      )}

      {isRunning && (
        <Button variant="secondary" onClick={() => window.location.reload()}>
          Refresh now
        </Button>
      )}
    </div>
  );
}
