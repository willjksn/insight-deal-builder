/** Shared contract between ShootSpine web and Desktop Agent (localhost). */

export const DEFAULT_AGENT_BASE_URL = "http://127.0.0.1:17865";
export const AGENT_API_PREFIX = "/v1";

export type AgentHealthResponse = {
  ok: true;
  version: string;
  platform: string;
  gpuName?: string;
  vramGb?: number;
  ffmpegAvailable?: boolean;
  ffprobeAvailable?: boolean;
  whisperAvailable?: boolean;
};

export type AgentCreateFoldersRequest = {
  projectRoot: string;
  cameraLabels?: string[];
};

export type AgentCreateFoldersResponse = {
  ok: true;
  created: string[];
  projectRoot: string;
};

export type AgentIndexFolderRequest = {
  folderPath: string;
  recursive?: boolean;
};

export type AgentIndexedFile = {
  path: string;
  filename: string;
  sizeBytes: number;
  mtimeMs?: number;
};

export type AgentIndexFolderResponse = {
  ok: true;
  files: AgentIndexedFile[];
};

export type AgentProbeRequest = {
  filePath: string;
};

export type AgentProbeResponse = {
  ok: true;
  probe: Record<string, unknown>;
};

export type AgentThumbnailRequest = {
  filePath: string;
  /** Optional output directory; defaults beside source under .shootspine-thumbs */
  outputDir?: string;
};

export type AgentThumbnailResponse = {
  ok: true;
  path?: string;
  /** Small JPEG data URL when generation succeeds; omit if too large / failed */
  dataUrl?: string;
};

export type AgentDriveEntry = {
  path: string;
  label: string;
  kind: "drive" | "volume" | "home" | "desktop" | "documents" | "videos" | "other";
};

export type AgentDrivesResponse = {
  ok: true;
  drives: AgentDriveEntry[];
};

export type AgentFsEntry = {
  name: string;
  path: string;
  kind: "dir" | "file";
};

export type AgentListDirResponse = {
  ok: true;
  path: string;
  parentPath: string | null;
  entries: AgentFsEntry[];
};

export type AgentProxyRequest = {
  filePath: string;
  /** Destination .mp4 path; agent may choose a sibling path if omitted */
  outputPath?: string;
  /** AI analysis proxy profile */
  profile?: "ai_720p" | "preview_1080p";
};

export type AgentProxyResponse = {
  ok: true;
  proxyPath: string;
  profile: string;
};

export type AgentStorageStatResponse = {
  ok: true;
  path: string;
  availableBytes?: number;
  capacityBytes?: number;
  online?: boolean;
  writable?: boolean;
};

export type AgentCopyVerifiedResponse = {
  ok: true;
  sourcePath: string;
  destPath: string;
  sizeBytes: number;
  checksum: string;
  checksumAlgorithm: "sha256";
  verified: true;
};

export type AgentIngestCopyFile = {
  sourcePath: string;
  filename?: string;
  sizeBytes?: number;
};

export type AgentIngestCopyRequest = {
  projectRoot: string;
  cameraLabel?: string;
  files: AgentIngestCopyFile[];
  generateProxies?: boolean;
};

export type AgentIngestCopyResult = {
  sourcePath: string;
  destPath: string;
  filename: string;
  sizeBytes: number;
  checksum: string;
  checksumAlgorithm: "sha256";
  verified: true;
  relativeProjectPath: string;
  cameraAssignment: string;
  proxyPath?: string;
};

export type AgentIngestCopyResponse = {
  ok: true;
  projectRoot: string;
  cameraLabel: string;
  requiredBytes: number;
  space: {
    path: string;
    availableBytes?: number;
    capacityBytes?: number;
  };
  results: AgentIngestCopyResult[];
};

export type AgentResolveDetectResponse = {
  ok: true;
  installed: boolean;
  platform: "win32" | "darwin" | "linux" | "unknown";
  appPath?: string;
  scriptingAvailable: boolean;
  scriptingApiPath?: string;
  scriptingLibPath?: string;
  note: string;
};

export type AgentResolveWriteHandoffResponse = {
  ok: true;
  handoffDir: string;
  relativeDir: string;
  written: string[];
};

export type AgentResolveOpenResponse = {
  ok: true;
  detect: Omit<AgentResolveDetectResponse, "ok">;
  launched: boolean;
  revealed: boolean;
  actions: string[];
  message: string;
};

export type AgentFsRevealResponse = {
  ok: true;
  revealed: string;
  method: string;
};

export type AgentCopyVerifiedBatchFile = {
  id?: string;
  sourcePath: string;
  destPath: string;
};

export type AgentCopyVerifiedBatchResponse = {
  ok: true;
  count: number;
  results: Array<{
    id: string | null;
    sourcePath: string;
    destPath: string;
    sizeBytes: number;
    checksum: string;
    checksumAlgorithm: "sha256";
    verified: true;
  }>;
};

export type AgentSafeDeleteFile = {
  id?: string;
  path: string;
  expectedChecksum?: string;
};

export type AgentSafeDeleteResponse = {
  ok: true;
  count: number;
  results: Array<{ id: string | null; path: string; deleted: true }>;
};

export type AgentAnalyzeResponse = {
  ok: true;
  probe: Record<string, unknown>;
  technical: {
    readable: boolean;
    codec?: string;
    resolution?: string;
    frameRate?: number;
    durationSeconds?: number;
    hasAudio?: boolean;
    audioChannels?: number;
    issues: string[];
    confidence: number;
  };
  shots: Array<{
    index: number;
    startSeconds: number;
    endSeconds: number;
    confidence: number;
    shotSize?: string;
    movement?: string;
  }>;
  shotMethod?: string;
  transcript: {
    available: boolean;
    segments: Array<{
      index: number;
      startSeconds: number;
      endSeconds: number;
      text: string;
      confidence: number;
    }>;
    language?: string;
    error?: string;
  };
};
