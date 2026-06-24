"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Alert, Button, Card, Label } from "@/components/ui/form";

type Lead = {
  id: string;
  email: string;
  shopName: string | null;
  shopUrl: string | null;
  emailSourceUrl: string | null;
  niche: string | null;
  leadType: string | null;
  confidenceScore: number | null;
  notes: string | null;
  createdAt: string;
};

export function LeadFinderDashboard({
  initialLeads,
  maxLeads,
}: {
  initialLeads: Lead[];
  maxLeads: number;
}) {
  const router = useRouter();
  const [leads, setLeads] = useState(initialLeads);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [discoverNiches, setDiscoverNiches] = useState(
    "dog mom mug\nnurse life shirt\nfunny cat POD\ngolf gift shop",
  );
  const [discoverTarget, setDiscoverTarget] = useState(20);
  const [discoverStatus, setDiscoverStatus] = useState<string | null>(null);
  const [discoverRunning, setDiscoverRunning] = useState(false);
  const [exporting, setExporting] = useState(false);

  const merchantCount = useMemo(
    () =>
      leads.filter(
        (l) => l.leadType !== "App company" && l.leadType !== "Vendor/service provider",
      ).length,
    [leads],
  );

  async function refresh() {
    const response = await fetch("/api/agents/pod-outreach/leads");
    if (!response.ok) return;
    const data = (await response.json()) as { leads: Lead[] };
    setLeads(
      data.leads.map((lead) => ({
        ...lead,
        createdAt: lead.createdAt,
      })),
    );
  }

  async function pollDiscoverJob(jobId: string) {
    const maxAttempts = 120;
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const response = await fetch(
        `/api/agents/pod-outreach/discover?jobId=${encodeURIComponent(jobId)}`,
      );
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to check discover status");
      }
      const data = (await response.json()) as {
        state: string;
        progress?: {
          phase: string;
          urlsTried: number;
          leadsSaved: number;
          target: number;
          duplicatesSkipped: number;
          noEmailSkipped: number;
          vendorSkipped: number;
        } | null;
        result?: {
          leadsSaved: number;
          urlsTried: number;
          duplicatesSkipped: number;
          noEmailSkipped: number;
          vendorSkipped: number;
          target: number;
        };
        error?: string | null;
      };

      if (data.progress) {
        setDiscoverStatus(
          `${data.progress.phase}: ${data.progress.leadsSaved}/${data.progress.target} leads (${data.progress.urlsTried} URLs, ${data.progress.duplicatesSkipped} dupes, ${data.progress.vendorSkipped} vendors skipped)`,
        );
      }

      if (data.state === "completed" && data.result) {
        setDiscoverStatus(
          `Done — ${data.result.leadsSaved}/${data.result.target} merchant leads saved (${data.result.duplicatesSkipped} duplicates skipped).`,
        );
        setSuccess(`Found ${data.result.leadsSaved} new merchant leads.`);
        await refresh();
        router.refresh();
        return;
      }

      if (data.state === "failed") {
        throw new Error(data.error ?? "Discover job failed");
      }
    }
    throw new Error("Discover timed out — check worker is running (npm run worker:dev)");
  }

  async function runDiscover(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDiscoverRunning(true);
    setError(null);
    setSuccess(null);
    setDiscoverStatus("Starting…");

    const niches = discoverNiches
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (niches.length === 0) {
      setError("Enter at least one niche keyword (one per line)");
      setDiscoverRunning(false);
      setDiscoverStatus(null);
      return;
    }

    try {
      const response = await fetch("/api/agents/pod-outreach/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ niches, target: discoverTarget }),
      });
      const data = (await response.json()) as { error?: string; jobId?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to start discover");
      }
      if (!data.jobId) throw new Error("No job id returned");
      setDiscoverStatus("Running — checking contact pages…");
      await pollDiscoverJob(data.jobId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Discover failed");
      setDiscoverStatus(null);
    } finally {
      setDiscoverRunning(false);
    }
  }

  async function exportCsv() {
    setExporting(true);
    setError(null);
    try {
      const response = await fetch("/api/agents/pod-outreach/leads/export");
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Export failed");
      }
      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match?.[1] ?? "leadfinder-export.csv";
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
      setSuccess(`Exported ${leads.length} leads to ${filename}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard"
          className="text-sm text-muted-foreground underline underline-offset-4"
        >
          ← Back to agents
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Lead Finder</h1>
        <p className="mt-1 text-muted-foreground">
          Discover targeted Shopify merchant emails by niche and export to CSV.
        </p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-muted-foreground">Total leads</p>
          <p className="mt-1 text-2xl font-semibold">
            {leads.length}/{maxLeads}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-muted-foreground">Merchant leads</p>
          <p className="mt-1 text-2xl font-semibold">{merchantCount}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted-foreground">Export</p>
          <Button
            type="button"
            className="mt-2"
            disabled={exporting || leads.length === 0}
            onClick={exportCsv}
          >
            {exporting ? "Exporting…" : "Export CSV"}
          </Button>
        </Card>
      </div>

      <Card>
        <h2 className="font-semibold">Find leads</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Serper finds Shopify stores; system extracts public merchant emails. Skips
          duplicates, app companies, and obvious vendors. Requires SERPER_API_KEY +
          worker (npm run worker:dev).
        </p>
        <form onSubmit={runDiscover} className="mt-4 space-y-3">
          <div>
            <Label htmlFor="discover-niches">Niche keywords (one per line)</Label>
            <textarea
              id="discover-niches"
              className="mt-1 min-h-[100px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={discoverNiches}
              onChange={(e) => setDiscoverNiches(e.target.value)}
              disabled={discoverRunning || leads.length >= maxLeads}
            />
          </div>
          <div>
            <Label htmlFor="discover-target">Target leads per run</Label>
            <input
              id="discover-target"
              type="number"
              min={1}
              max={20}
              className="mt-1 w-32 rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={discoverTarget}
              onChange={(e) => setDiscoverTarget(Number(e.target.value) || 20)}
              disabled={discoverRunning || leads.length >= maxLeads}
            />
          </div>
          <Button
            type="submit"
            disabled={discoverRunning || leads.length >= maxLeads}
          >
            {discoverRunning ? "Finding leads…" : `Find ${discoverTarget} leads`}
          </Button>
          {discoverStatus && (
            <p className="text-sm text-muted-foreground">{discoverStatus}</p>
          )}
        </form>
      </Card>

      <Card>
        <h2 className="font-semibold">Lead list</h2>
        <div className="mt-4 max-h-[600px] space-y-2 overflow-y-auto">
          {leads.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No leads yet. Run Find leads above.
            </p>
          )}
          {leads.map((lead) => (
            <div
              key={lead.id}
              className="rounded-lg border border-border p-3 text-sm"
            >
              <p className="truncate font-medium">{lead.shopName ?? "—"}</p>
              <p className="truncate text-muted-foreground">{lead.email}</p>
              <p className="truncate text-xs text-muted-foreground">
                {lead.emailSourceUrl ?? "—"}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
