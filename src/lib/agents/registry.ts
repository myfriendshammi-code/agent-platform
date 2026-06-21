import type { Agent } from "@prisma/client";
import type { AgentModule } from "@/agents/types";
import { prisma } from "@/lib/db";

export function toAgentModule(agent: Agent): AgentModule {
  return {
    slug: agent.slug,
    name: agent.name,
    description: agent.description,
    status: agent.status,
    iconKey: agent.iconKey,
    sortOrder: agent.sortOrder,
    dashboardPath: `/dashboard/agents/${agent.slug}`,
  };
}

export async function listAgents(): Promise<AgentModule[]> {
  const agents = await prisma.agent.findMany({
    orderBy: { sortOrder: "asc" },
  });
  return agents.map(toAgentModule);
}

export async function getAgentBySlug(slug: string): Promise<AgentModule | null> {
  const agent = await prisma.agent.findUnique({ where: { slug } });
  return agent ? toAgentModule(agent) : null;
}

export function isAgentNavigable(agent: AgentModule): boolean {
  return agent.status === "active";
}
