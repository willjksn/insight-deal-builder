import { authHeaders } from "@/lib/scriptWriter/apiClient";
import {
  BrandProfile,
  IdeaGenerationInputs,
  IdeaGenerationSession,
} from "@/lib/contentIdeas/types";

async function parseJson<T>(res: Response): Promise<T> {
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? res.statusText);
  return data;
}

export async function contentIdeasListProfiles(getToken: () => Promise<string | null>) {
  const res = await fetch("/api/content-ideas/profiles", {
    headers: await authHeaders(getToken),
  });
  return parseJson<{ profiles: BrandProfile[] }>(res);
}

export async function contentIdeasCreateProfile(
  getToken: () => Promise<string | null>,
  body: Partial<BrandProfile> & { type?: BrandProfile["type"] }
) {
  const res = await fetch("/api/content-ideas/profiles", {
    method: "POST",
    headers: await authHeaders(getToken),
    body: JSON.stringify(body),
  });
  return parseJson<{ profile: BrandProfile }>(res);
}

export async function contentIdeasGetProfile(
  getToken: () => Promise<string | null>,
  id: string
) {
  const res = await fetch(`/api/content-ideas/profiles/${id}`, {
    headers: await authHeaders(getToken),
  });
  return parseJson<{ profile: BrandProfile }>(res);
}

export async function contentIdeasUpdateProfile(
  getToken: () => Promise<string | null>,
  id: string,
  body: Partial<BrandProfile>
) {
  const res = await fetch(`/api/content-ideas/profiles/${id}`, {
    method: "PATCH",
    headers: await authHeaders(getToken),
    body: JSON.stringify(body),
  });
  return parseJson<{ profile: BrandProfile }>(res);
}

export async function contentIdeasDeleteProfile(
  getToken: () => Promise<string | null>,
  id: string
) {
  const res = await fetch(`/api/content-ideas/profiles/${id}`, {
    method: "DELETE",
    headers: await authHeaders(getToken),
  });
  return parseJson<{ ok: boolean }>(res);
}

export async function contentIdeasListSessions(getToken: () => Promise<string | null>) {
  const res = await fetch("/api/content-ideas/sessions", {
    headers: await authHeaders(getToken),
  });
  return parseJson<{ sessions: IdeaGenerationSession[] }>(res);
}

export async function contentIdeasCreateSession(
  getToken: () => Promise<string | null>,
  body: { profileId?: string; title?: string; inputs: IdeaGenerationInputs }
) {
  const res = await fetch("/api/content-ideas/sessions", {
    method: "POST",
    headers: await authHeaders(getToken),
    body: JSON.stringify(body),
  });
  return parseJson<{ session: IdeaGenerationSession }>(res);
}

export async function contentIdeasGetSession(
  getToken: () => Promise<string | null>,
  id: string
) {
  const res = await fetch(`/api/content-ideas/sessions/${id}`, {
    headers: await authHeaders(getToken),
  });
  return parseJson<{ session: IdeaGenerationSession }>(res);
}

export async function contentIdeasDeleteSession(
  getToken: () => Promise<string | null>,
  id: string
) {
  const res = await fetch(`/api/content-ideas/sessions/${id}`, {
    method: "DELETE",
    headers: await authHeaders(getToken),
  });
  return parseJson<{ ok: true }>(res);
}

export async function contentIdeasGenerate(
  getToken: () => Promise<string | null>,
  sessionId: string
) {
  const res = await fetch(`/api/content-ideas/sessions/${sessionId}/generate`, {
    method: "POST",
    headers: await authHeaders(getToken),
  });
  return parseJson<{ session: IdeaGenerationSession }>(res);
}

export async function contentIdeasCreateProjectFromIdea(
  getToken: () => Promise<string | null>,
  sessionId: string,
  body: { ideaId: string; projectName?: string }
) {
  const res = await fetch(`/api/content-ideas/sessions/${sessionId}/create-project`, {
    method: "POST",
    headers: await authHeaders(getToken),
    body: JSON.stringify(body),
  });
  return parseJson<{ ok: true; projectId: string; scriptSessionId: string }>(res);
}
