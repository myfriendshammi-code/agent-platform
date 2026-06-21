import type { AgentActivationEvent } from "@/agents/types";

type Listener = (event: AgentActivationEvent) => void | Promise<void>;

const listeners = new Map<string, Set<Listener>>();

export function onAgentEvent(eventType: string, listener: Listener) {
  if (!listeners.has(eventType)) {
    listeners.set(eventType, new Set());
  }
  listeners.get(eventType)!.add(listener);
}

export async function emitAgentEvent(event: AgentActivationEvent) {
  const handlers = listeners.get(event.eventType) ?? new Set();
  const wildcard = listeners.get("*") ?? new Set();

  for (const handler of [...handlers, ...wildcard]) {
    await handler(event);
  }
}
