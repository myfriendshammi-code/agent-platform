import Link from "next/link";
import type { AgentModule } from "@/agents/types";
import { Button } from "@/components/ui/form";
import { cn } from "@/lib/utils";

const statusLabel: Record<AgentModule["status"], string> = {
  active: "Open",
  coming_soon: "Coming soon",
  disabled: "Unavailable",
};

export function AgentCard({ agent }: { agent: AgentModule }) {
  const isOpen = agent.status === "active";

  return (
    <div className="flex flex-col rounded-xl border border-border bg-background p-5 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold">{agent.name}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{agent.description}</p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
            agent.status === "coming_soon" && "bg-muted text-muted-foreground",
            agent.status === "active" && "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
            agent.status === "disabled" && "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
          )}
        >
          {agent.status.replace("_", " ")}
        </span>
      </div>

      <div className="mt-auto pt-4">
        <Link href={agent.dashboardPath}>
          <Button className="w-full" variant={isOpen ? "primary" : "secondary"}>
            {isOpen ? statusLabel[agent.status] : "View details"}
          </Button>
        </Link>
      </div>
    </div>
  );
}
