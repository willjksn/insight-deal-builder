import { initRevenueAgents } from "@/lib/revenueOpportunities/agents";
import { runRevenueAgent } from "@/lib/revenueOpportunities/server/agentRunner";
import { applyThreadClassification, getEmailThread } from "@/lib/revenueOpportunities/server/emailThreads";
import type { EmailClassificationResult } from "@/lib/revenueOpportunities/types/emailThread";
import type { RevenueAgentRun } from "@/lib/revenueOpportunities/types/agentRun";
import type { RevenueEmailThread } from "@/lib/revenueOpportunities/types/emailThread";
import { AppUser } from "@/lib/types";

export async function classifyInboxThread(
  appUser: AppUser,
  threadId: string
): Promise<{ agentRun: RevenueAgentRun; thread: RevenueEmailThread }> {
  initRevenueAgents();
  const thread = await getEmailThread(appUser, threadId);

  const { run: agentRun, result } = await runRevenueAgent(
    appUser,
    "email_receptionist",
    { thread },
    {
      inputSummary: `Classify: ${thread.subject}`,
    }
  );

  const classification = result as EmailClassificationResult;
  const updated = await applyThreadClassification(appUser, threadId, classification, agentRun.id);
  return { agentRun, thread: updated };
}
