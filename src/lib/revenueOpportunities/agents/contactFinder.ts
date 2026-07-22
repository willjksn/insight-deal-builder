import type { AgentDefinition, AgentRunResult } from "@/lib/revenueOpportunities/agents/instruction";
import type {
  OpportunityContactSuggestion,
  RevenueOpportunity,
} from "@/lib/revenueOpportunities/types/opportunity";
import { generateContactSuggestion } from "@/lib/revenueOpportunities/contacts/generateContactSuggestion";

export interface ContactFinderInput {
  opportunity: RevenueOpportunity;
}

export interface ContactFinderOutput {
  suggestion: OpportunityContactSuggestion | null;
}

const AGENT_NAME = "contact_finder";
const VERSION = "0.1.0";

export const contactFinderAgent: AgentDefinition<ContactFinderInput, ContactFinderOutput> = {
  name: AGENT_NAME,
  version: VERSION,
  instruction: {
    agentName: AGENT_NAME,
    version: VERSION,
    role: "Contact agent",
    goal: "Find or verify a decision-maker contact for an opportunity, for human approval before use.",
    context: "Suggests a contact only — never overwrites the opportunity's contact without approval.",
    tools: ["tavily", "gemini"],
    constraints: [
      "Never invent emails, phones, or people",
      "Only use contact details present in sources",
      "Suggestion requires human approval before it is applied",
    ],
    process: [
      "Search for owner/marketing/partnerships contact",
      "Extract a single best contact with its source",
      "Return a suggestion for review",
    ],
    outputSchema: "ContactFinderOutput { suggestion }",
    successCriteria: ["Real, sourced contact detail", "Clear rationale"],
    failureConditions: ["No verifiable contact found"],
    fallback: ["Suggest the subject's public email/phone"],
  },
  async execute(input: ContactFinderInput): Promise<AgentRunResult<ContactFinderOutput>> {
    const { suggestion, usedLiveAi, model } = await generateContactSuggestion(input.opportunity);
    return {
      agentName: AGENT_NAME,
      version: VERSION,
      output: { suggestion },
      confidence: {
        confidenceScore: suggestion ? Math.round((suggestion.confidence ?? 0.5) * 100) : 0,
        confidenceReasons: suggestion
          ? [`Suggested ${suggestion.contact.email ?? suggestion.contact.phone ?? "contact"}`]
          : ["No verifiable contact found"],
        assumptions: usedLiveAi ? [] : ["Rule-based suggestion (no live AI)"],
        missingInformation: suggestion ? [] : ["No decision-maker contact located in sources"],
      },
      evidence: [],
      model,
      estimatedCostUsd: usedLiveAi && model === "gemini" ? 0.02 : 0,
    };
  },
};
