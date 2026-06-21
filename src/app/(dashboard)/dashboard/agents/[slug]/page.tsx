import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Button, Card } from "@/components/ui/form";
import { getAgentBySlug, isAgentNavigable } from "@/lib/agents/registry";

export default async function AgentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const agent = await getAgentBySlug(slug);

  if (!agent) {
    notFound();
  }

  if (isAgentNavigable(agent)) {
    redirect(agent.dashboardPath);
  }

  return (
    <div className="max-w-2xl">
      <Link href="/dashboard" className="text-sm text-muted-foreground underline underline-offset-4">
        ← Back to agents
      </Link>
      <Card className="mt-4">
        <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          {agent.status.replace("_", " ")}
        </p>
        <h1 className="mt-2 text-2xl font-bold">{agent.name}</h1>
        <p className="mt-2 text-muted-foreground">{agent.description}</p>
        <p className="mt-6 text-sm text-muted-foreground">
          This agent is not available yet. Implementation is planned for a future roadmap phase.
        </p>
        <Link href="/dashboard" className="mt-6 inline-block">
          <Button variant="secondary">Back to dashboard</Button>
        </Link>
      </Card>
    </div>
  );
}
