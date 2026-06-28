import { ScriptWriterBrief } from "@/lib/scriptWriter/brief";

export const SCRIPT_WRITER_SESSIONS_COLLECTION = "scriptWriterSessions";

export async function authHeaders(getToken: () => Promise<string | null>): Promise<HeadersInit> {
  const token = await getToken();
  if (!token) throw new Error("Not signed in");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function parseJson<T>(res: Response): Promise<T> {
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? res.statusText);
  return data;
}

export async function scriptWriterCreateSession(
  getToken: () => Promise<string | null>,
  body: {
    initialIdea: string;
    brief?: ScriptWriterBrief;
    title?: string;
    linkedProjectId?: string;
    linkedScoutProjectId?: string;
  }
) {
  const res = await fetch("/api/script-writer/sessions", {
    method: "POST",
    headers: await authHeaders(getToken),
    body: JSON.stringify(body),
  });
  return parseJson<{ ok: true; id: string; session: unknown }>(res);
}

export async function scriptWriterGetSession(
  getToken: () => Promise<string | null>,
  sessionId: string
) {
  const res = await fetch(`/api/script-writer/sessions/${sessionId}`, {
    headers: await authHeaders(getToken),
  });
  return parseJson<{ session: unknown }>(res);
}

export async function scriptWriterListSessions(getToken: () => Promise<string | null>) {
  const res = await fetch("/api/script-writer/sessions", {
    headers: await authHeaders(getToken),
  });
  return parseJson<{ sessions: unknown[] }>(res);
}

export async function scriptWriterSendMessage(
  getToken: () => Promise<string | null>,
  sessionId: string,
  message: string
) {
  const res = await fetch(`/api/script-writer/sessions/${sessionId}/chat`, {
    method: "POST",
    headers: await authHeaders(getToken),
    body: JSON.stringify({ message }),
  });
  return parseJson<{ session: unknown; readyToWrite: boolean }>(res);
}

export async function scriptWriterGenerateScript(
  getToken: () => Promise<string | null>,
  sessionId: string
) {
  const res = await fetch(`/api/script-writer/sessions/${sessionId}/generate`, {
    method: "POST",
    headers: await authHeaders(getToken),
  });
  return parseJson<{ session: unknown }>(res);
}

export async function scriptWriterApplyToProject(
  getToken: () => Promise<string | null>,
  sessionId: string,
  body: {
    projectId: string;
    createScout?: boolean;
    updateExistingScout?: boolean;
  }
) {
  const res = await fetch(`/api/script-writer/sessions/${sessionId}/apply`, {
    method: "POST",
    headers: await authHeaders(getToken),
    body: JSON.stringify(body),
  });
  return parseJson<{
    ok: true;
    projectId: string;
    scoutProjectId?: string;
    productionBoardId?: string;
  }>(res);
}
