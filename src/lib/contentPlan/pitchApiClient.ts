import type { ContentPlanPitchSession } from "@/lib/contentPlan/pitchTypes";
import type { PackageDeliverable } from "@/lib/types";

type GetToken = () => Promise<string | null>;

async function authHeaders(getToken: GetToken): Promise<HeadersInit> {
  const token = await getToken();
  if (!token) throw new Error("Not signed in");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function parseJson<T>(res: Response): Promise<T> {
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) {
    throw new Error(
      typeof (data as { error?: string }).error === "string"
        ? (data as { error: string }).error
        : "Request failed"
    );
  }
  return data;
}

export async function listContentPlanPitchSessions(getToken: GetToken) {
  const res = await fetch("/api/content-plans/pitch", {
    headers: await authHeaders(getToken),
  });
  return parseJson<{ sessions: ContentPlanPitchSession[] }>(res);
}

export async function createContentPlanPitchSession(
  getToken: GetToken,
  body: {
    packageId?: string | null;
    packageName: string;
    deliverables: PackageDeliverable[];
    clientName: string;
    businessContext: string;
    brand?: string;
    product?: string;
    agreementId?: string | null;
    opportunityId?: string | null;
    proposalId?: string | null;
    clientId?: string | null;
  }
) {
  const res = await fetch("/api/content-plans/pitch", {
    method: "POST",
    headers: await authHeaders(getToken),
    body: JSON.stringify(body),
  });
  return parseJson<{ session: ContentPlanPitchSession }>(res);
}

export async function getContentPlanPitchSession(getToken: GetToken, id: string) {
  const res = await fetch(`/api/content-plans/pitch/${id}`, {
    headers: await authHeaders(getToken),
  });
  return parseJson<{ session: ContentPlanPitchSession }>(res);
}

export async function generateMorePitchIdeas(getToken: GetToken, id: string) {
  const res = await fetch(`/api/content-plans/pitch/${id}/generate`, {
    method: "POST",
    headers: await authHeaders(getToken),
    body: JSON.stringify({}),
  });
  return parseJson<{ session: ContentPlanPitchSession }>(res);
}

export async function developPitchIdea(
  getToken: GetToken,
  sessionId: string,
  ideaId: string
) {
  const res = await fetch(`/api/content-plans/pitch/${sessionId}/develop`, {
    method: "POST",
    headers: await authHeaders(getToken),
    body: JSON.stringify({ ideaId }),
  });
  return parseJson<{
    planId: string;
    alreadyDeveloped: boolean;
    session?: ContentPlanPitchSession;
  }>(res);
}

export async function updatePitchIdeaStatus(
  getToken: GetToken,
  sessionId: string,
  ideaId: string,
  status: "new" | "developed" | "dismissed"
) {
  const res = await fetch(`/api/content-plans/pitch/${sessionId}/ideas/${ideaId}`, {
    method: "PATCH",
    headers: await authHeaders(getToken),
    body: JSON.stringify({ status }),
  });
  return parseJson<{ session: ContentPlanPitchSession }>(res);
}
