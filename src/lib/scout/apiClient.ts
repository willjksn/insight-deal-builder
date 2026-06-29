import { auth } from "@/lib/firebase/config";
import { ScoutProject, ScoutImageLabel } from "./types";

async function authHeaders(): Promise<HeadersInit> {
  if (!auth?.currentUser) throw new Error("Not signed in");
  const idToken = await auth.currentUser.getIdToken();
  return { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" };
}

export async function scoutCreateProject(
  data: Omit<ScoutProject, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const res = await fetch("/api/scout/projects", {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(data),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? "Failed to create scout session");
  return body.id as string;
}

export async function scoutRegisterImage(
  scoutProjectId: string,
  data: {
    imageId: string;
    storagePath: string;
    storageUrl: string;
    label?: ScoutImageLabel;
  }
) {
  const res = await fetch(`/api/scout/${scoutProjectId}/images`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(data),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? "Failed to save image");
  return body;
}

export async function scoutDeleteSession(scoutProjectId: string): Promise<void> {
  const res = await fetch(`/api/scout/${scoutProjectId}`, {
    method: "DELETE",
    headers: await authHeaders(),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? "Failed to delete scout session");
}

export async function scoutAnalyze(scoutProjectId: string) {
  const res = await fetch(`/api/scout/${scoutProjectId}/analyze`, {
    method: "POST",
    headers: await authHeaders(),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? "Analysis failed");
  return body;
}

export async function scoutGenerateDpPlan(scoutProjectId: string) {
  const res = await fetch(`/api/scout/${scoutProjectId}/dp-plan`, {
    method: "POST",
    headers: await authHeaders(),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? "DP plan failed");
  return body;
}

export async function scoutGenerateShotList(scoutProjectId: string) {
  const res = await fetch(`/api/scout/${scoutProjectId}/shot-list`, {
    method: "POST",
    headers: await authHeaders(),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? "Shot list failed");
  return body;
}

export async function scoutGeneratePreview(scoutProjectId: string) {
  const res = await fetch(`/api/scout/${scoutProjectId}/preview`, {
    method: "POST",
    headers: await authHeaders(),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? "Preview failed");
  return body;
}

export async function scoutSaveShotList(
  scoutProjectId: string,
  shots: import("./types").ScoutShotListItem[]
) {
  const res = await fetch(`/api/scout/${scoutProjectId}/shot-list`, {
    method: "PATCH",
    headers: await authHeaders(),
    body: JSON.stringify({ shots }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? "Failed to save shot list");
  return body as { ok: true; shotList: import("./types").ScoutShotList; project: unknown };
}

export async function scoutFetchHistory(scoutProjectId: string, kind: import("./scoutHistory").ScoutHistoryKind) {
  const res = await fetch(`/api/scout/${scoutProjectId}/history?kind=${encodeURIComponent(kind)}`, {
    headers: await authHeaders(),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? "Failed to load history");
  return body as { entries: import("./scoutHistoryLabels").ScoutHistoryEntry[] };
}

export async function scoutRestoreHistory(
  scoutProjectId: string,
  kind: import("./scoutHistory").ScoutHistoryKind,
  documentId: string
) {
  const res = await fetch(`/api/scout/${scoutProjectId}/history`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ kind, documentId }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? "Failed to restore");
  return body as { ok: true; project: unknown };
}

export type ScoutGearSuggestion = {
  cameraBody: string;
  lensOptions: string;
  lightingGear: string;
  audioGear: string;
  stabilizationGear: string;
  rationale: string;
};

export async function scoutSuggestGear(
  data: Omit<ScoutGearSuggestion, "rationale"> & {
    sceneIdea: string;
    sceneType: string;
    mood: string;
    theme?: string;
    platform: string;
    aspectRatio: string;
    skillLevel: string;
    preferredLook: string;
    selectedGearProfileId?: string;
    rationale?: string;
  }
): Promise<ScoutGearSuggestion> {
  const res = await fetch("/api/scout/suggest-gear", {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(data),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? "Gear suggestion failed");
  return body.suggestion as ScoutGearSuggestion;
}

export async function scoutTechniqueLookup(
  scoutProjectId: string,
  query?: string
): Promise<{ lookup: unknown; project: unknown }> {
  const res = await fetch(`/api/scout/${scoutProjectId}/technique-lookup`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(query ? { query } : {}),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? "Technique lookup failed");
  return body;
}
