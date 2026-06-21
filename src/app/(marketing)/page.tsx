import Link from "next/link";
import { auth } from "@/lib/auth/config";
import { Button } from "@/components/ui/form";

export default async function MarketingPage() {
  const session = await auth();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="text-lg font-semibold tracking-tight">AgentPlatform</span>
          <div className="flex gap-3">
            {session?.user?.emailVerified ? (
              <Link href="/dashboard">
                <Button>Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="secondary">Sign in</Button>
                </Link>
                <Link href="/register">
                  <Button>Register</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl flex-1 flex-col justify-center px-6 py-16">
        <p className="mb-3 text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Multi-agent SaaS PWA
        </p>
        <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
          One platform. One login. Many agents.
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted-foreground">
          SEO, Lead Finder, Outreach, and Mockup agents — one account, per-agent subscriptions,
          free tier on every agent.
        </p>
        <div className="mt-10 flex flex-wrap gap-4">
          <Link href="/register">
            <Button>Get started free</Button>
          </Link>
          <Link href="/api/health">
            <Button variant="secondary">Health check</Button>
          </Link>
        </div>
      </main>

      <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
        AgentPlatform · Phase 1 — Platform foundation
      </footer>
    </div>
  );
}
