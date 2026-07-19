async function authFetch(
  getIdToken: () => Promise<string>,
  url: string,
  body?: unknown
): Promise<Response> {
  const token = await getIdToken();
  return fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export type GenerateFrameResult = {
  dayId: string;
  shotId: string;
  referenceImageUrl: string;
  referenceImageStoragePath?: string;
  referenceImageSource: "ai_generate";
};

export async function generateCoverageFrame(
  getIdToken: () => Promise<string>,
  projectId: string,
  params: { dayId: string; shotId: string; force?: boolean }
): Promise<GenerateFrameResult> {
  const res = await authFetch(
    getIdToken,
    `/api/projects/${projectId}/coverage/generate-frame`,
    params
  );
  const data = (await res.json()) as GenerateFrameResult & { error?: string };
  if (!res.ok) throw new Error(data.error || "Failed to generate frame");
  return data;
}

export type GenerateFramesBatchResult = {
  generated: GenerateFrameResult[];
  errors: Array<{ dayId: string; shotId: string; error: string }>;
  remaining: number;
  message?: string;
};

export async function generateCoverageFramesBatch(
  getIdToken: () => Promise<string>,
  projectId: string,
  params?: { dayId?: string; onlyMissing?: boolean; limit?: number }
): Promise<GenerateFramesBatchResult> {
  const res = await authFetch(
    getIdToken,
    `/api/projects/${projectId}/coverage/generate-frames`,
    params ?? {}
  );
  const data = (await res.json()) as GenerateFramesBatchResult & { error?: string };
  if (!res.ok) throw new Error(data.error || "Failed to generate frames");
  return data;
}
