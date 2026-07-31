import { authHeaders } from "@/lib/scriptWriter/apiClient";
import type {
  Creator,
  CreatorApplicationStatus,
  CreatorCreateInput,
  CreatorDocumentKind,
  CreatorRelationshipType,
  CreatorUpdateInput,
} from "@/lib/creators/types";
import type {
  CreatorBrief,
  CreatorCampaign,
  CreatorCampaignCreateInput,
  CreatorCampaignUpdateInput,
  CreatorDeliverable,
  CreatorDevelopmentPlan,
  CreatorMatchResult,
  CreatorNetworkFilters,
  CreatorNetworkSummary,
  CreatorProductionDay,
  CreatorProductionDayCreateInput,
  CreatorSavedSearch,
  CreatorShortlist,
  CreatorShortlistCreateInput,
  CreatorShortlistEntryStatus,
} from "@/lib/creators/opsTypes";

type GetToken = () => Promise<string | null>;

async function parseJson<T>(res: Response): Promise<T> {
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? res.statusText);
  return data;
}

export async function listCreators(
  getToken: GetToken,
  opts?: { relationshipType?: CreatorRelationshipType; applicantsOnly?: boolean }
): Promise<Creator[]> {
  const params = new URLSearchParams();
  if (opts?.relationshipType) params.set("relationshipType", opts.relationshipType);
  if (opts?.applicantsOnly) params.set("applicants", "1");
  const qs = params.toString();
  const res = await fetch(`/api/creators${qs ? `?${qs}` : ""}`, {
    headers: await authHeaders(getToken),
  });
  const data = await parseJson<{ creators: Creator[] }>(res);
  return data.creators;
}

export async function getCreator(getToken: GetToken, id: string): Promise<Creator> {
  const res = await fetch(`/api/creators/${id}`, { headers: await authHeaders(getToken) });
  const data = await parseJson<{ creator: Creator }>(res);
  return data.creator;
}

export async function createCreator(
  getToken: GetToken,
  body: CreatorCreateInput
): Promise<Creator> {
  const res = await fetch("/api/creators", {
    method: "POST",
    headers: await authHeaders(getToken),
    body: JSON.stringify(body),
  });
  const data = await parseJson<{ creator: Creator }>(res);
  return data.creator;
}

export async function updateCreator(
  getToken: GetToken,
  id: string,
  body: CreatorUpdateInput
): Promise<Creator> {
  const res = await fetch(`/api/creators/${id}`, {
    method: "PATCH",
    headers: await authHeaders(getToken),
    body: JSON.stringify(body),
  });
  const data = await parseJson<{ creator: Creator }>(res);
  return data.creator;
}

export async function deleteCreator(getToken: GetToken, id: string): Promise<void> {
  const res = await fetch(`/api/creators/${id}`, {
    method: "DELETE",
    headers: await authHeaders(getToken),
  });
  await parseJson<{ ok: boolean }>(res);
}

export async function importStormiCreator(
  getToken: GetToken
): Promise<{ creator: Creator; created: boolean }> {
  const res = await fetch("/api/creators/import-stormi", {
    method: "POST",
    headers: await authHeaders(getToken),
  });
  return parseJson<{ creator: Creator; created: boolean }>(res);
}

export async function setCreatorApplicationStatus(
  getToken: GetToken,
  id: string,
  body: {
    applicationStatus: CreatorApplicationStatus;
    reviewNotes?: string;
    promoteTo?: CreatorRelationshipType;
  }
): Promise<Creator> {
  const res = await fetch(`/api/creators/${id}/application-status`, {
    method: "POST",
    headers: await authHeaders(getToken),
    body: JSON.stringify(body),
  });
  const data = await parseJson<{ creator: Creator }>(res);
  return data.creator;
}

export async function addCreatorDocument(
  getToken: GetToken,
  id: string,
  body: {
    kind: CreatorDocumentKind;
    label?: string;
    url?: string;
    fileDataUrl?: string;
    fileName?: string;
  }
): Promise<Creator> {
  const res = await fetch(`/api/creators/${id}/documents`, {
    method: "POST",
    headers: await authHeaders(getToken),
    body: JSON.stringify(body),
  });
  const data = await parseJson<{ creator: Creator }>(res);
  return data.creator;
}

export async function removeCreatorDocument(
  getToken: GetToken,
  id: string,
  docId: string
): Promise<Creator> {
  const res = await fetch(`/api/creators/${id}/documents/${docId}`, {
    method: "DELETE",
    headers: await authHeaders(getToken),
  });
  const data = await parseJson<{ creator: Creator }>(res);
  return data.creator;
}

export async function getCreatorDocumentViewUrl(
  getToken: GetToken,
  id: string,
  docId: string
): Promise<{ url: string; expiresInMs: number }> {
  const res = await fetch(`/api/creators/${id}/documents/${docId}`, {
    headers: await authHeaders(getToken),
  });
  return parseJson<{ url: string; expiresInMs: number }>(res);
}

// ── Phase 3–8 ops ──────────────────────────────────────────────────────────

export async function getCreatorNetworkSummary(getToken: GetToken) {
  const res = await fetch("/api/creators/network?summary=1", {
    headers: await authHeaders(getToken),
  });
  return parseJson<{ summary: CreatorNetworkSummary }>(res);
}

export async function searchCreatorNetwork(getToken: GetToken, filters: CreatorNetworkFilters) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.location) params.set("location", filters.location);
  if (filters.availableOnly) params.set("availableOnly", "1");
  if (filters.applicantsOnly) params.set("applicantsOnly", "1");
  if (filters.relationshipTypes?.length)
    params.set("relationshipTypes", filters.relationshipTypes.join(","));
  if (filters.statuses?.length) params.set("statuses", filters.statuses.join(","));
  if (filters.readinessStatuses?.length)
    params.set("readinessStatuses", filters.readinessStatuses.join(","));
  if (filters.niches?.length) params.set("niches", filters.niches.join(","));
  if (filters.platforms?.length) params.set("platforms", filters.platforms.join(","));
  if (filters.tags?.length) params.set("tags", filters.tags.join(","));
  const res = await fetch(`/api/creators/network?${params}`, {
    headers: await authHeaders(getToken),
  });
  return parseJson<{ creators: Creator[] }>(res);
}

export async function listSavedCreatorSearches(getToken: GetToken) {
  const res = await fetch("/api/creators/saved-searches", {
    headers: await authHeaders(getToken),
  });
  return parseJson<{ searches: CreatorSavedSearch[] }>(res);
}

export async function createSavedCreatorSearch(
  getToken: GetToken,
  name: string,
  filters: CreatorNetworkFilters
) {
  const res = await fetch("/api/creators/saved-searches", {
    method: "POST",
    headers: await authHeaders(getToken),
    body: JSON.stringify({ name, filters }),
  });
  return parseJson<{ search: CreatorSavedSearch }>(res);
}

export async function deleteSavedCreatorSearch(getToken: GetToken, id: string) {
  const res = await fetch(`/api/creators/saved-searches?id=${id}`, {
    method: "DELETE",
    headers: await authHeaders(getToken),
  });
  await parseJson<{ ok: boolean }>(res);
}

export async function matchCreators(
  getToken: GetToken,
  body: {
    requiredNiche?: string;
    requiredPlatforms?: string[];
    locationPreference?: string;
    audienceNotes?: string;
    limit?: number;
    useAgent?: boolean;
  }
) {
  const res = await fetch("/api/creators/match", {
    method: "POST",
    headers: await authHeaders(getToken),
    body: JSON.stringify(body),
  });
  return parseJson<{ matches: CreatorMatchResult[] }>(res);
}

export async function listShortlists(getToken: GetToken) {
  const res = await fetch("/api/creators/shortlists", {
    headers: await authHeaders(getToken),
  });
  return parseJson<{ shortlists: CreatorShortlist[] }>(res);
}

export async function createShortlist(getToken: GetToken, body: CreatorShortlistCreateInput) {
  const res = await fetch("/api/creators/shortlists", {
    method: "POST",
    headers: await authHeaders(getToken),
    body: JSON.stringify(body),
  });
  return parseJson<{ shortlist: CreatorShortlist }>(res);
}

export async function getShortlist(getToken: GetToken, id: string) {
  const res = await fetch(`/api/creators/shortlists/${id}`, {
    headers: await authHeaders(getToken),
  });
  return parseJson<{ shortlist: CreatorShortlist }>(res);
}

export async function patchShortlist(
  getToken: GetToken,
  id: string,
  body: Record<string, unknown>
) {
  const res = await fetch(`/api/creators/shortlists/${id}`, {
    method: "PATCH",
    headers: await authHeaders(getToken),
    body: JSON.stringify(body),
  });
  return parseJson<{ shortlist: CreatorShortlist }>(res);
}

export async function deleteShortlist(getToken: GetToken, id: string) {
  const res = await fetch(`/api/creators/shortlists/${id}`, {
    method: "DELETE",
    headers: await authHeaders(getToken),
  });
  await parseJson<{ ok: boolean }>(res);
}

export async function listCreatorCampaigns(getToken: GetToken) {
  const res = await fetch("/api/creators/campaigns", {
    headers: await authHeaders(getToken),
  });
  return parseJson<{ campaigns: CreatorCampaign[] }>(res);
}

export async function createCreatorCampaign(getToken: GetToken, body: CreatorCampaignCreateInput) {
  const res = await fetch("/api/creators/campaigns", {
    method: "POST",
    headers: await authHeaders(getToken),
    body: JSON.stringify(body),
  });
  return parseJson<{ campaign: CreatorCampaign }>(res);
}

export async function getCreatorCampaign(getToken: GetToken, id: string) {
  const res = await fetch(`/api/creators/campaigns/${id}`, {
    headers: await authHeaders(getToken),
  });
  return parseJson<{ campaign: CreatorCampaign }>(res);
}

export async function patchCreatorCampaign(
  getToken: GetToken,
  id: string,
  body: CreatorCampaignUpdateInput & {
    action?: string;
    brief?: Omit<CreatorBrief, "id" | "updatedAt"> & { id?: string };
    deliverable?: Omit<CreatorDeliverable, "id"> & { id?: string };
    projectId?: string;
    assignment?: {
      id?: string;
      creatorId?: string;
      role?: string;
      compensation?: number;
      compensationNotes?: string;
      status?: string;
    };
    assignmentId?: string;
    amount?: number;
  }
) {
  const res = await fetch(`/api/creators/campaigns/${id}`, {
    method: "PATCH",
    headers: await authHeaders(getToken),
    body: JSON.stringify(body),
  });
  return parseJson<{ campaign: CreatorCampaign }>(res);
}

export async function deleteCreatorCampaign(getToken: GetToken, id: string) {
  const res = await fetch(`/api/creators/campaigns/${id}`, {
    method: "DELETE",
    headers: await authHeaders(getToken),
  });
  await parseJson<{ ok: boolean }>(res);
}

export async function listProductionDays(getToken: GetToken) {
  const res = await fetch("/api/creators/production-days", {
    headers: await authHeaders(getToken),
  });
  return parseJson<{ days: CreatorProductionDay[] }>(res);
}

export async function createProductionDay(
  getToken: GetToken,
  body: CreatorProductionDayCreateInput
) {
  const res = await fetch("/api/creators/production-days", {
    method: "POST",
    headers: await authHeaders(getToken),
    body: JSON.stringify(body),
  });
  return parseJson<{ day: CreatorProductionDay }>(res);
}

export async function updateProductionDay(
  getToken: GetToken,
  id: string,
  body: Partial<
    Pick<
      CreatorProductionDay,
      "name" | "date" | "location" | "theme" | "capacity" | "creatorIds" | "notes" | "status"
    >
  >
) {
  const res = await fetch("/api/creators/production-days", {
    method: "PATCH",
    headers: await authHeaders(getToken),
    body: JSON.stringify({ id, ...body }),
  });
  return parseJson<{ day: CreatorProductionDay }>(res);
}

export async function saveDevelopmentPlan(
  getToken: GetToken,
  creatorId: string,
  body: { action?: string; plan?: CreatorDevelopmentPlan; areas?: string[] }
) {
  const res = await fetch(`/api/creators/${creatorId}/development-plan`, {
    method: "POST",
    headers: await authHeaders(getToken),
    body: JSON.stringify(body),
  });
  return parseJson<{ plan: CreatorDevelopmentPlan }>(res);
}

export async function getCreatorReports(getToken: GetToken) {
  const res = await fetch("/api/creators/reports", {
    headers: await authHeaders(getToken),
  });
  return parseJson<{
    report: {
      network: CreatorNetworkSummary;
      campaignsByStatus: Record<string, number>;
      campaignCount: number;
      shortlistCount: number;
      economics: {
        revenue: number;
        compensation: number;
        costs: number;
        estimatedMargin: number;
      };
      campaigns: {
        id: string;
        name: string;
        brandName?: string;
        status: string;
        creatorCount: number;
        deliverableCount: number;
        estimatedMargin?: number;
      }[];
    };
  }>(res);
}

export type { CreatorShortlistEntryStatus };

// ── Creator portal (network creators) ──────────────────────────────────────

export async function sendCreatorPortalInvite(
  getToken: GetToken,
  creatorId: string
): Promise<{ inviteUrl: string; expiresAt: string; emailSent: boolean }> {
  const res = await fetch(`/api/creators/${creatorId}/invite`, {
    method: "POST",
    headers: await authHeaders(getToken),
  });
  return parseJson(res);
}

export async function fetchCreatorInvitePreview(token: string): Promise<{
  professionalName: string;
  email: string;
  expired: boolean;
  alreadyLinked: boolean;
}> {
  const res = await fetch(`/api/creator-invite/${encodeURIComponent(token)}`);
  const data = await parseJson<{ invite: {
    professionalName: string;
    email: string;
    expired: boolean;
    alreadyLinked: boolean;
  } }>(res);
  return data.invite;
}

export async function claimCreatorInvite(
  getToken: GetToken,
  token: string
): Promise<Creator> {
  const res = await fetch(`/api/creator-invite/${encodeURIComponent(token)}`, {
    method: "POST",
    headers: await authHeaders(getToken),
  });
  const data = await parseJson<{ creator: Creator }>(res);
  return data.creator;
}

export async function getCreatorPortalMe(getToken: GetToken): Promise<Creator> {
  const res = await fetch("/api/creator-portal/me", {
    headers: await authHeaders(getToken),
  });
  const data = await parseJson<{ creator: Creator }>(res);
  return data.creator;
}

export async function updateCreatorPortalMe(
  getToken: GetToken,
  body: {
    professionalName?: string;
    phone?: string;
    location?: string;
    website?: string;
    portfolioUrl?: string;
    primaryNiche?: string;
    audienceDescription?: string;
    onboarding?: Creator["onboarding"];
  }
): Promise<Creator> {
  const res = await fetch("/api/creator-portal/me", {
    method: "PATCH",
    headers: await authHeaders(getToken),
    body: JSON.stringify(body),
  });
  const data = await parseJson<{ creator: Creator }>(res);
  return data.creator;
}

export async function listCreatorPortalCampaigns(getToken: GetToken): Promise<{
  campaigns: {
    id: string;
    name: string;
    brandName?: string;
    objective?: string;
    status: string;
    role?: string;
    compensation?: number;
    compensationNotes?: string;
    paidAt?: string;
    paidAmount?: number;
    paidVia?: "stripe" | "manual";
    briefs: CreatorBrief[];
    deliverables: CreatorDeliverable[];
    updatedAt: string;
  }[];
  productionDays: CreatorProductionDay[];
}> {
  const res = await fetch("/api/creator-portal/campaigns", {
    headers: await authHeaders(getToken),
  });
  return parseJson(res);
}

export async function getCreatorPortalAgreement(getToken: GetToken) {
  const res = await fetch("/api/creator-portal/agreement", {
    headers: await authHeaders(getToken),
  });
  return parseJson<{
    document: import("@/lib/creators/networkAgreementContent").CreatorAgreementDocument;
    version: string;
    updated: string;
    record: Creator["networkAgreement"] | null;
    needsSignature: boolean;
  }>(res);
}

export async function signCreatorPortalAgreement(
  getToken: GetToken,
  body: { typedSignature: string; accepted: boolean }
) {
  const res = await fetch("/api/creator-portal/agreement", {
    method: "POST",
    headers: await authHeaders(getToken),
    body: JSON.stringify(body),
  });
  return parseJson<{
    creator: Creator;
    record: NonNullable<Creator["networkAgreement"]>;
    needsSignature: boolean;
  }>(res);
}

export async function voidCreatorNetworkAgreement(
  getToken: GetToken,
  creatorId: string
): Promise<Creator> {
  const res = await fetch(`/api/creators/${creatorId}/network-agreement`, {
    method: "POST",
    headers: await authHeaders(getToken),
    body: JSON.stringify({ action: "void" }),
  });
  const data = await parseJson<{ creator: Creator }>(res);
  return data.creator;
}

export async function getCreatorPortalIdentity(getToken: GetToken) {
  const res = await fetch("/api/creator-portal/identity", {
    headers: await authHeaders(getToken),
  });
  return parseJson<{
    verification: NonNullable<Creator["identityVerification"]>;
    canUpload: boolean;
    hasFront: boolean;
    hasBack: boolean;
  }>(res);
}

export async function submitCreatorPortalIdentity(
  getToken: GetToken,
  body: {
    frontFileDataUrl: string;
    frontFileName?: string;
    backFileDataUrl?: string;
    backFileName?: string;
  }
) {
  const res = await fetch("/api/creator-portal/identity", {
    method: "POST",
    headers: await authHeaders(getToken),
    body: JSON.stringify(body),
  });
  return parseJson<{
    creator: Creator;
    verification: NonNullable<Creator["identityVerification"]>;
    canUpload: boolean;
    hasFront: boolean;
    hasBack: boolean;
  }>(res);
}

export async function reviewCreatorIdentityVerification(
  getToken: GetToken,
  creatorId: string,
  body: { action: "approve" | "reject"; rejectionReason?: string }
): Promise<Creator> {
  const res = await fetch(`/api/creators/${creatorId}/identity-verification`, {
    method: "POST",
    headers: await authHeaders(getToken),
    body: JSON.stringify(body),
  });
  const data = await parseJson<{ creator: Creator }>(res);
  return data.creator;
}

export async function viewCreatorIdentityDocument(
  getToken: GetToken,
  creatorId: string,
  side: "front" | "back"
): Promise<{ url: string; expiresInMs: number }> {
  const res = await fetch(`/api/creators/${creatorId}/identity-verification`, {
    method: "POST",
    headers: await authHeaders(getToken),
    body: JSON.stringify({ action: "view", side }),
  });
  return parseJson(res);
}

export async function getCreatorPortalPayment(getToken: GetToken) {
  const res = await fetch("/api/creator-portal/payment", {
    headers: await authHeaders(getToken),
  });
  return parseJson<{
    paymentDetails: Creator["paymentDetails"] | null;
    complete: boolean;
    stripeConnectReady: boolean;
  }>(res);
}

export async function getCreatorPortalStripeConnect(getToken: GetToken) {
  const res = await fetch("/api/creator-portal/stripe-connect", {
    headers: await authHeaders(getToken),
  });
  return parseJson<{
    configured: boolean;
    accountId: string | null;
    status: Creator["stripeConnect"] | null;
    ready: boolean;
  }>(res);
}

export async function startCreatorPortalStripeConnect(getToken: GetToken) {
  const res = await fetch("/api/creator-portal/stripe-connect", {
    method: "POST",
    headers: await authHeaders(getToken),
    body: JSON.stringify({ action: "onboard" }),
  });
  return parseJson<{ url: string; accountId: string }>(res);
}

export async function openCreatorPortalStripeDashboard(getToken: GetToken) {
  const res = await fetch("/api/creator-portal/stripe-connect", {
    method: "POST",
    headers: await authHeaders(getToken),
    body: JSON.stringify({ action: "dashboard" }),
  });
  return parseJson<{ url: string; accountId: string }>(res);
}

export async function syncCreatorStripeConnect(
  getToken: GetToken,
  creatorId: string
): Promise<Creator> {
  const res = await fetch(`/api/creators/${creatorId}/stripe-connect`, {
    method: "POST",
    headers: await authHeaders(getToken),
    body: JSON.stringify({ action: "sync" }),
  });
  const data = await parseJson<{ creator: Creator }>(res);
  return data.creator;
}

export async function saveCreatorPortalPayment(
  getToken: GetToken,
  body: NonNullable<Creator["paymentDetails"]>
) {
  const res = await fetch("/api/creator-portal/payment", {
    method: "PUT",
    headers: await authHeaders(getToken),
    body: JSON.stringify(body),
  });
  return parseJson<{
    creator: Creator;
    paymentDetails: NonNullable<Creator["paymentDetails"]>;
    complete: boolean;
  }>(res);
}

export async function saveCreatorPaymentDetails(
  getToken: GetToken,
  creatorId: string,
  body: NonNullable<Creator["paymentDetails"]>
): Promise<Creator> {
  const res = await fetch(`/api/creators/${creatorId}/payment`, {
    method: "PUT",
    headers: await authHeaders(getToken),
    body: JSON.stringify(body),
  });
  const data = await parseJson<{ creator: Creator }>(res);
  return data.creator;
}
