export type MediaSourceType =
  | "cameraCard"
  | "audioRecorderCard"
  | "externalSSD"
  | "externalHDD"
  | "genericMedia"
  | "unknown";

export type DetectedMediaFile = {
  path: string;
  filename: string;
  sizeBytes: number;
  mtimeMs?: number;
};

/** Raw probe from Desktop Agent (filesystem facts only). */
export type MediaSourceProbe = {
  mountPath: string;
  label?: string;
  volumeLabel?: string;
  volumeIdentifier?: string;
  removable?: boolean;
  storageType?: string;
  busType?: string;
  mediaType?: string;
  driveType?: string;
  availableBytes?: number;
  capacityBytes?: number;
  /** Top-level directory names under the mount. */
  topLevelDirs: string[];
  /** Best guess media root (may equal mount). */
  mediaRoot: string;
  files: DetectedMediaFile[];
};

export type DetectedMediaSource = {
  id: string;
  sourceType: MediaSourceType;
  manufacturer?: string;
  probableCameraModel?: string;
  /** User-facing media medium guess (never claim CF-A unless confident). */
  mediaMediumLabel: string;
  mediaRoot: string;
  mountPath: string;
  volumeIdentifier?: string;
  clipCount: number;
  totalBytes: number;
  confidence: number;
  /** Why we think this (for UI / debug). */
  reasons: string[];
  suggestedCameraAssignment?: string;
  files: DetectedMediaFile[];
  removable?: boolean;
  storageType?: string;
  label?: string;
};
