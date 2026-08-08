/** Storage purpose buckets. */
export type StoragePurpose = "active" | "cache" | "proxy" | "archive" | "backup";

export type StorageType =
  | "internal"
  | "externalSSD"
  | "externalHDD"
  | "network"
  | "NAS"
  | "removable"
  | "cloud"
  | "unknown";

export type MediaOnlineStatus = "online" | "offline" | "unknown";
export type MediaIngestStatus = "indexed" | "copying" | "verified" | "failed" | "in_place";
export type MediaAnalysisStatus = "none" | "queued" | "running" | "complete" | "failed";
export type MediaType = "video" | "audio" | "image" | "other";

export type AiEditorJobType =
  | "create_folders"
  | "index_folder"
  | "probe"
  | "thumbnail"
  | "ingest_copy"
  | "proxy"
  | "transcribe"
  | "analyze"
  | "match"
  | "rough_cut"
  | "chat_edit"
  | "edit_notes"
  | "shot_detect"
  | "archive"
  | "restore"
  | "reclaim"
  | "resolve_export"
  | "resolve_open"
  | "resolve_import"
  | "resolve_sync"
  | "planning_feedback"
  | "next_shoot_checklist"
  | "board_handoff"
  | "finishing"
  | "feedback";

export type AiEditorJobStatus =
  | "queued"
  | "running"
  | "paused"
  | "completed"
  | "failed"
  | "cancelled";

export interface StorageLocation {
  id: string;
  userId: string;
  organizationCompany?: string;
  name: string;
  type: StorageType;
  purpose: StoragePurpose;
  /** Absolute path on the machine that registered it (Windows/macOS). */
  path: string;
  volumeIdentifier?: string;
  deviceIdentifier?: string;
  filesystem?: string;
  capacityBytes?: number;
  availableBytes?: number;
  online: boolean;
  writable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AiEditorProjectSettings {
  id: string; // projectId
  projectId: string;
  activeStorageLocationId?: string;
  projectRootPath?: string;
  projectRootRelativeName?: string;
  /** User-authorized archive root (external HDD / NAS). Never hard-coded. */
  archiveRootPath?: string;
  ingestMode?: "managed" | "existing_folder" | "in_place";
  cameraLabels?: string[];
  agentLastSeenAt?: string;
  /** V3 — last wrap-up after finishing in Resolve. */
  lastFinishingFeedback?: FinishingFeedback;
  /** V5 — last read-only snapshot from the open Resolve timeline. */
  lastResolveSync?: ResolveSyncSnapshot;
  /** V6 — planning notes derived from Resolve cut vs rough cut / coverage. */
  lastPlanningFeedback?: PlanningFeedback;
  /** V8 — checkable next-shoot list derived from planning feedback + coverage. */
  nextShootChecklist?: NextShootChecklist;
  /** V9 — last time checklist was sent to production board filming notes. */
  lastBoardHandoffAt?: string;
  /** Edit notes from set / client / look — fed into Edit by Chat. */
  editNotes?: EditNote[];
  createdAt: string;
  updatedAt: string;
}

export interface MediaAsset {
  id: string;
  projectId: string;
  userId: string;
  filename: string;
  originalFilename: string;
  extension: string;
  mediaType: MediaType;
  sizeBytes?: number;
  checksum?: string;
  checksumAlgorithm?: "sha256" | "xxhash64";
  /** Portable path under ProjectRoot, e.g. 01_ORIGINAL_MEDIA/CAMERA_A/clip.mp4 */
  relativeProjectPath?: string;
  currentPath?: string;
  archivePath?: string;
  proxyPath?: string;
  storageLocationId?: string;
  volumeIdentifier?: string;
  cameraAssignment?: string;
  /** Number of verified copies known to ShootSpine (camera card never auto-erased). */
  verifiedCopyCount?: number;
  cameraMake?: string;
  cameraModel?: string;
  codec?: string;
  /** ShootSpine codec family, e.g. xavc_hs */
  codecFamily?: string;
  codecLabel?: string;
  /** True when preview/AI should use a proxy (XAVC HS/S/S-I, HEVC, etc.). */
  needsProxy?: boolean;
  codecNote?: string;
  container?: string;
  resolution?: string;
  frameRate?: number;
  durationSeconds?: number;
  durationFrames?: number;
  videoBitrate?: number;
  audioChannels?: number;
  audioSampleRate?: number;
  creationTime?: string;
  startTimecode?: string;
  endTimecode?: string;
  reelName?: string;
  clipName?: string;
  thumbnailDataUrl?: string;
  onlineStatus: MediaOnlineStatus;
  ingestStatus: MediaIngestStatus;
  analysisStatus: MediaAnalysisStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AiEditorJob {
  id: string;
  projectId: string;
  userId: string;
  type: AiEditorJobType;
  status: AiEditorJobStatus;
  progress: number;
  message?: string;
  error?: string;
  retryCount: number;
  payload?: Record<string, unknown>;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductionContextScene {
  sceneNumber?: string;
  heading?: string;
  summary?: string;
  characters?: string[];
}

export interface ProductionContextShot {
  id: string;
  dayId?: string;
  scene?: string;
  shotName?: string;
  shotType?: string;
  camera?: string;
  lens?: string;
  movement?: string;
  description?: string;
  hasFrame: boolean;
}

export interface ProductionContext {
  projectId: string;
  projectName: string;
  projectType?: string;
  shootType?: string;
  /** True when this is a footage-only AI Editor workspace (no production plan). */
  aiEditorOnly?: boolean;
  description?: string;
  clientName?: string;
  status?: string;
  scriptSessionId?: string;
  scriptTitle?: string;
  logline?: string;
  scenes: ProductionContextScene[];
  characters: string[];
  locations: string[];
  people: string[];
  shootDays: { id: string; dayNumber: number; date?: string; locationName?: string }[];
  shots: ProductionContextShot[];
  shotCount: number;
  framedShotCount: number;
  targetRuntime?: string;
  aspectRatio?: string;
  notes?: string[];
}

/** V1D — clip ↔ planned-shot matching */
export type CoverageShotStatus = "covered" | "partial" | "missing" | "multi_take";

export interface MatchDialogueLine {
  character: string;
  line: string;
}

export interface MatchCandidate {
  mediaAssetId: string;
  filename: string;
  score: number;
  reasons: string[];
  durationSeconds?: number;
  cameraAssignment?: string;
}

export interface PreferredTakeOverride {
  plannedShotId: string;
  mediaAssetId: string;
}

export interface CoverageShotRow {
  plannedShotId: string;
  dayId?: string;
  scene?: string;
  shotName?: string;
  shotType?: string;
  status: CoverageShotStatus;
  candidates: MatchCandidate[];
  preferredMediaAssetId?: string;
  preferredScore?: number;
  preferredManual?: boolean;
}

export interface CoverageReport {
  projectId: string;
  updatedAt: string;
  plannedShotCount: number;
  coveredCount: number;
  partialCount: number;
  missingCount: number;
  unmatchedMediaIds: string[];
  shots: CoverageShotRow[];
  overrides: PreferredTakeOverride[];
  notes?: string[];
}

/** V1E — internal timeline (not Resolve’s model) */
export type TimelineTrackKind = "video" | "audio";

/** V1.6 — outgoing transition after this clip (suggestions for Resolve). */
export type TransitionType = "cut" | "dissolve" | "fade";

export type TransitionStyleId = "cuts" | "soft_dissolves" | "fade_between";

export type FinishingMoodId =
  | "natural"
  | "warm"
  | "cool"
  | "cinematic"
  | "high_energy";

/** Where an edit note came from (shoot, client call, look direction, etc.). */
export type EditNoteSource = "shooting" | "client" | "look" | "general";

export interface EditNote {
  id: string;
  text: string;
  source: EditNoteSource;
  createdAt: string;
}

/** V3 — what happened after Resolve, for next-edit defaults. */
export type FinishingFeedbackOutcome =
  | "kept_look"
  | "tweaked_in_resolve"
  | "started_fresh";

export interface FinishingFeedback {
  moodId: FinishingMoodId;
  moodLabel: string;
  transitionStyle: TransitionStyleId;
  transitionLabel: string;
  outcome: FinishingFeedbackOutcome;
  note?: string;
  updatedAt: string;
}

/** V5/V6 — clip entry from the open Resolve timeline. */
export interface ResolveSyncClip {
  name?: string;
  track?: number;
  /** Timeline start frame in Resolve (absolute). */
  startFrame?: number;
  durationFrames?: number;
  /** Source in-point on the media (Resolve left offset), when available. */
  sourceInFrame?: number;
}

/** V5 — read-only snapshot of the open Resolve timeline. */
export interface ResolveSyncSnapshot {
  projectName?: string;
  timelineName?: string;
  startFrame?: number;
  endFrame?: number;
  durationFrames?: number;
  durationSeconds?: number;
  frameRate?: number;
  videoTrackCount?: number;
  audioTrackCount?: number;
  videoClipCount?: number;
  /** V6 — up to 200 video items from Resolve (names for matching). */
  clips?: ResolveSyncClip[];
  edlExported?: boolean;
  edlPath?: string | null;
  syncedAt?: string;
}

/** V6 — next-shoot / finishing insights from Resolve vs rough cut. */
export type PlanningInsightSeverity = "info" | "suggest" | "action";

export interface PlanningFeedbackInsight {
  id: string;
  severity: PlanningInsightSeverity;
  text: string;
}

export interface PlanningFeedback {
  timelineName?: string;
  keptCount: number;
  droppedCount: number;
  onlyInResolveCount: number;
  droppedLabels: string[];
  onlyInResolveLabels: string[];
  insights: PlanningFeedbackInsight[];
  lengthHint?: "rough" | "longer" | "shorter" | "similar" | "unknown";
  updatedAt: string;
}

/** V8 — actionable next-shoot row (AI Editor checklist). */
export type NextShootChecklistKind =
  | "missing_shot"
  | "preferred_dropped"
  | "dropped_in_finish"
  | "insight";

export interface NextShootChecklistItem {
  id: string;
  kind: NextShootChecklistKind;
  severity: PlanningInsightSeverity;
  label: string;
  plannedShotId?: string;
  done: boolean;
}

export interface NextShootChecklist {
  items: NextShootChecklistItem[];
  updatedAt: string;
  sourceTimelineName?: string;
}

export interface ClipTransitionOut {
  type: TransitionType;
  durationFrames: number;
}

export interface FinishingPlan {
  moodId: FinishingMoodId;
  moodLabel: string;
  lookNotes: string[];
  resolveHint: string;
  transitionStyle: TransitionStyleId;
  transitionLabel: string;
  transitionType: TransitionType;
  transitionDurationFrames: number;
  updatedAt: string;
}

export interface TimelineClip {
  id: string;
  mediaAssetId: string;
  trackId: string;
  /** Inclusive start on the timeline, in frames. */
  timelineStartFrame: number;
  /** In-point in source media frames. */
  sourceInFrame: number;
  durationFrames: number;
  label?: string;
  plannedShotId?: string;
  /** Organizational reel/act this clip belongs to (feature-length projects). */
  reelId?: string;
  /** How this clip should leave into the next (Resolve applies). */
  transitionOut?: ClipTransitionOut;
}

/** Act / reel / scene group for long-form editing. */
export type TimelineReelKind = "act" | "reel" | "scene_group";

export interface TimelineReel {
  id: string;
  name: string;
  kind: TimelineReelKind;
  sortOrder: number;
  /** Soft target length (e.g. 20 min reel or ~35 min act). */
  targetDurationSeconds?: number;
}

export interface TimelineTrack {
  id: string;
  kind: TimelineTrackKind;
  name: string;
  clips: TimelineClip[];
}

export interface Timeline {
  id: string;
  projectId: string;
  name: string;
  frameRate: number;
  tracks: TimelineTrack[];
  /** Acts / reels for feature-length work; optional for short form. */
  reels?: TimelineReel[];
  /** Reel Edit by Chat / preview should focus on. */
  activeReelId?: string;
  /** V1.6 mood + transition suggestions for Resolve finishing. */
  finishing?: FinishingPlan;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface TimelineVersion {
  id: string;
  timelineId: string;
  projectId: string;
  version: number;
  note?: string;
  snapshot: Timeline;
  createdAt: string;
}

export type TimelineEditOp =
  | {
      type: "insert";
      trackId?: string;
      mediaAssetId: string;
      timelineStartFrame?: number;
      sourceInFrame?: number;
      durationFrames: number;
      label?: string;
      plannedShotId?: string;
    }
  | {
      type: "trim";
      clipId: string;
      sourceInFrame?: number;
      durationFrames?: number;
    }
  | {
      type: "move";
      clipId: string;
      timelineStartFrame: number;
    }
  | {
      type: "rippleDelete";
      clipId: string;
    }
  | {
      type: "split";
      clipId: string;
      atTimelineFrame: number;
    }
  | {
      type: "reorder";
      trackId: string;
      clipIds: string[];
    };

export interface AgentSession {
  token: string;
  projectId: string;
  userId: string;
  expiresAt: string;
  agentBaseUrl: string;
}

export interface AgentStatus {
  connected: boolean;
  version?: string;
  platform?: string;
  gpuName?: string;
  vramGb?: number;
  ffmpegAvailable?: boolean;
  ffprobeAvailable?: boolean;
  whisperAvailable?: boolean;
  error?: string;
}
