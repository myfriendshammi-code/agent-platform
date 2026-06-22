import { AgentCard } from "@/components/dashboard/agent-card";
import { listAgents } from "@/lib/agents/registry";
import { auth } from "@/lib/auth/config";
import { hasMinimumRole } from "@/lib/auth/roles";
import { UserRole } from "@prisma/client";

export default async function DashboardPage() {
  const session = await auth();
  const isAdmin = session?.user?.role
    ? hasMinimumRole(session.user.role, UserRole.admin)
    : false;

  const agents = await listAgents();
  const visibleAgents = agents.filter(
    (agent) => agent.slug !== "pod-outreach" || isAdmin,
  );

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Your agents</h1>
        <p className="mt-1 text-muted-foreground">
          Every agent includes a free tier. Paid upgrades arrive in a later phase.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
        {visibleAgents.map((agent) => (
          <AgentCard key={agent.slug} agent={agent} />
        ))}
      </div>
    </div>
  );
}
