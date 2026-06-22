"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { Alert, Button, Card, Input, Label } from "@/components/ui/form";

type LeadStatus = "draft" | "sent" | "replied" | "interested";

type Lead = {
  id: string;
  email: string;
  name: string | null;
  shopName: string | null;
  shopUrl: string | null;
  niche: string | null;
  status: LeadStatus;
  subject: string | null;
  bodyHtml: string | null;
  bodyText: string | null;
  sentAt: string | null;
  createdAt: string;
};

type Usage = {
  sentToday: number;
  limit: number;
  remaining: number;
};

const STATUS_LABELS: Record<LeadStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  replied: "Replied",
  interested: "Interested",
};

const STATUS_COLORS: Record<LeadStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  replied: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  interested: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
};

export function PodOutreachDashboard({
  initialLeads,
  initialUsage,
  smtpConfigured,
  maxLeads,
}: {
  initialLeads: Lead[];
  initialUsage: Usage;
  smtpConfigured: boolean;
  maxLeads: number;
}) {
  const router = useRouter();
  const [leads, setLeads] = useState(initialLeads);
  const [usage, setUsage] = useState(initialUsage);
  const [selectedId, setSelectedId] = useState<string | null>(initialLeads[0]?.id ?? null);
  const [filter, setFilter] = useState<LeadStatus | "all">("all");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [discoverNiches, setDiscoverNiches] = useState(
    "dog mom mug\nnurse life shirt\nfunny cat POD\ngolf gift shop",
  );
  const [discoverStatus, setDiscoverStatus] = useState<string | null>(null);
  const [discoverRunning, setDiscoverRunning] = useState(false);
  const [editSubject, setEditSubject] = useState(initialLeads[0]?.subject ?? "");
  const [editBody, setEditBody] = useState(initialLeads[0]?.bodyText ?? "");

  const selectedLead = useMemo(
    () => leads.find((lead) => lead.id === selectedId) ?? null,
    [leads, selectedId],
  );

  const filteredLeads = useMemo(() => {
    if (filter === "all") return leads;
    return leads.filter((lead) => lead.status === filter);
  }, [filter, leads]);

  const statusCounts = useMemo(() => {
    return leads.reduce(
      (acc, lead) => {
        acc[lead.status] = (acc[lead.status] ?? 0) + 1;
        return acc;
      },
      {} as Record<LeadStatus, number>,
    );
  }, [leads]);

  const syncSelectedEditor = useCallback((lead: Lead | null) => {
    setEditSubject(lead?.subject ?? "");
    setEditBody(lead?.bodyText ?? "");
  }, []);

  async function refresh() {
    const response = await fetch("/api/agents/pod-outreach/leads");
    if (!response.ok) return;
    const data = (await response.json()) as {
      leads: Lead[];
      usage: Usage;
    };
    setLeads(data.leads);
    setUsage(data.usage);
    const current = data.leads.find((l) => l.id === selectedId) ?? data.leads[0] ?? null;
    setSelectedId(current?.id ?? null);
    syncSelectedEditor(current);
  }

  function selectLead(lead: Lead) {
    setSelectedId(lead.id);
    syncSelectedEditor(lead);
    setError(null);
    setSuccess(null);
  }

  async function importCsv(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const form = event.currentTarget;
    const fileInput = form.elements.namedItem("csv") as HTMLInputElement;
    const file = fileInput.files?.[0];
    if (!file) {
      setError("Choose a CSV file");
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/agents/pod-outreach/leads/import", {
      method: "POST",
      body: formData,
    });

    setLoading(false);
    const data = (await response.json()) as {
      error?: string;
      imported?: number;
      duplicates?: number;
      total?: number;
    };

    if (!response.ok) {
      setError(data.error ?? "Import failed");
      return;
    }

    setSuccess(
      `Imported ${data.imported ?? 0} leads (${data.duplicates ?? 0} duplicates skipped). Total: ${data.total ?? 0}/${maxLeads}.`,
    );
    form.reset();
    await refresh();
    router.refresh();
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
          noEmailSkipped: number;
        } | null;
        result?: { leadsSaved: number; urlsTried: number; noEmailSkipped: number; target: number };
        error?: string | null;
      };

      if (data.progress) {
        setDiscoverStatus(
          `${data.progress.phase}: ${data.progress.leadsSaved}/${data.progress.target} leads (${data.progress.urlsTried} URLs checked, ${data.progress.noEmailSkipped} no email)`,
        );
      }

      if (data.state === "completed" && data.result) {
        setDiscoverStatus(
          `Done — ${data.result.leadsSaved}/${data.result.target} leads saved (${data.result.urlsTried} URLs, ${data.result.noEmailSkipped} contact-form only).`,
        );
        setSuccess(
          `Found ${data.result.leadsSaved} outreach-ready leads with draft emails. Review and send below.`,
        );
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
        body: JSON.stringify({ niches, target: 20 }),
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

  async function regenerateAll() {
    setLoading(true);
    setError(null);
    const response = await fetch("/api/agents/pod-outreach/leads/generate", { method: "POST" });
    setLoading(false);
    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setError(data.error ?? "Regeneration failed");
      return;
    }
    setSuccess("Regenerated emails for all leads.");
    await refresh();
  }

  async function saveEdits() {
    if (!selectedLead) return;
    setLoading(true);
    setError(null);

    const response = await fetch(`/api/agents/pod-outreach/leads/${selectedLead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject: editSubject,
        bodyText: editBody,
        bodyHtml: editBody.split("\n").map((line) => `<p>${line || "&nbsp;"}</p>`).join(""),
      }),
    });

    setLoading(false);
    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setError(data.error ?? "Save failed");
      return;
    }
    setSuccess("Draft saved.");
    await refresh();
  }

  async function sendLead(mode: "send" | "draft") {
    if (!selectedLead) return;
    setLoading(true);
    setError(null);
    setSuccess(null);

    await saveEditsQuietly();

    const response = await fetch(`/api/agents/pod-outreach/leads/${selectedLead.id}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode }),
    });

    setLoading(false);
    const data = (await response.json()) as {
      error?: string;
      message?: string;
      usage?: Usage;
    };

    if (!response.ok) {
      setError(data.error ?? "Send failed");
      return;
    }

    if (data.usage) setUsage(data.usage);
    setSuccess(
      mode === "send"
        ? `Email sent to ${selectedLead.email}.`
        : (data.message ?? "Saved as draft."),
    );
    await refresh();
  }

  async function saveEditsQuietly() {
    if (!selectedLead) return;
    await fetch(`/api/agents/pod-outreach/leads/${selectedLead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject: editSubject,
        bodyText: editBody,
      }),
    });
  }

  async function updateStatus(status: LeadStatus) {
    if (!selectedLead) return;
    setLoading(true);
    setError(null);

    const response = await fetch(`/api/agents/pod-outreach/leads/${selectedLead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    setLoading(false);
    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setError(data.error ?? "Status update failed");
      return;
    }
    setSuccess(`Marked as ${STATUS_LABELS[status]}.`);
    await refresh();
  }

  async function copyEmail() {
    const text = `To: ${selectedLead?.email}\nSubject: ${editSubject}\n\n${editBody}`;
    await navigator.clipboard.writeText(text);
    setSuccess("Copied to clipboard — paste into Gmail compose.");
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
        <h1 className="mt-2 text-2xl font-bold">POD Outreach</h1>
        <p className="mt-1 text-muted-foreground">
          Find Shopify leads automatically or import CSV — review draft emails and send up to{" "}
          {usage.limit}/day for MockupExpo sales.
        </p>
      </div>

      {!smtpConfigured && (
        <Alert variant="info">
          SMTP not configured — sends log to the server console in dev. Set POD_SMTP_* env vars
          for Gmail/SMTP delivery, or copy drafts to Gmail manually.
        </Alert>
      )}

      {error && <Alert variant="error">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <p className="text-sm text-muted-foreground">Leads</p>
          <p className="mt-1 text-2xl font-semibold">
            {leads.length}/{maxLeads}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-muted-foreground">Sent today</p>
          <p className="mt-1 text-2xl font-semibold">
            {usage.sentToday}/{usage.limit}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-muted-foreground">Drafts</p>
          <p className="mt-1 text-2xl font-semibold">{statusCounts.draft ?? 0}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted-foreground">Interested</p>
          <p className="mt-1 text-2xl font-semibold">{statusCounts.interested ?? 0}</p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="font-semibold">Find leads (automatic)</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Serper finds Shopify stores; system extracts public emails and writes draft
            outreach. Target: 20 leads per run. Requires SERPER_API_KEY env + worker running.
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
            <Button
              type="submit"
              disabled={discoverRunning || loading || leads.length >= maxLeads}
            >
              {discoverRunning ? "Finding leads…" : "Find 20 leads"}
            </Button>
            {discoverStatus && (
              <p className="text-sm text-muted-foreground">{discoverStatus}</p>
            )}
          </form>
        </Card>

        <Card>
          <h2 className="font-semibold">Import leads (CSV)</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Columns: email, name, shop_name, shop_url, niche (header row required).
          </p>
          <form onSubmit={importCsv} className="mt-4 space-y-3">
            <div>
              <Label htmlFor="csv">CSV file</Label>
              <Input id="csv" name="csv" type="file" accept=".csv,text/csv" required />
            </div>
            <Button type="submit" disabled={loading || leads.length >= maxLeads}>
              Import & generate emails
            </Button>
          </form>
          {leads.length > 0 && (
            <Button
              type="button"
              variant="secondary"
              className="mt-3"
              disabled={loading}
              onClick={regenerateAll}
            >
              Regenerate all emails
            </Button>
          )}
        </Card>

        <Card>
          <h2 className="font-semibold">Quick filters</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {(["all", "draft", "sent", "replied", "interested"] as const).map((key) => (
              <Button
                key={key}
                type="button"
                variant={filter === key ? "primary" : "secondary"}
                onClick={() => setFilter(key)}
              >
                {key === "all" ? "All" : STATUS_LABELS[key]} (
                {key === "all" ? leads.length : (statusCounts[key] ?? 0)})
              </Button>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <h2 className="font-semibold">Lead list</h2>
          <div className="mt-4 max-h-[520px] space-y-2 overflow-y-auto">
            {filteredLeads.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No leads yet. Click Find leads or import a CSV to start.
              </p>
            )}
            {filteredLeads.map((lead) => (
              <button
                key={lead.id}
                type="button"
                onClick={() => selectLead(lead)}
                className={`w-full rounded-lg border p-3 text-left transition-colors ${
                  selectedId === lead.id ? "border-primary bg-muted" : "border-border hover:bg-muted/50"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{lead.shopName ?? lead.email}</p>
                    <p className="truncate text-xs text-muted-foreground">{lead.email}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${STATUS_COLORS[lead.status]}`}
                  >
                    {STATUS_LABELS[lead.status]}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-3">
          <h2 className="font-semibold">Review & send</h2>
          {!selectedLead ? (
            <p className="mt-4 text-sm text-muted-foreground">Select a lead to review their email.</p>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
                <p>
                  <span className="text-muted-foreground">To:</span> {selectedLead.email}
                </p>
                {selectedLead.shopUrl && (
                  <p className="mt-1 truncate">
                    <span className="text-muted-foreground">Shop:</span>{" "}
                    <a
                      href={selectedLead.shopUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="underline"
                    >
                      {selectedLead.shopUrl}
                    </a>
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="body">Email body</Label>
                <textarea
                  id="body"
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  rows={12}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" disabled={loading} onClick={saveEdits}>
                  Save draft
                </Button>
                <Button type="button" variant="secondary" disabled={loading} onClick={copyEmail}>
                  Copy for Gmail
                </Button>
                <Button
                  type="button"
                  disabled={loading || selectedLead.status !== "draft" || usage.remaining <= 0}
                  onClick={() => sendLead("send")}
                >
                  Send via SMTP ({usage.remaining} left today)
                </Button>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium">Update status</p>
                <div className="flex flex-wrap gap-2">
                  {(["draft", "sent", "replied", "interested"] as const).map((status) => (
                    <Button
                      key={status}
                      type="button"
                      variant={selectedLead.status === status ? "primary" : "secondary"}
                      disabled={loading}
                      onClick={() => updateStatus(status)}
                    >
                      {STATUS_LABELS[status]}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
