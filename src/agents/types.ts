export type AgentModuleStatus = "active" | "coming_soon" | "disabled";

export type AgentModule = {
  slug: string;
  name: string;
  description: string;
  status: AgentModuleStatus;
  iconKey: string;
  sortOrder: number;
  dashboardPath: string;
};

export type AgentActivationEvent = {
  userId: string;
  agentSlug: string;
  eventType: string;
  eventRefId?: string;
};

export type AgentEventHandler = (event: AgentActivationEvent) => void | Promise<void>;
