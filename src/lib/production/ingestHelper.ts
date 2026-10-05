import { AGENT_API_PREFIX, DEFAULT_AGENT_BASE_URL } from "@/lib/aiEditor/agentProtocol";
import type { IngestCopyStatus, ProductionIngestClip, ProductionIngestSession } from "@/lib/production/ingestTypes";
import type { WaveformPair } from "@/lib/production/takeMatch";

export const INGEST_HELPER_URL = DEFAULT_AGENT_BASE_URL;

export type HelperDrive = {
  path: string;
  label: string;
  volumeLabel?: string;
  availableBytes?: number;
  capacityBytes?: number;
  storageType?: string;
};

export type HelperJobFile = {
  id: string;
  filename: string;
  sourcePath: string;
  destPath: string;
  status: IngestCopyStatus;
  error?: string;
  sizeBytes?: number;
  bytesCopied?: number;
  verification?: ProductionIngestClip["verification"];
  metadata?: {
    codec?: string;
    durationSeconds?: number;
    resolution?: string;
    frameRate?: number;
    recordedAt?: string;
    timecodeStart?: string;
    audioTracks?: number;
    sizeBytes?: number;
  };
  localThumbnailPath?: string;
  thumbnailDataUrl?: string;
  proxyStatus?: ProductionIngestClip["proxyStatus"];
  proxyError?: string;
  proxyPercent?: number | null;
  localProxyPath?: string;
};

export type HelperJob = {
  id: string;
  status: "queued" | "running" | "complete";
  filesCompleted: number;
  totalFiles: number;
  bytesCopied: number;
  totalBytes: number;
  currentFile: string | null;
  bytesPerSecond: number;
  files: HelperJobFile[];
};

async function helperFetch<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${INGEST_HELPER_URL}${AGENT_API_PREFIX}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(data.error || "Local helper request failed");
  return data;
}

export async function helperHealth(): Promise<{ connected: boolean; version?: string; platform?: string }> {
  try {
    const res = await fetch(`${INGEST_HELPER_URL}${AGENT_API_PREFIX}/health`, { cache: "no-store" });
    if (!res.ok) return { connected: false };
    const data = (await res.json()) as { version?: string; platform?: string };
    return { connected: true, version: data.version, platform: data.platform };
  } catch {
    return { connected: false };
  }
}

export async function registerHelperSession(token: string, projectId: string, expiresAt: string) {
  const res = await fetch(`${INGEST_HELPER_URL}${AGENT_API_PREFIX}/session/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, projectId, expiresAt }),
  });
  const data = (await res.json()) as { error?: string };
  if (!res.ok) throw new Error(data.error || "Could not register the local helper session");
}

export async function helperDrives(token: string): Promise<HelperDrive[]> {
  const data = await helperFetch<{ drives: HelperDrive[] }>(token, "/fs/drives");
  return data.drives || [];
}

export async function helperIndex(token: string, folderPath: string) {
  const data = await helperFetch<{ files: { path: string; filename: string; sizeBytes: number; mtimeMs?: number }[] }>(
    token,
    "/media/index",
    { method: "POST", body: JSON.stringify({ folderPath, recursive: true }) }
  );
  return data.files || [];
}

export async function helperStartJob(
  token: string,
  files: { id: string; sourcePath: string; destPath: string }[],
  generateProxies = false
): Promise<HelperJob> {
  const data = await helperFetch<{ job: HelperJob }>(token, "/production/ingest/jobs", {
    method: "POST",
    body: JSON.stringify({ files, generateProxies }),
  });
  return data.job;
}

export async function helperQueueProxies(
  token: string,
  files: { id: string; originalPath: string; proxyPath: string; durationSeconds?: number }[]
): Promise<HelperJob> {
  const data = await helperFetch<{ job: HelperJob }>(token, "/production/ingest/proxies", {
    method: "POST",
    body: JSON.stringify({ files }),
  });
  return data.job;
}

export async function helperMatchAudio(
  token: string,
  files: { id: string; path: string }[]
): Promise<{ pairs: WaveformPair[]; skipped: { id: string; error: string }[] }> {
  return helperFetch(token, "/production/ingest/audio-match", {
    method: "POST",
    body: JSON.stringify({ files }),
  });
}

export async function helperJob(token: string, jobId: string): Promise<HelperJob> {
  const data = await helperFetch<{ job: HelperJob }>(token, `/production/ingest/jobs/${jobId}`);
  return data.job;
}

export function applyHelperJob(session: ProductionIngestSession, job: HelperJob): ProductionIngestSession {
  const byId = new Map(job.files.map((file) => [file.id, file]));
  return {
    ...session,
    copyCapability: "local_helper",
    clips: session.clips.map((clip) => {
      const file = byId.get(clip.id);
      if (!file) return clip;
      const meta = file.metadata;
      const copyStatus = file.status;
      return {
        ...clip,
        copyStatus,
        verificationStatus: copyStatus === "verified" ? "verified" : copyStatus === "failed" || copyStatus === "conflict" ? "failed" : "waiting",
        verification: file.verification,
        localSourcePath: file.sourcePath || clip.localSourcePath,
        localDestinationPath: file.destPath || clip.localDestinationPath,
        localThumbnailPath: file.localThumbnailPath || clip.localThumbnailPath,
        localProxyPath: file.localProxyPath || clip.localProxyPath,
        proxyError: file.proxyError,
        proxyPercent: file.proxyPercent,
        thumbnailUrl: file.thumbnailDataUrl || clip.thumbnailUrl,
        codec: meta?.codec || clip.codec,
        durationSeconds: meta?.durationSeconds ?? clip.durationSeconds,
        resolution: meta?.resolution || clip.resolution,
        frameRate: meta?.frameRate ?? clip.frameRate,
        recordedAt: meta?.recordedAt || clip.recordedAt,
        timeSource: meta?.recordedAt ? "camera" : clip.timeSource,
        timecodeStart: meta?.timecodeStart || clip.timecodeStart,
        audioTracks: meta?.audioTracks ?? clip.audioTracks,
        sizeBytes: file.sizeBytes || meta?.sizeBytes || clip.sizeBytes,
        proxyStatus: file.proxyStatus || clip.proxyStatus,
      };
    }),
  };
}
