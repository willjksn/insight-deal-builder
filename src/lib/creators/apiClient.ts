import { authHeaders } from "@/lib/scriptWriter/apiClient";
import type { Creator, CreatorCreateInput, CreatorUpdateInput } from "@/lib/creators/types";

type GetToken = () => Promise<string | null>;

async function parseJson<T>(res: Response): Promise<T> {
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? res.statusText);
  return data;
}

export async function listCreators(getToken: GetToken): Promise<Creator[]> {
  const res = await fetch("/api/creators", { headers: await authHeaders(getToken) });
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
