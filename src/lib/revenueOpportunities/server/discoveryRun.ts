import { initRevenueAgents } from "@/lib/revenueOpportunities/agents";
import { newActivity } from "@/lib/revenueOpportunities/defaults";
import { runRevenueAgent } from "@/lib/revenueOpportunities/server/agentRunner";
import {
  applyDiscoveryDebrief,
  createDiscoverySession,
  getDiscoverySession,
  updateDiscoverySession,
} from "@/lib/revenueOpportunities/server/discoverySessions";
import { getOpportunity, updateOpportunity } from "@/lib/revenueOpportunities/server/opportunities";
import { createProposalFromDraft } from "@/lib/revenueOpportunities/server/proposals";
import {
  compileDiscoveryCallNotes,
  hasDiscoveryAnswers,
  resolveDiscoveryQuestionNotes,
} from "@/lib/revenueOpportunities/discovery/callNotes";
import type { DiscoveryDebriefBundle, DiscoveryPrepBundle, DiscoveryQuestionNote } from "@/lib/revenueOpportunities/types/discovery";
import type { RevenueDiscoverySession } from "@/lib/revenueOpportunities/types/discovery";
import type { ProposalDraftBundle } from "@/lib/revenueOpportunities/types/proposal";
import type { RevenueAgentRun } from "@/lib/revenueOpportunities/types/agentRun";
import type { RevenueOpportunityProposal } from "@/lib/revenueOpportunities/types/proposal";
import { AppUser } from "@/lib/types";

export async function runDiscoveryPrepForOpportunity(
  appUser: AppUser,
  opportunityId: string,
  scheduledAt?: string
): Promise<{ agentRun: RevenueAgentRun; session: RevenueDiscoverySession; opportunityUpdated: boolean }> {
  initRevenueAgents();
  const opportunity = await getOpportunity(appUser, opportunityId);

  const { run: agentRun, result } = await runRevenueAgent(
    appUser,
    "discovery_prep",
    { opportunity },
    {
      opportunityId,
      campaignId: opportunity.campaignId,
      inputSummary: `Discovery prep: ${opportunity.subject.name}`,
    }
  );

  const bundle = result as DiscoveryPrepBundle;
  const session = await createDiscoverySession(appUser, {
    opportunityId,
    opportunitySubjectName: opportunity.subject.name,
    scheduledAt,
    prepBrief: bundle.prepBrief,
    prepAgentRunId: agentRun.id,
  });

  await updateOpportunity(appUser, opportunityId, {
    workflow: {
      ...opportunity.workflow,
      pipelineStage: "discovery_call",
      nextAction: "Complete discovery call and capture notes",
    },
    activityLog: [
      ...opportunity.activityLog,
      newActivity(appUser, "discovery_prep", `Generated discovery call prep for ${opportunity.subject.name}`, {
        sessionId: session.id,
        agentRunId: agentRun.id,
      }),
    ],
  });

  return { agentRun, session, opportunityUpdated: true };
}

export async function runDiscoveryDebriefForSession(
  appUser: AppUser,
  sessionId: string,
  input: {
    callQuestionNotes?: DiscoveryQuestionNote[];
    additionalCallNotes?: string;
    /** @deprecated legacy freeform-only payload */
    callNotes?: string;
  }
): Promise<{ agentRun: RevenueAgentRun; session: RevenueDiscoverySession }> {
  initRevenueAgents();
  const session = await getDiscoverySession(appUser, sessionId);
  const opportunity = await getOpportunity(appUser, session.opportunityId);

  const questionNotes =
    input.callQuestionNotes ??
    resolveDiscoveryQuestionNotes(session.prepBrief, session.callQuestionNotes);
  const additionalNotes = input.additionalCallNotes ?? session.additionalCallNotes;
  const legacyNotes = input.callNotes;

  if (!hasDiscoveryAnswers(questionNotes, additionalNotes, legacyNotes)) {
    throw new Error("Capture at least one answer beside a prep question or add call notes");
  }

  await updateDiscoverySession(appUser, sessionId, {
    callQuestionNotes: questionNotes,
    additionalCallNotes: additionalNotes?.trim() || undefined,
  });

  const compiledLegacy = legacyNotes?.trim();
  const agentInput = compiledLegacy
    ? { opportunity, questionNotes: [], additionalNotes: compiledLegacy }
    : { opportunity, questionNotes, additionalNotes };

  const { run: agentRun, result } = await runRevenueAgent(
    appUser,
    "discovery_debrief",
    agentInput,
    {
      opportunityId: session.opportunityId,
      inputSummary: `Discovery debrief: ${opportunity.subject.name}`,
    }
  );

  const bundle = result as DiscoveryDebriefBundle;
  const compiledCallNotes =
    compiledLegacy ?? compileDiscoveryCallNotes(questionNotes, additionalNotes);
  const updated = await applyDiscoveryDebrief(appUser, sessionId, {
    callQuestionNotes: questionNotes,
    additionalCallNotes: additionalNotes,
    compiledCallNotes,
    debrief: bundle.debrief,
    agentRunId: agentRun.id,
  });

  await updateOpportunity(appUser, session.opportunityId, {
    activityLog: [
      ...opportunity.activityLog,
      newActivity(appUser, "discovery_debrief", `Logged discovery debrief for ${opportunity.subject.name}`, {
        sessionId,
        agentRunId: agentRun.id,
      }),
    ],
  });

  return { agentRun, session: updated };
}

export async function runProposalDraftForOpportunity(
  appUser: AppUser,
  opportunityId: string,
  discoverySessionId?: string
): Promise<{ agentRun: RevenueAgentRun; proposal: RevenueOpportunityProposal }> {
  initRevenueAgents();
  const opportunity = await getOpportunity(appUser, opportunityId);
  const session = discoverySessionId ? await getDiscoverySession(appUser, discoverySessionId) : undefined;

  const { run: agentRun, result } = await runRevenueAgent(
    appUser,
    "proposal_draft",
    { opportunity, debrief: session?.debrief },
    {
      opportunityId,
      campaignId: opportunity.campaignId,
      inputSummary: `Proposal draft: ${opportunity.subject.name}`,
    }
  );

  const draft = result as ProposalDraftBundle;
  const proposal = await createProposalFromDraft(appUser, {
    opportunityId,
    opportunitySubjectName: opportunity.subject.name,
    discoverySessionId: session?.id,
    draft,
    agentRunId: agentRun.id,
  });

  await updateOpportunity(appUser, opportunityId, {
    workflow: {
      ...opportunity.workflow,
      pipelineStage: "proposal",
      nextAction: "Review proposal draft and open agreement wizard",
    },
    activityLog: [
      ...opportunity.activityLog,
      newActivity(appUser, "proposal_draft", `Generated proposal draft: ${draft.title}`, {
        proposalId: proposal.id,
        agentRunId: agentRun.id,
      }),
    ],
  });

  return { agentRun, proposal };
}
