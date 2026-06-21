import { prisma } from "@/lib/db";
import { emitAgentEvent } from "@/lib/agents/events";

export async function recordAgentActivation(input: {
  userId: string;
  agentSlug: string;
  eventType: string;
  eventRefId?: string;
}): Promise<boolean> {
  const agent = await prisma.agent.findUnique({ where: { slug: input.agentSlug } });
  if (!agent) return false;

  const existing = await prisma.agentActivation.findUnique({
    where: { userId_agentId: { userId: input.userId, agentId: agent.id } },
  });

  if (existing) return false;

  await prisma.agentActivation.create({
    data: {
      userId: input.userId,
      agentId: agent.id,
      eventType: input.eventType,
      eventRefId: input.eventRefId ?? null,
    },
  });

  await emitAgentEvent({
    userId: input.userId,
    agentSlug: input.agentSlug,
    eventType: input.eventType,
    eventRefId: input.eventRefId,
  });

  return true;
}
