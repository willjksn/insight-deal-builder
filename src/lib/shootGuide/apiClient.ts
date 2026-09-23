import type { ShootGuide, ShootGuideCreateInput, ShootGuidePatch } from "./types";

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
      typeof data.error === "string" ? data.error : "Request failed"
    );
  }
  return data;
}

export async function listShootGuides(getToken: GetToken) {
  const res = await fetch("/api/shoot-guide", {
    headers: await authHeaders(getToken),
  });
  return parseJson<{ guides: ShootGuide[] }>(res);
}

export async function createShootGuide(getToken: GetToken, body: ShootGuideCreateInput) {
  const res = await fetch("/api/shoot-guide", {
    method: "POST",
    headers: await authHeaders(getToken),
    body: JSON.stringify(body),
  });
  return parseJson<{ guide: ShootGuide }>(res);
}

export async function getShootGuide(getToken: GetToken, id: string) {
  const res = await fetch(`/api/shoot-guide/${id}`, {
    headers: await authHeaders(getToken),
  });
  return parseJson<{ guide: ShootGuide }>(res);
}

export async function updateShootGuide(getToken: GetToken, id: string, patch: ShootGuidePatch) {
  const res = await fetch(`/api/shoot-guide/${id}`, {
    method: "PATCH",
    headers: await authHeaders(getToken),
    body: JSON.stringify(patch),
  });
  return parseJson<{ guide: ShootGuide }>(res);
}

export async function deleteShootGuide(getToken: GetToken, id: string) {
  const res = await fetch(`/api/shoot-guide/${id}`, {
    method: "DELETE",
    headers: await authHeaders(getToken),
  });
  return parseJson<{ ok: true; id: string }>(res);
}

export async function generateShootGuide(
  getToken: GetToken,
  id: string,
  body?: { stage?: string; shotId?: string; instruction?: string }
) {
  const res = await fetch(`/api/shoot-guide/${id}/generate`, {
    method: "POST",
    headers: await authHeaders(getToken),
    body: JSON.stringify(body ?? { stage: "all" }),
  });
  return parseJson<{ guide: ShootGuide }>(res);
}
