import type { AgentDefinition } from "@/lib/revenueOpportunities/agents/instruction";
import type { RevenueAgentCatalogEntry, RevenueAgentName } from "@/lib/revenueOpportunities/types/agentRun";
import { revenueResearchLive } from "@/lib/revenueOpportunities/research/mode";

const registry = new Map<RevenueAgentName, AgentDefinition<unknown, unknown>>();

export function registerAgent<TInput, TOutput>(definition: AgentDefinition<TInput, TOutput>): void {
  registry.set(definition.name as RevenueAgentName, definition as AgentDefinition<unknown, unknown>);
}

export function getAgent(name: RevenueAgentName): AgentDefinition<unknown, unknown> | undefined {
  return registry.get(name);
}

export function listRegisteredAgents(): RevenueAgentCatalogEntry[] {
  return Array.from(registry.values()).map((def) => ({
    name: def.name as RevenueAgentName,
    version: def.version,
    label: def.instruction.role,
    description: def.instruction.goal,
    phase: agentPhase(def.name as RevenueAgentName),
    status: agentStatus(def.name as RevenueAgentName),
    tools: def.instruction.tools,
  }));
}

function agentPhase(name: RevenueAgentName): number {
  switch (name) {
    case "quality_review":
    case "revision":
      return 3;
    case "img_research":
    case "stormi_research":
    case "campaign_concept":
      return 4;
    case "outreach_draft":
      return 5;
    default:
      return 10;
  }
}

function agentStatus(name: RevenueAgentName): RevenueAgentCatalogEntry["status"] {
  switch (name) {
    case "quality_review":
    case "revision":
      return "stub";
    case "img_research":
    case "stormi_research":
    case "campaign_concept":
      return revenueResearchLive() ? "live" : "stub";
    case "outreach_draft":
      return "planned";
    default:
      return "planned";
  }
}

export function requireAgent(name: RevenueAgentName): AgentDefinition<unknown, unknown> {
  const agent = getAgent(name);
  if (!agent) throw new Error(`Agent not registered: ${name}`);
  return agent;
}
