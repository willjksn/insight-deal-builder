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
  return parseJson<{ ok: true }>(res);
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

export async function revenueSeedDemo(getToken: () => Promise<string | null>) {
  const res = await fetch("/api/revenue/seed", {
    method: "POST",
    headers: await authHeaders(getToken),
  });
  return parseJson<{ ok: true; campaignId: string; opportunityIds: string[] }>(res);
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

export { revenueDisabled };
