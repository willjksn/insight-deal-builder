import { authHeaders } from "@/lib/scriptWriter/apiClient";
import type { RevenueCampaign, RevenueCampaignCreateInput, RevenueCampaignUpdateInput } from "@/lib/revenueOpportunities/types/campaign";
import type {
  RevenueDashboardSummary,
  RevenueOpportunity,
  RevenueOpportunityCreateInput,
  RevenueOpportunityUpdateInput,
} from "@/lib/revenueOpportunities/types/opportunity";
import type { RevenueFeatureStatus, RevenuePipelineStage, RevenueRejectionReason } from "@/lib/revenueOpportunities/types";
import type { RevenueAgentCatalogEntry, RevenueAgentName, RevenueAgentRun } from "@/lib/revenueOpportunities/types/agentRun";
import type { RevenueCampaignRun } from "@/lib/revenueOpportunities/types/campaignRun";
import type { RevenueOutreachActivity } from "@/lib/revenueOpportunities/types/outreach";
import type { RevenueEmailThread } from "@/lib/revenueOpportunities/types/emailThread";
import type { RevenueDiscoverySession, DiscoveryQuestionNote } from "@/lib/revenueOpportunities/types/discovery";
import type { RevenueOpportunityProposal } from "@/lib/revenueOpportunities/types/proposal";
import type { RevenueWorkflowCatalogEntry, RevenueWorkflowRun } from "@/lib/revenueOpportunities/types/workflowRun";
import type { Agreement } from "@/lib/types";

async function parseJson<T>(res: Response): Promise<T> {
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? res.statusText);
  return data;
}

function revenueDisabled(res: Response): boolean {
  return res.status === 503;
}

export async function revenueGetStatus(getToken: () => Promise<string | null>) {
  const res = await fetch("/api/revenue/status", { headers: await authHeaders(getToken) });
  return parseJson<{ ok: boolean; status: RevenueFeatureStatus }>(res);
}

export async function revenueListCampaigns(getToken: () => Promise<string | null>) {
  const res = await fetch("/api/revenue/campaigns", { headers: await authHeaders(getToken) });
  return parseJson<{ campaigns: RevenueCampaign[] }>(res);
}

export async function revenueGetCampaign(getToken: () => Promise<string | null>, id: string) {
  const res = await fetch(`/api/revenue/campaigns/${id}`, { headers: await authHeaders(getToken) });
  return parseJson<{ campaign: RevenueCampaign }>(res);
}

export async function revenueCreateCampaign(
  getToken: () => Promise<string | null>,
  body: RevenueCampaignCreateInput
) {
  const res = await fetch("/api/revenue/campaigns", {
    method: "POST",
    headers: await authHeaders(getToken),
    body: JSON.stringify(body),
  });
  return parseJson<{ campaign: RevenueCampaign }>(res);
}

export async function revenueUpdateCampaign(
  getToken: () => Promise<string | null>,
  id: string,
  body: RevenueCampaignUpdateInput
) {
  const res = await fetch(`/api/revenue/campaigns/${id}`, {
    method: "PATCH",
    headers: await authHeaders(getToken),
    body: JSON.stringify(body),
  });
  return parseJson<{ campaign: RevenueCampaign }>(res);
}

export async function revenueDeleteCampaign(getToken: () => Promise<string | null>, id: string) {
  const res = await fetch(`/api/revenue/campaigns/${id}`, {
    method: "DELETE",
    headers: await authHeaders(getToken),
  });
  return parseJson<{
    ok: true;
    deletedOpportunities: number;
    deletedCampaignRuns: number;
    deletedRelated: number;
  }>(res);
}

export async function revenueListOpportunities(
  getToken: () => Promise<string | null>,
  params?: { pipelineStage?: RevenuePipelineStage; campaignId?: string; approvalStatus?: string }
) {
  const qs = new URLSearchParams();
  if (params?.pipelineStage) qs.set("pipelineStage", params.pipelineStage);
  if (params?.campaignId) qs.set("campaignId", params.campaignId);
  if (params?.approvalStatus) qs.set("approvalStatus", params.approvalStatus);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const res = await fetch(`/api/revenue/opportunities${suffix}`, { headers: await authHeaders(getToken) });
  return parseJson<{ opportunities: RevenueOpportunity[] }>(res);
}

export async function revenueGetOpportunity(getToken: () => Promise<string | null>, id: string) {
  const res = await fetch(`/api/revenue/opportunities/${id}`, { headers: await authHeaders(getToken) });
  return parseJson<{ opportunity: RevenueOpportunity }>(res);
}

export async function revenueCreateOpportunity(
  getToken: () => Promise<string | null>,
  body: RevenueOpportunityCreateInput
) {
  const res = await fetch("/api/revenue/opportunities", {
    method: "POST",
    headers: await authHeaders(getToken),
    body: JSON.stringify(body),
  });
  return parseJson<{ opportunity: RevenueOpportunity }>(res);
}

export async function revenueUpdateOpportunity(
  getToken: () => Promise<string | null>,
  id: string,
  body: RevenueOpportunityUpdateInput
) {
  const res = await fetch(`/api/revenue/opportunities/${id}`, {
    method: "PATCH",
    headers: await authHeaders(getToken),
    body: JSON.stringify(body),
  });
  return parseJson<{ opportunity: RevenueOpportunity }>(res);
}

export async function revenueDeleteOpportunity(getToken: () => Promise<string | null>, id: string) {
  const res = await fetch(`/api/revenue/opportunities/${id}`, {
    method: "DELETE",
    headers: await authHeaders(getToken),
  });
  return parseJson<{ ok: true }>(res);
}

export async function revenueSetOpportunityStage(
  getToken: () => Promise<string | null>,
  id: string,
  pipelineStage: RevenuePipelineStage
) {
  const res = await fetch(`/api/revenue/opportunities/${id}/stage`, {
    method: "POST",
    headers: await authHeaders(getToken),
    body: JSON.stringify({ pipelineStage }),
  });
  return parseJson<{ opportunity: RevenueOpportunity }>(res);
}

export async function revenueApproveOpportunity(
  getToken: () => Promise<string | null>,
  id: string,
  notes?: string
) {
  const res = await fetch(`/api/revenue/opportunities/${id}/approve`, {
    method: "POST",
    headers: await authHeaders(getToken),
    body: JSON.stringify({ notes }),
  });
  return parseJson<{ opportunity: RevenueOpportunity }>(res);
}

export async function revenueRejectOpportunity(
  getToken: () => Promise<string | null>,
  id: string,
  body: { reason: RevenueRejectionReason; notes?: string; revisitLater?: boolean }
) {
  const res = await fetch(`/api/revenue/opportunities/${id}/reject`, {
    method: "POST",
    headers: await authHeaders(getToken),
    body: JSON.stringify(body),
  });
  return parseJson<{ opportunity: RevenueOpportunity }>(res);
}

export async function revenueGetDashboard(getToken: () => Promise<string | null>) {
  const res = await fetch("/api/revenue/dashboard", { headers: await authHeaders(getToken) });
  return parseJson<{ summary: RevenueDashboardSummary }>(res);
}

export async function revenueListAgents(getToken: () => Promise<string | null>) {
  const res = await fetch("/api/revenue/agents", { headers: await authHeaders(getToken) });
  return parseJson<{ agents: RevenueAgentCatalogEntry[] }>(res);
}

export async function revenueListAgentRuns(
  getToken: () => Promise<string | null>,
  params?: { opportunityId?: string; agentName?: RevenueAgentName; limit?: number }
) {
  const qs = new URLSearchParams();
  if (params?.opportunityId) qs.set("opportunityId", params.opportunityId);
  if (params?.agentName) qs.set("agentName", params.agentName);
  if (params?.limit) qs.set("limit", String(params.limit));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const res = await fetch(`/api/revenue/agent-runs${suffix}`, { headers: await authHeaders(getToken) });
  return parseJson<{ runs: RevenueAgentRun[] }>(res);
}

export async function revenueGetAgentRun(getToken: () => Promise<string | null>, id: string) {
  const res = await fetch(`/api/revenue/agent-runs/${id}`, { headers: await authHeaders(getToken) });
  return parseJson<{ run: RevenueAgentRun }>(res);
}

export async function revenueRunQualityReview(getToken: () => Promise<string | null>, opportunityId: string) {
  const res = await fetch(`/api/revenue/opportunities/${opportunityId}/quality-review`, {
    method: "POST",
    headers: await authHeaders(getToken),
  });
  return parseJson<{ run: RevenueAgentRun; opportunity: RevenueOpportunity }>(res);
}

export async function revenueRunRevision(getToken: () => Promise<string | null>, opportunityId: string) {
  const res = await fetch(`/api/revenue/opportunities/${opportunityId}/revision`, {
    method: "POST",
    headers: await authHeaders(getToken),
  });
  return parseJson<{ run: RevenueAgentRun; opportunity: RevenueOpportunity }>(res);
}

export async function revenueRunCampaignResearch(getToken: () => Promise<string | null>, campaignId: string) {
  const res = await fetch(`/api/revenue/campaigns/${campaignId}/research`, {
    method: "POST",
    headers: await authHeaders(getToken),
  });
  return parseJson<{
    campaignRun: RevenueCampaignRun;
    agentRun: RevenueAgentRun;
    opportunities: RevenueOpportunity[];
  }>(res);
}

export async function revenueListCampaignRuns(
  getToken: () => Promise<string | null>,
  campaignId?: string
) {
  const qs = campaignId ? `?campaignId=${encodeURIComponent(campaignId)}` : "";
  const res = await fetch(`/api/revenue/campaign-runs${qs}`, { headers: await authHeaders(getToken) });
  return parseJson<{ runs: RevenueCampaignRun[] }>(res);
}

export async function revenueRunCampaignConcept(getToken: () => Promise<string | null>, opportunityId: string) {
  const res = await fetch(`/api/revenue/opportunities/${opportunityId}/campaign-concept`, {
    method: "POST",
    headers: await authHeaders(getToken),
  });
  return parseJson<{ run: RevenueAgentRun; opportunity: RevenueOpportunity }>(res);
}

export async function revenueListOutreach(
  getToken: () => Promise<string | null>,
  params?: { opportunityId?: string; status?: string }
) {
  const qs = new URLSearchParams();
  if (params?.opportunityId) qs.set("opportunityId", params.opportunityId);
  if (params?.status) qs.set("status", params.status);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const res = await fetch(`/api/revenue/outreach${suffix}`, { headers: await authHeaders(getToken) });
  return parseJson<{ activities: RevenueOutreachActivity[] }>(res);
}

export async function revenueGetOutreach(getToken: () => Promise<string | null>, id: string) {
  const res = await fetch(`/api/revenue/outreach/${id}`, { headers: await authHeaders(getToken) });
  return parseJson<{ activity: RevenueOutreachActivity }>(res);
}

export async function revenueUpdateOutreach(
  getToken: () => Promise<string | null>,
  id: string,
  body: Partial<Pick<RevenueOutreachActivity, "subject" | "body" | "recipientName" | "recipientEmail">>
) {
  const res = await fetch(`/api/revenue/outreach/${id}`, {
    method: "PATCH",
    headers: await authHeaders(getToken),
    body: JSON.stringify(body),
  });
  return parseJson<{ activity: RevenueOutreachActivity }>(res);
}

export async function revenueRunOutreachDraft(getToken: () => Promise<string | null>, opportunityId: string) {
  const res = await fetch(`/api/revenue/opportunities/${opportunityId}/outreach-draft`, {
    method: "POST",
    headers: await authHeaders(getToken),
  });
  return parseJson<{
    agentRun: RevenueAgentRun;
    activities: RevenueOutreachActivity[];
  }>(res);
}

export async function revenueApproveOutreach(
  getToken: () => Promise<string | null>,
  id: string,
  notes?: string
) {
  const res = await fetch(`/api/revenue/outreach/${id}/approve`, {
    method: "POST",
    headers: await authHeaders(getToken),
    body: JSON.stringify({ notes }),
  });
  return parseJson<{ activity: RevenueOutreachActivity; opportunityUpdated: boolean }>(res);
}

export async function revenueRejectOutreach(
  getToken: () => Promise<string | null>,
  id: string,
  notes?: string
) {
  const res = await fetch(`/api/revenue/outreach/${id}/reject`, {
    method: "POST",
    headers: await authHeaders(getToken),
    body: JSON.stringify({ notes }),
  });
  return parseJson<{ activity: RevenueOutreachActivity }>(res);
}

export async function revenueCreateGmailDraftFromOutreach(getToken: () => Promise<string | null>, outreachId: string) {
  const res = await fetch(`/api/revenue/outreach/${outreachId}/gmail-draft`, {
    method: "POST",
    headers: await authHeaders(getToken),
  });
  return parseJson<{ activity: RevenueOutreachActivity; draftId: string; threadId?: string }>(res);
}

export async function revenueGetGmailStatus(getToken: () => Promise<string | null>) {
  const res = await fetch("/api/revenue/gmail/status", { headers: await authHeaders(getToken) });
  return parseJson<{
    configured: boolean;
    mode: "not_configured" | "mock" | "live";
    connected: boolean;
    email?: string;
    connectedAt?: string;
  }>(res);
}

export async function revenueConnectGmail(getToken: () => Promise<string | null>) {
  const res = await fetch("/api/revenue/gmail/connect", { headers: await authHeaders(getToken) });
  return parseJson<{ url: string }>(res);
}

export async function revenueDisconnectGmail(getToken: () => Promise<string | null>) {
  const res = await fetch("/api/revenue/gmail/status", {
    method: "DELETE",
    headers: await authHeaders(getToken),
  });
  return parseJson<{ ok: true }>(res);
}

export async function revenueListInbox(
  getToken: () => Promise<string | null>,
  params?: { opportunityId?: string; status?: string }
) {
  const qs = new URLSearchParams();
  if (params?.opportunityId) qs.set("opportunityId", params.opportunityId);
  if (params?.status) qs.set("status", params.status);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const res = await fetch(`/api/revenue/inbox${suffix}`, { headers: await authHeaders(getToken) });
  return parseJson<{ threads: RevenueEmailThread[] }>(res);
}

export async function revenueSyncInbox(getToken: () => Promise<string | null>, query?: string) {
  const res = await fetch("/api/revenue/inbox/sync", {
    method: "POST",
    headers: await authHeaders(getToken),
    body: JSON.stringify({ query }),
  });
  return parseJson<{ threads: RevenueEmailThread[] }>(res);
}

export async function revenueClassifyInboxThread(getToken: () => Promise<string | null>, threadId: string) {
  const res = await fetch(`/api/revenue/inbox/${threadId}`, {
    method: "POST",
    headers: await authHeaders(getToken),
  });
  return parseJson<{ agentRun: RevenueAgentRun; thread: RevenueEmailThread }>(res);
}

export async function revenueListDiscovery(
  getToken: () => Promise<string | null>,
  params?: { opportunityId?: string; status?: string }
) {
  const qs = new URLSearchParams();
  if (params?.opportunityId) qs.set("opportunityId", params.opportunityId);
  if (params?.status) qs.set("status", params.status);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const res = await fetch(`/api/revenue/discovery${suffix}`, { headers: await authHeaders(getToken) });
  return parseJson<{ sessions: RevenueDiscoverySession[] }>(res);
}

export async function revenueRunDiscoveryPrep(
  getToken: () => Promise<string | null>,
  opportunityId: string,
  scheduledAt?: string
) {
  const res = await fetch(`/api/revenue/opportunities/${opportunityId}/discovery-prep`, {
    method: "POST",
    headers: await authHeaders(getToken),
    body: JSON.stringify({ scheduledAt }),
  });
  return parseJson<{
    agentRun: RevenueAgentRun;
    session: RevenueDiscoverySession;
    opportunityUpdated: boolean;
  }>(res);
}

export async function revenueRunDiscoveryDebrief(
  getToken: () => Promise<string | null>,
  sessionId: string,
  payload: {
    callQuestionNotes?: DiscoveryQuestionNote[];
    additionalCallNotes?: string;
    callNotes?: string;
  }
) {
  const res = await fetch(`/api/revenue/discovery/${sessionId}/debrief`, {
    method: "POST",
    headers: await authHeaders(getToken),
    body: JSON.stringify(payload),
  });
  return parseJson<{ agentRun: RevenueAgentRun; session: RevenueDiscoverySession }>(res);
}

export async function revenueUpdateDiscoverySession(
  getToken: () => Promise<string | null>,
  sessionId: string,
  body: {
    callNotes?: string;
    callQuestionNotes?: DiscoveryQuestionNote[];
    additionalCallNotes?: string;
    scheduledAt?: string;
    status?: string;
  }
) {
  const res = await fetch(`/api/revenue/discovery/${sessionId}`, {
    method: "PATCH",
    headers: await authHeaders(getToken),
    body: JSON.stringify(body),
  });
  return parseJson<{ session: RevenueDiscoverySession }>(res);
}

export async function revenueListProposals(
  getToken: () => Promise<string | null>,
  params?: { opportunityId?: string; status?: string }
) {
  const qs = new URLSearchParams();
  if (params?.opportunityId) qs.set("opportunityId", params.opportunityId);
  if (params?.status) qs.set("status", params.status);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const res = await fetch(`/api/revenue/proposals${suffix}`, { headers: await authHeaders(getToken) });
  return parseJson<{ proposals: RevenueOpportunityProposal[] }>(res);
}

export async function revenueRunProposalDraft(
  getToken: () => Promise<string | null>,
  opportunityId: string,
  discoverySessionId?: string
) {
  const res = await fetch(`/api/revenue/opportunities/${opportunityId}/proposal-draft`, {
    method: "POST",
    headers: await authHeaders(getToken),
    body: JSON.stringify({ discoverySessionId }),
  });
  return parseJson<{ agentRun: RevenueAgentRun; proposal: RevenueOpportunityProposal }>(res);
}

export async function revenueGetProposalAgreementPrefill(getToken: () => Promise<string | null>, proposalId: string) {
  const res = await fetch(`/api/revenue/proposals/${proposalId}/agreement-prefill`, {
    headers: await authHeaders(getToken),
  });
  return parseJson<{ proposal: RevenueOpportunityProposal; agreementPatch: Partial<Agreement> }>(res);
}

export async function revenueUpdateProposal(
  getToken: () => Promise<string | null>,
  proposalId: string,
  body: {
    agreementId?: string;
    status?: string;
    title?: string;
    executiveSummary?: string;
    scopeOutline?: string;
    deliverables?: string[];
    timelineNotes?: string;
    investmentMin?: number;
    investmentMax?: number;
    paymentStructureSuggestion?: string;
    agreementPrefill?: RevenueOpportunityProposal["agreementPrefill"];
  }
) {
  const res = await fetch(`/api/revenue/proposals/${proposalId}`, {
    method: "PATCH",
    headers: await authHeaders(getToken),
    body: JSON.stringify(body),
  });
  return parseJson<{ proposal: RevenueOpportunityProposal }>(res);
}

export async function revenueConvertOpportunityToProject(
  getToken: () => Promise<string | null>,
  opportunityId: string,
  body?: { projectName?: string; proposalId?: string }
) {
  const res = await fetch(`/api/revenue/opportunities/${opportunityId}/convert-to-project`, {
    method: "POST",
    headers: await authHeaders(getToken),
    body: JSON.stringify(body ?? {}),
  });
  return parseJson<{
    ok: boolean;
    projectId: string;
    opportunity: RevenueOpportunity;
    alreadyConverted: boolean;
  }>(res);
}

export async function revenueListWorkflows(
  getToken: () => Promise<string | null>,
  params?: { status?: string; workflowName?: string; month?: string; limit?: number }
) {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.workflowName) qs.set("workflowName", params.workflowName);
  if (params?.month) qs.set("month", params.month);
  if (params?.limit != null) qs.set("limit", String(params.limit));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const res = await fetch(`/api/revenue/workflows${suffix}`, { headers: await authHeaders(getToken) });
  return parseJson<{ catalog: RevenueWorkflowCatalogEntry[]; runs: RevenueWorkflowRun[] }>(res);
}

export async function revenueTriggerWorkflow(getToken: () => Promise<string | null>, workflowName: string) {
  const res = await fetch("/api/revenue/workflows/trigger", {
    method: "POST",
    headers: await authHeaders(getToken),
    body: JSON.stringify({ workflowName }),
  });
  return parseJson<{ run: RevenueWorkflowRun }>(res);
}

export async function revenueRetryWorkflowRun(getToken: () => Promise<string | null>, runId: string) {
  const res = await fetch(`/api/revenue/workflows/${runId}/retry`, {
    method: "POST",
    headers: await authHeaders(getToken),
  });
  return parseJson<{ run: RevenueWorkflowRun }>(res);
}

export async function revenueDeleteWorkflowRun(getToken: () => Promise<string | null>, runId: string) {
  const res = await fetch(`/api/revenue/workflows/${runId}`, {
    method: "DELETE",
    headers: await authHeaders(getToken),
  });
  return parseJson<{ ok: boolean }>(res);
}

export { revenueDisabled };
