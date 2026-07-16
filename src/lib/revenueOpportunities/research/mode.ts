import { aiUsesMock } from "@/lib/ai/mockAi";
import { tavilyAvailable } from "@/lib/search/tavilyClient";

export function revenueResearchLive(): boolean {
  return tavilyAvailable() && !aiUsesMock();
}

export function revenueResearchMode(): "live" | "mock" {
  return revenueResearchLive() ? "live" : "mock";
}
