import {
  AGENT_API_PREFIX,
  DEFAULT_AGENT_BASE_URL,
  type AgentCreateFoldersResponse,
  type AgentDrivesResponse,
  type AgentHealthResponse,
  type AgentIndexFolderResponse,
  type AgentListDirResponse,
  type AgentProbeResponse,
  type AgentAnalyzeResponse,
  type AgentCopyVerifiedBatchFile,
  type AgentCopyVerifiedBatchResponse,
  type AgentFsRevealResponse,
  type AgentIngestCopyRequest,
  type AgentIngestCopyResponse,
  type AgentResolveDetectResponse,
  type AgentResolveImportEdlResponse,
  type AgentResolveOpenResponse,
  type AgentResolveScriptingProbeResponse,
  type AgentResolveWriteHandoffResponse,
  type AgentSafeDeleteFile,
  type AgentSafeDeleteResponse,
  type AgentProxyResponse,
  type AgentStorageStatResponse,
  type AgentThumbnailResponse,
} from "@/lib/aiEditor/agentProtocol";
import type { AgentStatus } from "@/lib/aiEditor/types";

async function agentFetch<T>(
  baseUrl: string,
  token: string,
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}${AGENT_API_PREFIX}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? res.statusText);
  return data;
}

export async function checkAgentHealth(
  baseUrl = DEFAULT_AGENT_BASE_URL
): Promise<AgentStatus> {
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}${AGENT_API_PREFIX}/health`, {
      cache: "no-store",
    });
    if (!res.ok) return { connected: false, error: `Agent HTTP ${res.status}` };
    const data = (await res.json()) as AgentHealthResponse;
    return {
      connected: true,
      version: data.version,
      platform: data.platform,
      gpuName: data.gpuName,
      vramGb: data.vramGb,
      ffmpegAvailable: data.ffmpegAvailable,
      ffprobeAvailable: data.ffprobeAvailable,
      whisperAvailable: data.whisperAvailable,
    };
  } catch {
    return {
      connected: false,
      error: "Desktop Agent not reachable on localhost",
    };
  }
}

export async function agentCreateFolders(
  baseUrl: string,
  token: string,
  projectRoot: string,
  cameraLabels?: string[]
) {
  return agentFetch<AgentCreateFoldersResponse>(baseUrl, token, "/folders/create", {
    method: "POST",
    body: JSON.stringify({ projectRoot, cameraLabels }),
  });
}

export async function agentIndexFolder(
  baseUrl: string,
  token: string,
  folderPath: string,
  recursive = true
) {
  return agentFetch<AgentIndexFolderResponse>(baseUrl, token, "/media/index", {
    method: "POST",
    body: JSON.stringify({ folderPath, recursive }),
  });
}

export async function agentProbe(baseUrl: string, token: string, filePath: string) {
  return agentFetch<AgentProbeResponse>(baseUrl, token, "/media/probe", {
    method: "POST",
    body: JSON.stringify({ filePath }),
  });
}

export async function agentThumbnail(baseUrl: string, token: string, filePath: string) {
  return agentFetch<AgentThumbnailResponse>(baseUrl, token, "/media/thumbnail", {
    method: "POST",
    body: JSON.stringify({ filePath }),
  });
}

export async function agentListDrives(baseUrl: string, token: string) {
  return agentFetch<AgentDrivesResponse>(baseUrl, token, "/fs/drives");
}

export async function agentListDir(baseUrl: string, token: string, dirPath: string) {
  return agentFetch<AgentListDirResponse>(baseUrl, token, "/fs/list", {
    method: "POST",
    body: JSON.stringify({ path: dirPath }),
  });
}

export async function agentCreateProxy(
  baseUrl: string,
  token: string,
  filePath: string,
  opts?: { outputPath?: string; profile?: "ai_720p" | "preview_1080p" }
) {
  return agentFetch<AgentProxyResponse>(baseUrl, token, "/media/proxy", {
    method: "POST",
    body: JSON.stringify({
      filePath,
      outputPath: opts?.outputPath,
      profile: opts?.profile ?? "ai_720p",
    }),
  });
}

export async function agentStorageStat(baseUrl: string, token: string, dirPath: string) {
  return agentFetch<AgentStorageStatResponse>(baseUrl, token, "/storage/stat", {
    method: "POST",
    body: JSON.stringify({ path: dirPath }),
  });
}

export async function agentIngestCopy(
  baseUrl: string,
  token: string,
  body: AgentIngestCopyRequest
) {
  return agentFetch<AgentIngestCopyResponse>(baseUrl, token, "/media/ingest-copy", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function agentAnalyze(
  baseUrl: string,
  token: string,
  filePath: string,
  opts?: { transcribe?: boolean }
) {
  return agentFetch<AgentAnalyzeResponse>(baseUrl, token, "/media/analyze", {
    method: "POST",
    body: JSON.stringify({
      filePath,
      transcribe: Boolean(opts?.transcribe),
    }),
  });
}

export async function agentCopyVerifiedBatch(
  baseUrl: string,
  token: string,
  files: AgentCopyVerifiedBatchFile[]
) {
  return agentFetch<AgentCopyVerifiedBatchResponse>(
    baseUrl,
    token,
    "/media/copy-verified-batch",
    {
      method: "POST",
      body: JSON.stringify({ files }),
    }
  );
}

export async function agentSafeDelete(
  baseUrl: string,
  token: string,
  body: {
    projectRoot: string;
    confirmPhrase: string;
    files: AgentSafeDeleteFile[];
    neverDeletePaths?: string[];
  }
) {
  return agentFetch<AgentSafeDeleteResponse>(baseUrl, token, "/media/safe-delete", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function agentResolveDetect(baseUrl: string, token: string) {
  return agentFetch<AgentResolveDetectResponse>(baseUrl, token, "/resolve/detect", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function agentWriteResolveHandoff(
  baseUrl: string,
  token: string,
  body: { projectRoot: string; files: Record<string, string>; relativeDir?: string }
) {
  return agentFetch<AgentResolveWriteHandoffResponse>(
    baseUrl,
    token,
    "/resolve/write-handoff",
    {
      method: "POST",
      body: JSON.stringify(body),
    }
  );
}

export async function agentOpenResolve(
  baseUrl: string,
  token: string,
  body?: {
    projectRoot?: string;
    handoffDir?: string;
    launch?: boolean;
    /** Open Explorer/Finder on the handoff folder (off by default — steals focus while Resolve loads). */
    reveal?: boolean;
  }
) {
  return agentFetch<AgentResolveOpenResponse>(baseUrl, token, "/resolve/open", {
    method: "POST",
    body: JSON.stringify(body ?? {}),
  });
}

export async function agentRevealPath(baseUrl: string, token: string, dirPath: string) {
  return agentFetch<AgentFsRevealResponse>(baseUrl, token, "/fs/reveal", {
    method: "POST",
    body: JSON.stringify({ path: dirPath }),
  });
}

export async function agentResolveScriptingProbe(baseUrl: string, token: string) {
  return agentFetch<AgentResolveScriptingProbeResponse>(
    baseUrl,
    token,
    "/resolve/scripting-probe",
    {
      method: "POST",
      body: JSON.stringify({}),
    }
  );
}

export async function agentResolveImportEdl(
  baseUrl: string,
  token: string,
  body: {
    projectRoot?: string;
    handoffDir?: string;
    edlFilename?: string;
    timelineName?: string;
  }
) {
  return agentFetch<AgentResolveImportEdlResponse>(baseUrl, token, "/resolve/import-edl", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** Local media URL for <video>/<audio> — token in query (browsers can't set Authorization on media elements). */
export function agentMediaStreamUrl(
  baseUrl: string,
  token: string,
  filePath: string,
  opts?: { startSeconds?: number; endSeconds?: number }
): string {
  const u = new URL(`${baseUrl.replace(/\/$/, "")}${AGENT_API_PREFIX}/media/stream`);
  u.searchParams.set("path", filePath);
  u.searchParams.set("token", token);
  // Media Fragments for in/out (best-effort; Chromium supports #t=)
  const start = opts?.startSeconds;
  const end = opts?.endSeconds;
  if (typeof start === "number" && start >= 0) {
    const frag =
      typeof end === "number" && end > start
        ? `t=${start.toFixed(3)},${end.toFixed(3)}`
        : `t=${start.toFixed(3)}`;
    return `${u.toString()}#${frag}`;
  }
  return u.toString();
}

/** Prefer proxy for smooth browser playback; fall back to active, then archive. */
export function playbackPathForAsset(asset: {
  proxyPath?: string;
  currentPath?: string;
  archivePath?: string;
}): string | null {
  const current = asset.currentPath?.trim();
  const archive = asset.archivePath?.trim();
  return asset.proxyPath || current || archive || null;
}
