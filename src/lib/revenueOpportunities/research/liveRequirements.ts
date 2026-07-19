import { aiUsesMock } from "@/lib/ai/mockAi";
import { tavilyAvailable } from "@/lib/search/tavilyClient";

/** Human-readable blockers for live revenue research (no dummy prospects). */
export function liveResearchRequirementsMessage(): string {
  const missing: string[] = [];
  if (aiUsesMock()) {
    missing.push("set SCOUT_USE_MOCK_AI=false");
  }
  if (!tavilyAvailable()) {
    missing.push("set TAVILY_API_KEY");
  }
  missing.push("ensure Gemini is configured (GEMINI_API_KEY or Vertex via FIREBASE_SERVICE_ACCOUNT_JSON)");
  return `Live deep research is required (dummy prospects are disabled). Fix: ${missing.join("; ")}.`;
}

export function researchIntegrationStatus(): "live" | "not_configured" {
  return !aiUsesMock() && tavilyAvailable() ? "live" : "not_configured";
}
