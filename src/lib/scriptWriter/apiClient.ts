import { ScriptWriterBrief } from "@/lib/scriptWriter/brief";
import {
  ScriptInspirationImage,
  ScriptInspirationUrl,
  ScriptInspirationVideo,
  ScriptVideoReferenceMode,
} from "@/lib/scriptWriter/types";

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
    workflowMode?: "text" | "inspiration";
  }
) {
  const res = await fetch("/api/script-writer/sessions", {
    method: "POST",
    headers: await authHeaders(getToken),
    body: JSON.stringify(body),
  });
  return parseJson<{ ok: true; id: string; session: unknown; readyToWrite?: boolean }>(res);
}

export async function scriptWriterAnalyzeInspiration(
  getToken: () => Promise<string | null>,
  sessionId: string,
  body: {
    images: ScriptInspirationImage[];
    video?: ScriptInspirationVideo | null;
    urls?: Pick<ScriptInspirationUrl, "id" | "url" | "tag" | "label" | "referenceMode">[];
  }
) {
  const res = await fetch(`/api/script-writer/sessions/${sessionId}/analyze`, {
    method: "POST",
    headers: await authHeaders(getToken),
    body: JSON.stringify(body),
  });
  return parseJson<{ session: unknown; analysis: unknown }>(res);
}

export async function scriptWriterConfirmAnalysis(
  getToken: () => Promise<string | null>,
  sessionId: string,
  notes?: string
) {
  const res = await fetch(`/api/script-writer/sessions/${sessionId}/confirm-analysis`, {
    method: "POST",
    headers: await authHeaders(getToken),
    body: JSON.stringify({ notes }),
  });
  return parseJson<{ session: unknown }>(res);
}

export async function scriptWriterRefineScript(
  getToken: () => Promise<string | null>,
  sessionId: string,
  message: string
) {
  const res = await fetch(`/api/script-writer/sessions/${sessionId}/refine`, {
    method: "POST",
    headers: await authHeaders(getToken),
    body: JSON.stringify({ message }),
  });
  return parseJson<{ session: unknown }>(res);
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

export type PendingInspirationImage = {
  id: string;
  file: File;
  tag: ScriptInspirationImage["tag"];
  label: string;
};

export type PendingInspirationVideo = {
  id: string;
  file: File;
  referenceMode: ScriptVideoReferenceMode;
};

export type PendingInspirationUrl = {
  id: string;
  url: string;
  tag: ScriptInspirationUrl["tag"];
  label: string;
  referenceMode?: ScriptVideoReferenceMode;
};
