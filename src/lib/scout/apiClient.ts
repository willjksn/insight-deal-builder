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
