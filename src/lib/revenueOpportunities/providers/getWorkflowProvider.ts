import type { WorkflowProvider } from "@/lib/revenueOpportunities/providers";
import { mockN8nWorkflowProvider, liveN8nWorkflowProvider } from "@/lib/revenueOpportunities/providers/n8nProvider";
import { resolveN8nMode, type RevenueN8nMode } from "@/lib/revenueOpportunities/n8n/config";

export function getWorkflowProvider(): { provider: WorkflowProvider; mode: RevenueN8nMode } {
  const mode = resolveN8nMode();
  if (mode === "live") return { provider: liveN8nWorkflowProvider, mode };
  if (mode === "mock") return { provider: mockN8nWorkflowProvider, mode };
  return { provider: mockN8nWorkflowProvider, mode };
}
