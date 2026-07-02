import { authHeaders } from "@/lib/scriptWriter/apiClient";
import { SharedNotesResponse, SharedResourceNote } from "@/lib/sharedNotes/types";

async function parseJson<T>(res: Response): Promise<T> {
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? res.statusText);
  return data;
}

function notesUrl(resourceType: "script" | "scout", resourceId: string): string {
  return resourceType === "script"
    ? `/api/script-writer/sessions/${resourceId}/notes`
    : `/api/scout/${resourceId}/notes`;
}

export async function fetchSharedNotes(
  getToken: () => Promise<string | null>,
  resourceType: "script" | "scout",
  resourceId: string,
  options?: { adminOpen?: boolean }
): Promise<SharedNotesResponse> {
  const params = new URLSearchParams();
  if (options?.adminOpen) params.set("adminOpen", "1");
  const qs = params.toString();
  const url = `${notesUrl(resourceType, resourceId)}${qs ? `?${qs}` : ""}`;
  const res = await fetch(url, { headers: await authHeaders(getToken) });
  return parseJson<SharedNotesResponse>(res);
}

export async function postSharedNote(
  getToken: () => Promise<string | null>,
  resourceType: "script" | "scout",
  resourceId: string,
  body: string,
  options?: { adminOpen?: boolean }
): Promise<{ note: SharedResourceNote } & SharedNotesResponse> {
  const params = new URLSearchParams();
  if (options?.adminOpen) params.set("adminOpen", "1");
  const qs = params.toString();
  const url = `${notesUrl(resourceType, resourceId)}${qs ? `?${qs}` : ""}`;
  const res = await fetch(url, {
    method: "POST",
    headers: await authHeaders(getToken),
    body: JSON.stringify({ body }),
  });
  return parseJson<{ note: SharedResourceNote } & SharedNotesResponse>(res);
}
