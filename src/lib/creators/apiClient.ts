import { authHeaders } from "@/lib/scriptWriter/apiClient";
import type {
  Creator,
  CreatorApplicationStatus,
  CreatorCreateInput,
  CreatorDocumentKind,
  CreatorRelationshipType,
  CreatorUpdateInput,
} from "@/lib/creators/types";

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
