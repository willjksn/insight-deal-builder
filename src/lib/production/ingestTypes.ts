export const INGEST_SOURCE_KINDS = ["cfexpress", "sd", "folder", "ssd", "other"] as const;
export type IngestSourceKind = (typeof INGEST_SOURCE_KINDS)[number];

export const INGEST_SOURCE_LABELS: Record<IngestSourceKind, string> = {
  cfexpress: "CFexpress Type A",
  sd: "SD card",
  folder: "Local folder",
  ssd: "External SSD",
  other: "Other",
};

export const INGEST_CAMERA_SLOTS = ["A", "B", "C", "other"] as const;
export type IngestCameraSlot = (typeof INGEST_CAMERA_SLOTS)[number];

export const INGEST_CAMERA_LABELS: Record<IngestCameraSlot, string> = {
  A: "Camera A",
  B: "Camera B",
  C: "Camera C",
  other: "Other",
};

/** Examples only. Any camera body label is allowed. */
export const INGEST_CAMERA_BODY_EXAMPLES = ["FX3", "FX30", "a7IV"];

export const INGEST_COPY_STATUSES = ["waiting", "copying", "copied", "verifying", "verified", "failed", "conflict"] as const;
export type IngestCopyStatus = (typeof INGEST_COPY_STATUSES)[number];

export const INGEST_COPY_LABELS: Record<IngestCopyStatus, string> = {
  waiting: "Waiting",
  copying: "Copying",
  copied: "Copied",
  verifying: "Verifying",
  verified: "Verified",
  failed: "Failed",
  conflict: "Conflict",
};

export type IngestProxyStatus = "none" | "queued" | "generating" | "ready" | "failed";

export interface IngestVerification {
  algorithm: "sha256";
  sourceChecksum: string;
  destinationChecksum: string;
  verifiedAt: string;
  result: "match" | "identical" | "mismatch" | "conflict";
}

export interface ProductionIngestClip {
  id: string;
  filename: string;
  originalFilename: string;
  cameraSlot: IngestCameraSlot;
  cameraBody?: string;
  sourceCard?: string;
  /** Relative path seen by the browser scan, or the helper source path. */
  sourcePath?: string;
  /** Project-folder reference such as 01_ORIGINAL_MEDIA/CAMERA_A/clip.mov. Not a cloud URL. */
  destinationPath?: string;
  /** Absolute path on this computer. Not a cloud URL. */
  localSourcePath?: string;
  /** Absolute destination path on this computer. Not a cloud URL. */
  localDestinationPath?: string;
  /** Absolute poster path on this computer. Not a cloud URL. */
  localThumbnailPath?: string;
  /** Absolute review proxy path. Not a cloud URL and not a replacement for the original. */
  localProxyPath?: string;
  proxyError?: string;
  proxyPercent?: number | null;
  durationSeconds?: number;
  frameRate?: number;
  resolution?: string;
  recordedAt?: string;
  /** camera: probe creation time. filesystem: file modified time, less precise. */
  timeSource?: "camera" | "filesystem";
  timecodeStart?: string;
  timecodeEnd?: string;
  codec?: string;
  audioTracks?: number;
  sizeBytes?: number;
  copyStatus: IngestCopyStatus;
  verificationStatus: "waiting" | "verified" | "failed";
  verification?: IngestVerification;
  proxyStatus: IngestProxyStatus;
  thumbnailUrl?: string;
  thumbnailPath?: string;
  linkedShotId?: string | null;
  suggestedShotId?: string | null;
  suggestionReason?: string;
  notes?: string;
  rating?: number | null;
  preferred?: boolean;
}

export interface ProductionIngestSession {
  id: string;
  projectId: string;
  sourceKind: IngestSourceKind;
  sourceLabel?: string;
  cardName?: string;
  cameraSlot: IngestCameraSlot;
  cameraBody?: string;
  /** Project-folder reference. Originals are not uploaded. */
  destinationPath?: string;
  /** Absolute destination folder when the local helper is connected. */
  localDestinationRoot?: string;
  /** Absolute source folder when the local helper scanned the card. */
  localSourceRoot?: string;
  /** When true, the helper queues a review proxy after a clip verifies. */
  generateProxiesAfterVerify?: boolean;
  createdAt: string;
  /** metadata_only: browser indexed names. local_helper: desktop agent copied and verified. */
  copyCapability: "metadata_only" | "local_helper";
  clips: ProductionIngestClip[];
}

export type TakeConfidence = "high" | "medium" | "low";
export type TakeGroupState = "suggested" | "confirmed";

export interface TakeGroupMember {
  clipId: string;
  /** Seconds relative to the group's reference clip. Positive means this clip starts later. */
  offsetSeconds?: number;
}

export interface TakeGroup {
  id: string;
  projectId: string;
  productionShotId?: string | null;
  members: TakeGroupMember[];
  takeNumber?: number | null;
  startTime?: string;
  endTime?: string;
  preferredVideoClipId?: string | null;
  preferredAudioClipId?: string | null;
  confidence: TakeConfidence;
  confidenceScore: number;
  matchReasons: string[];
  state: TakeGroupState;
  origin: "auto" | "manual";
  /** Clips that later analysis wants to add. Confirmed groups are not changed until the user accepts. */
  pendingClipIds?: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
