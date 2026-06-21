"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, Button, Card, Input, Label } from "@/components/ui/form";

type WebsiteRow = {
  id: string;
  domain: string;
  displayName: string | null;
  verificationStatus: string;
  seoScans: { id: string; status: string; createdAt: string }[];
};

type Usage = {
  limits: { websites_max: number; scans_per_month: number; pages_per_scan: number };
  scans: { used: number; limit: number; remaining: number };
  websites: { used: number; limit: number; remaining: number };
};

export function SeoDashboard({
  initialWebsites,
  initialUsage,
}: {
  initialWebsites: WebsiteRow[];
  initialUsage: Usage;
}) {
  const router = useRouter();
  const [websites, setWebsites] = useState(initialWebsites);
  const [usage, setUsage] = useState(initialUsage);
  const [domain, setDomain] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [verifySnippet, setVerifySnippet] = useState<string | null>(null);

  async function refresh() {
    const [sitesRes, usageRes] = await Promise.all([
      fetch("/api/agents/seo/websites"),
      fetch("/api/agents/seo/usage"),
    ]);
    if (sitesRes.ok) {
      const data = (await sitesRes.json()) as { websites: WebsiteRow[] };
      setWebsites(data.websites);
    }
    if (usageRes.ok) {
      setUsage((await usageRes.json()) as Usage);
    }
  }

  async function addWebsite(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setVerifySnippet(null);

    const response = await fetch("/api/agents/seo/websites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain }),
    });

    setLoading(false);

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setError(data.error ?? "Failed to add website");
      return;
    }

    const data = (await response.json()) as {
      verification?: { snippet: string };
    };
    setDomain("");
    setVerifySnippet(data.verification?.snippet ?? null);
    await refresh();
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">SEO Agent</h1>
        <p className="mt-1 text-muted-foreground">
          Add websites, verify ownership, and run SEO audits on the free tier.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-muted-foreground">Websites</p>
          <p className="mt-1 text-2xl font-semibold">
            {usage.websites.used}/{usage.websites.limit}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-muted-foreground">Scans this month</p>
          <p className="mt-1 text-2xl font-semibold">
            {usage.scans.used}/{usage.scans.limit}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-muted-foreground">Pages per scan</p>
          <p className="mt-1 text-2xl font-semibold">{usage.limits.pages_per_scan}</p>
        </Card>
      </div>

      <Card>
        <h2 className="font-semibold">Add website</h2>
        <form onSubmit={addWebsite} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Label htmlFor="domain">Domain</Label>
            <Input
              id="domain"
              placeholder="example.com"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              required
            />
          </div>
          <Button type="submit" disabled={loading || usage.websites.remaining <= 0}>
            {loading ? "Adding..." : "Add website"}
          </Button>
        </form>
        {error && (
          <div className="mt-3">
            <Alert variant="error">{error}</Alert>
          </div>
        )}
        {verifySnippet && (
          <div className="mt-3">
            <Alert variant="success">
              Website added. Add this meta tag to your homepage &lt;head&gt;, then open the website
              to verify:
              <code className="mt-2 block overflow-x-auto rounded bg-muted p-2 text-xs">
                {verifySnippet}
              </code>
            </Alert>
          </div>
        )}
      </Card>

      <div>
        <h2 className="mb-4 font-semibold">Your websites</h2>
        {websites.length === 0 ? (
          <p className="text-sm text-muted-foreground">No websites yet. Add one above to get started.</p>
        ) : (
          <div className="space-y-3">
            {websites.map((site) => (
              <Card key={site.id} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">{site.displayName ?? site.domain}</p>
                  <p className="text-sm text-muted-foreground">{site.domain}</p>
                  <p className="mt-1 text-xs capitalize text-muted-foreground">
                    {site.verificationStatus.replace("_", " ")}
                    {site.seoScans[0] && ` · Last scan: ${site.seoScans[0].status}`}
                  </p>
                </div>
                <Link href={`/dashboard/agents/seo/websites/${site.id}`}>
                  <Button variant="secondary">Manage</Button>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
