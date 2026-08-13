import { authHeaders } from "@/lib/scriptWriter/apiClient";
import type {
  LiveNoBidReason,
  LiveOpportunity,
  LiveOpportunityStatus,
} from "@/lib/liveProduction/types";

async function parseJson<T>(res: Response): Promise<T> {
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? res.statusText);
  return data;
}

export type LiveDashboardStats = {
  openCount: number;
  qualifiedCount: number;
  pursuingCount: number;
  pipelineValue: number;
  weightedPipeline: number;
  wonValue: number;
  averageFitScore: number;
  highFit: LiveOpportunity[];
  closingSoon: LiveOpportunity[];
  topEquipmentDemand: { label: string; count: number }[];
};

export async function liveListOpportunities(
  getToken: () => Promise<string | null>,
  opts?: { status?: LiveOpportunityStatus; seed?: boolean }
) {
  const params = new URLSearchParams();
  if (opts?.status) params.set("status", opts.status);
  if (opts?.seed) params.set("seed", "1");
  const q = params.toString();
  const res = await fetch(`/api/live-production/opportunities${q ? `?${q}` : ""}`, {
    headers: await authHeaders(getToken),
  });
  return parseJson<{ opportunities: LiveOpportunity[] }>(res);
}

export async function liveGetDashboard(getToken: () => Promise<string | null>) {
  const res = await fetch("/api/live-production/dashboard", {
    headers: await authHeaders(getToken),
  });
  return parseJson<{ stats: LiveDashboardStats }>(res);
}

export async function liveGetOpportunity(
  getToken: () => Promise<string | null>,
  id: string
) {
  const res = await fetch(`/api/live-production/opportunities/${id}`, {
    headers: await authHeaders(getToken),
  });
  return parseJson<{ opportunity: LiveOpportunity }>(res);
}

export async function liveCreateOpportunity(
  getToken: () => Promise<string | null>,
  body: Partial<LiveOpportunity> & { title: string; organizationName: string; analyze?: boolean }
) {
  const res = await fetch("/api/live-production/opportunities", {
    method: "POST",
    headers: await authHeaders(getToken),
    body: JSON.stringify(body),
  });
  return parseJson<{ opportunity: LiveOpportunity }>(res);
}

export async function liveUpdateOpportunity(
  getToken: () => Promise<string | null>,
  id: string,
  patch: Partial<LiveOpportunity> & { rematch?: boolean }
) {
  const res = await fetch(`/api/live-production/opportunities/${id}`, {
    method: "PATCH",
    headers: await authHeaders(getToken),
    body: JSON.stringify(patch),
  });
  return parseJson<{ opportunity: LiveOpportunity }>(res);
}

export async function liveDeleteOpportunity(
  getToken: () => Promise<string | null>,
  id: string
) {
  const res = await fetch(`/api/live-production/opportunities/${id}`, {
    method: "DELETE",
    headers: await authHeaders(getToken),
  });
  return parseJson<{ ok: boolean }>(res);
}

export async function liveAnalyzeOpportunity(
  getToken: () => Promise<string | null>,
  id: string,
  body?: { text?: string }
) {
  const res = await fetch(`/api/live-production/opportunities/${id}/analyze`, {
    method: "POST",
    headers: await authHeaders(getToken),
    body: JSON.stringify(body || {}),
  });
  return parseJson<{ opportunity: LiveOpportunity }>(res);
}

export async function liveRematchOpportunity(
  getToken: () => Promise<string | null>,
  id: string
) {
  const res = await fetch(`/api/live-production/opportunities/${id}/rematch`, {
    method: "POST",
    headers: await authHeaders(getToken),
  });
  return parseJson<{ opportunity: LiveOpportunity }>(res);
}

export async function liveBidDecision(
  getToken: () => Promise<string | null>,
  id: string,
  body: {
    decision: "pursue" | "no_bid";
    noBidReason?: LiveNoBidReason;
    noBidNotes?: string;
  }
) {
  const res = await fetch(`/api/live-production/opportunities/${id}/bid`, {
    method: "POST",
    headers: await authHeaders(getToken),
    body: JSON.stringify(body),
  });
  return parseJson<{ opportunity: LiveOpportunity }>(res);
}

export async function liveConvertToProject(
  getToken: () => Promise<string | null>,
  id: string,
  body?: { projectName?: string }
) {
  const res = await fetch(`/api/live-production/opportunities/${id}/convert-to-project`, {
    method: "POST",
    headers: await authHeaders(getToken),
    body: JSON.stringify(body || {}),
  });
  return parseJson<{
    projectId: string;
    opportunity: LiveOpportunity;
    alreadyConverted: boolean;
  }>(res);
}

export async function livePreviewAnalyze(
  getToken: () => Promise<string | null>,
  body: { text: string; sourceUrl?: string; titleHint?: string }
) {
  const res = await fetch("/api/live-production/analyze", {
    method: "POST",
    headers: await authHeaders(getToken),
    body: JSON.stringify(body),
  });
  return parseJson<{ extract: Awaited<ReturnType<typeof import("./analyzeOpportunity").analyzeLiveOpportunityText>> }>(res);
}

export async function liveGetDiscoveryProfile(getToken: () => Promise<string | null>) {
  const res = await fetch("/api/live-production/discovery/profile", {
    headers: await authHeaders(getToken),
  });
  return parseJson<{
    profile: import("./discoveryTypes").LiveDiscoveryProfileDoc;
    discoveryMode: "live" | "demo";
  }>(res);
}

export async function liveSaveDiscoveryProfile(
  getToken: () => Promise<string | null>,
  body: Partial<import("./defaultsKeywords").LiveProductionTargetProfile>
) {
  const res = await fetch("/api/live-production/discovery/profile", {
    method: "PUT",
    headers: await authHeaders(getToken),
    body: JSON.stringify(body),
  });
  return parseJson<{ profile: import("./discoveryTypes").LiveDiscoveryProfileDoc }>(res);
}

export async function liveListDiscoveryRuns(getToken: () => Promise<string | null>) {
  const res = await fetch("/api/live-production/discovery/runs", {
    headers: await authHeaders(getToken),
  });
  return parseJson<{ runs: import("./discoveryTypes").LiveDiscoveryRun[] }>(res);
}

export async function liveRunDiscovery(getToken: () => Promise<string | null>) {
  const res = await fetch("/api/live-production/discovery/runs", {
    method: "POST",
    headers: await authHeaders(getToken),
  });
  return parseJson<{ run: import("./discoveryTypes").LiveDiscoveryRun }>(res);
}

export async function liveImportDiscoveryCandidates(
  getToken: () => Promise<string | null>,
  runId: string,
  candidateIds: string[]
) {
  const res = await fetch(`/api/live-production/discovery/runs/${runId}/import`, {
    method: "POST",
    headers: await authHeaders(getToken),
    body: JSON.stringify({ candidateIds }),
  });
  return parseJson<{
    opportunities: LiveOpportunity[];
    run: import("./discoveryTypes").LiveDiscoveryRun;
  }>(res);
}
