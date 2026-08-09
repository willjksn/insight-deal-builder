import type {
  ContentPlan,
  ContentPlanGenerateSection,
  ContentPlanInputs,
} from "@/lib/contentPlan/types";

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

export async function listContentPlans(getToken: GetToken) {
  const res = await fetch("/api/content-plans", {
    headers: await authHeaders(getToken),
  });
  return parseJson<{ plans: ContentPlan[] }>(res);
}

export async function createContentPlan(
  getToken: GetToken,
  body: { inputs: ContentPlanInputs; title?: string }
) {
  const res = await fetch("/api/content-plans", {
    method: "POST",
    headers: await authHeaders(getToken),
    body: JSON.stringify(body),
  });
  return parseJson<{ plan: ContentPlan }>(res);
}

export async function getContentPlan(getToken: GetToken, id: string) {
  const res = await fetch(`/api/content-plans/${id}`, {
    headers: await authHeaders(getToken),
  });
  return parseJson<{ plan: ContentPlan }>(res);
}

export async function updateContentPlan(
  getToken: GetToken,
  id: string,
  patch: Partial<
    Pick<
      ContentPlan,
      | "inputs"
      | "title"
      | "teachMe"
      | "shots"
      | "coveragePlan"
      | "shootOrderPlan"
      | "checklist"
    >
  >
) {
  const res = await fetch(`/api/content-plans/${id}`, {
    method: "PATCH",
    headers: await authHeaders(getToken),
    body: JSON.stringify(patch),
  });
  return parseJson<{ plan: ContentPlan }>(res);
}

export async function deleteContentPlan(getToken: GetToken, id: string) {
  const res = await fetch(`/api/content-plans/${id}`, {
    method: "DELETE",
    headers: await authHeaders(getToken),
  });
  return parseJson<{ ok: true; id: string }>(res);
}

export async function cloneContentPlan(getToken: GetToken, id: string) {
  const res = await fetch(`/api/content-plans/${id}/clone`, {
    method: "POST",
    headers: await authHeaders(getToken),
  });
  return parseJson<{ plan: ContentPlan }>(res);
}

export async function generateContentPlan(
  getToken: GetToken,
  id: string,
  section: ContentPlanGenerateSection = "all"
) {
  const res = await fetch(`/api/content-plans/${id}/generate`, {
    method: "POST",
    headers: await authHeaders(getToken),
    body: JSON.stringify({ section }),
  });
  return parseJson<{ plan: ContentPlan }>(res);
}

export async function createProjectFromContentPlan(
  getToken: GetToken,
  id: string,
  body?: { projectName?: string; existingProjectId?: string }
) {
  const res = await fetch(`/api/content-plans/${id}/create-project`, {
    method: "POST",
    headers: await authHeaders(getToken),
    body: JSON.stringify(body || {}),
  });
  return parseJson<{
    ok: true;
    projectId: string;
    scriptSessionId: string;
    productionBoardId: string;
    plan: ContentPlan;
  }>(res);
}

export async function syncLinkedProjectFromContentPlan(
  getToken: GetToken,
  id: string
) {
  const res = await fetch(`/api/content-plans/${id}/sync-project`, {
    method: "POST",
    headers: await authHeaders(getToken),
  });
  return parseJson<{
    ok: true;
    projectId: string;
    scriptSessionId: string;
    productionBoardId: string;
    plan: ContentPlan;
  }>(res);
}

export async function refineContentPlan(
  getToken: GetToken,
  id: string,
  body: { instruction: string; target: string; shotId?: string }
) {
  const res = await fetch(`/api/content-plans/${id}/refine`, {
    method: "POST",
    headers: await authHeaders(getToken),
    body: JSON.stringify(body),
  });
  return parseJson<{ plan: ContentPlan }>(res);
}

export async function downloadContentPlanExport(
  getToken: GetToken,
  id: string,
  format: "json" | "text"
) {
  const token = await getToken();
  if (!token) throw new Error("Not signed in");
  const res = await fetch(`/api/content-plans/${id}/export?format=${format}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error || "Export failed");
  }
  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="([^"]+)"/);
  const filename = match?.[1] || `content-plan.${format === "json" ? "json" : "txt"}`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
