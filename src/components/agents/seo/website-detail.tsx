"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, Button, Card } from "@/components/ui/form";

type Website = {
  id: string;
  domain: string;
  displayName: string | null;
  verificationStatus: string;
  verificationToken: string | null;
};

type ScanRow = {
  id: string;
  status: string;
  pagesCrawled: number;
  pagesLimit: number;
  createdAt: string;
  report: { id: string } | null;
};

export function WebsiteDetail({
  website,
  scans,
  scanUsage,
  metaSnippet,
}: {
  website: Website;
  scans: ScanRow[];
  scanUsage: { used: number; limit: number; remaining: number };
  metaSnippet: string | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<"verify" | "scan" | "delete" | null>(null);

  async function verify() {
    setLoading("verify");
    setError(null);
    const response = await fetch(`/api/agents/seo/websites/${website.id}/verify`, {
      method: "POST",
    });
    setLoading(null);
    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setError(data.error ?? "Verification failed");
      return;
    }
    router.refresh();
  }

  async function runScan() {
    setLoading("scan");
    setError(null);
    const response = await fetch("/api/agents/seo/scans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ websiteId: website.id }),
    });
    setLoading(null);
    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setError(data.error ?? "Scan failed");
      return;
    }
    const data = (await response.json()) as { scan: { id: string } };
    router.push(`/dashboard/agents/seo/scans/${data.scan.id}`);
    router.refresh();
  }

  async function remove() {
    if (!confirm("Remove this website?")) return;
    setLoading("delete");
    await fetch(`/api/agents/seo/websites/${website.id}`, { method: "DELETE" });
    setLoading(null);
    router.push("/dashboard/agents/seo");
    router.refresh();
  }

  const isVerified = website.verificationStatus === "verified";

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/agents/seo"
        className="text-sm text-muted-foreground underline underline-offset-4"
      >
        ← Back to SEO Agent
      </Link>

      <div>
        <h1 className="text-2xl font-bold">{website.displayName ?? website.domain}</h1>
        <p className="text-muted-foreground">{website.domain}</p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {!isVerified && metaSnippet && (
        <Card>
          <h2 className="font-semibold">Verify ownership</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Add this meta tag inside the &lt;head&gt; of your homepage, publish, then click Verify.
          </p>
          <code className="mt-3 block overflow-x-auto rounded bg-muted p-3 text-xs">{metaSnippet}</code>
          <Button className="mt-4" onClick={verify} disabled={loading === "verify"}>
            {loading === "verify" ? "Checking..." : "Verify ownership"}
          </Button>
        </Card>
      )}

      {isVerified && (
        <Card>
          <h2 className="font-semibold">Run SEO scan</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Full audit: sitemap, robots.txt, schema, broken links, index/noindex. Uses{" "}
            {scanUsage.remaining} of {scanUsage.limit} scans remaining this month.
          </p>
          <Button
            className="mt-4"
            onClick={runScan}
            disabled={loading === "scan" || scanUsage.remaining <= 0}
          >
            {loading === "scan" ? "Starting..." : "Run full scan"}
          </Button>
          {scanUsage.remaining <= 0 && (
            <p className="mt-2 text-sm text-muted-foreground">
              Monthly scan limit reached. Resets on the 1st of next month (UTC).
            </p>
          )}
        </Card>
      )}

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Scan history</h2>
          <Button variant="ghost" onClick={remove} disabled={loading === "delete"}>
            Remove website
          </Button>
        </div>
        {scans.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No scans yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {scans.map((scan) => (
              <li key={scan.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <p className="font-medium capitalize">{scan.status}</p>
                  <p className="text-muted-foreground">
                    {new Date(scan.createdAt).toLocaleString()} · {scan.pagesCrawled}/{scan.pagesLimit}{" "}
                    pages
                  </p>
                </div>
                {(scan.status === "completed" || scan.status === "failed") && (
                  <Link href={`/dashboard/agents/seo/scans/${scan.id}`}>
                    <Button variant="secondary">View</Button>
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
