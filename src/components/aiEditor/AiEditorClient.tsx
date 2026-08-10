"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Clapperboard,
  Copy,
  FolderOpen,
  HardDrive,
  Loader2,
  Monitor,
  Pencil,
  Play,
  RefreshCw,
  Sparkles,
  Star,
  Wifi,
  WifiOff,
} from "lucide-react";
import { FolderPicker } from "@/components/aiEditor/FolderPicker";
import { CameraLabelPicker } from "@/components/aiEditor/CameraLabelPicker";
import { GuidedFootagePanel } from "@/components/aiEditor/GuidedFootagePanel";
import {
  ManagedIngestReview,
  type ManagedIngestOptions,
} from "@/components/aiEditor/ManagedIngestReview";
import { MediaPreview, type PreviewItem } from "@/components/aiEditor/MediaPreview";
import { PostIngestSafetyCallout } from "@/components/aiEditor/PostIngestSafetyCallout";
import { ResolveCoachPanel } from "@/components/aiEditor/ResolveCoachPanel";
import { ShootModeShotMeta } from "@/components/production/ShootModeShotMeta";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAuth } from "@/contexts/AuthContext";
import { DEFAULT_AGENT_BASE_URL } from "@/lib/aiEditor/agentProtocol";
import {
  agentAnalyze,
  agentCopyVerifiedBatch,
  agentCreateFolders,
  agentCreateProxy,
  agentDetectSources,
  agentIndexFolder,
  agentIngestCopy,
  agentMediaStreamUrl,
  agentOpenResolve,
  agentProbe,
  agentResolveImportEdl,
  agentResolveScriptingProbe,
  agentResolveSyncFromNle,
  agentListDrives,
  agentRegisterSession,
  agentRevealPath,
  agentRenameDir,
  agentSafeDelete,
  agentStorageStat,
  agentThumbnail,
  agentWriteResolveHandoff,
  checkAgentHealth,
  playbackPathForAsset,
  sourcePathForProxy,
} from "@/lib/aiEditor/agentClient";
import {
  inferManagedProjectRootFromMedia,
  resolveLiveProjectRoot,
} from "@/lib/aiEditor/inferProjectRoot";
import { planManagedProjectFolderRename } from "@/lib/aiEditor/projectFolderRename";
import type { AgentDriveEntry } from "@/lib/aiEditor/agentProtocol";
import { driveActionGates } from "@/lib/aiEditor/driveActionGates";
import { assessDrivePresence } from "@/lib/aiEditor/drivePresence";
import { buildProjectRecommendations } from "@/lib/aiEditor/recommendations";
import {
  findRemountCandidates,
  planMediaRemount,
  volumeIdForPath,
  type RemountCandidate,
} from "@/lib/aiEditor/remountPaths";
import {
  driveForPath,
  friendlyDriveLabel,
  inferStorageTypeForPath,
  buildIngestDestinationDrives,
  storageTypeLabel,
} from "@/lib/aiEditor/storageDrives";
import { buildManagedMediaRoot } from "@/lib/aiEditor/mediaPathBuilder";
import { planPreferredTakeRenames } from "@/lib/aiEditor/shotListClipNames";
import {
  buildGuidedWorkspaceFromDrive,
  pickBestCameraSource,
  planGuidedCamera,
  planGuidedWorkspace,
} from "@/lib/aiEditor/guidedWorkspace";
import { assessStorageHealth } from "@/lib/aiEditor/storageHealth";
import {
  assessAgentVersion,
  isAgentVersionAtLeast,
  MIN_DESKTOP_AGENT_VERSION,
  MIN_PROJECT_FOLDER_RENAME_AGENT_VERSION,
  MIN_RESOLVE_LAUNCH_AGENT_VERSION,
} from "@/lib/aiEditor/agentVersion";
import {
  detectMediaSources,
  type DetectedMediaSource,
} from "@/lib/aiEditor/cameraDetectors/detectMediaSource";
import {
  getWorkflowNextStep,
  writeResumeBookmark,
} from "@/lib/aiEditor/workflowNextStep";
import { buildDisplayStepNumbers } from "@/lib/aiEditor/visibleSteps";
import {
  RESOLVE_HANDOFF_FILES,
  RESOLVE_HANDOFF_REL_DIR,
  activeHandoffDir,
  resolveHandoffAbsoluteDir,
} from "@/lib/aiEditor/resolveBridge";
import {
  canReclaimActiveCopy,
  planArchiveBatch,
  SAFE_DELETE_CONFIRM_PHRASE,
  summarizeArchiveState,
} from "@/lib/aiEditor/archive";
import {
  MOOD_PRESETS,
  TRANSITION_PRESETS,
  summarizeFinishing,
} from "@/lib/aiEditor/finishing";
import {
  importResultMessage,
  summarizeResolveProbeFailure,
  summarizeResolveWorkflow,
  type ResolveWorkflowStatus,
} from "@/lib/aiEditor/resolveWorkflow";
import type { FinishingMoodId, TransitionStyleId } from "@/lib/aiEditor/types";
import { framesToSeconds, secondsToFrames } from "@/lib/aiEditor/frames";
import type { ClipAnalysisBundle } from "@/lib/aiEditor/analysis";
import { formatBytes } from "@/lib/aiEditor/checksum";
import { assetNeedsBrowserProxy } from "@/lib/aiEditor/codecs";
import {
  isIngestableMediaExtension,
  isRoughCutVideoAsset,
} from "@/lib/aiEditor/mediaFormats";
import {
  aiEditorArchiveAction,
  aiEditorCreateFoldersJob,
  aiEditorGetDashboard,
  aiEditorIndexMedia,
  aiEditorLaunchAgent,
  aiEditorLogManagedIngest,
  aiEditorLogResolveOpen,
  aiEditorMintAgentSession,
  aiEditorRenameSession,
  aiEditorPatchMedia,
  aiEditorRunMatch,
  aiEditorSaveAnalysis,
  aiEditorBoardHandoff,
  aiEditorCrossProjectInsights,
  aiEditorNextShootChecklist,
  aiEditorSaveEditNotes,
  aiEditorSaveFeedback,
  aiEditorSaveResolveSync,
  aiEditorSaveStorage,
  aiEditorChatEdit,
  aiEditorExportResolve,
  aiEditorTimelineAction,
  type ChatEditProposalClient,
} from "@/lib/aiEditor/apiClient";
import {
  FEATURE_DEFAULT_RUNTIME_SECONDS,
  MAX_CHAT_CONTEXT_CLIPS,
} from "@/lib/aiEditor/limits";
import { summarizeReels } from "@/lib/aiEditor/reels";
import {
  FEEDBACK_OUTCOMES,
  defaultsForLookStep,
  defaultsFromFeedback,
  summarizeFeedback,
} from "@/lib/aiEditor/feedback";
import { buildResolvePreflightTips } from "@/lib/aiEditor/resolvePreflight";
import {
  EDIT_NOTE_SOURCES,
  PROPOSE_FROM_NOTES_MESSAGE,
  createEditNote,
  sourceLabel,
} from "@/lib/aiEditor/editNotes";
import { checklistProgress } from "@/lib/aiEditor/nextShootChecklist";
import { summarizePlanningFeedback } from "@/lib/aiEditor/planningFeedback";
import {
  compareResolveToRoughCut,
  summarizeResolveSync,
  type ResolveSyncCompare,
} from "@/lib/aiEditor/resolveSync";
import { timelineDurationFrames } from "@/lib/aiEditor/timeline";
import type {
  EditNote,
  EditNoteSource,
  FinishingFeedbackOutcome,
  NextShootChecklist,
  PlanningFeedback,
} from "@/lib/aiEditor/types";
import { isAiEditorEnabled } from "@/lib/aiEditor/featureFlag";
import { mockMediaEngine } from "@/lib/aiEditor/mediaEngine";
import {
  describePostIngestCardWipe,
  summarizeMediaSafety,
  type PostIngestSafetyView,
} from "@/lib/aiEditor/mediaSafety";
import { framesToTimecode } from "@/lib/aiEditor/frames";
import type {
  AgentStatus,
  AiEditorJob,
  AiEditorProjectSettings,
  CoverageReport,
  MediaAsset,
  ProductionContext,
  StorageLocation,
  Timeline,
  TimelineVersion,
} from "@/lib/aiEditor/types";

const AGENT_CONNECT_MSG = "Connect this computer first";

type IngestQueueItem = {
  id: string;
  sourcePath: string;
  cameraLabel: string;
  prepare: boolean;
};

type Props = { projectId: string };

function StepBadge({ n, done }: { n: number; done?: boolean }) {
  return (
    <span
      className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
        done
          ? "bg-emerald-100 text-emerald-800"
          : "bg-sky-100 text-sky-800"
      }`}
    >
      {done ? <CheckCircle2 className="h-4 w-4" /> : n}
    </span>
  );
}

export function AiEditorClient({ projectId }: Props) {
  const { user } = useAuth();
  const getToken = useCallback(async () => (user ? user.getIdToken() : null), [user]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const cancelBatchRef = useRef(false);
  const copyAbortRef = useRef<AbortController | null>(null);
  /** Pre-Drop timeline version ids for Undo in Play review (session stack). */
  const reviewUndoStackRef = useRef<string[]>([]);
  const [batchStopping, setBatchStopping] = useState(false);
  const [context, setContext] = useState<ProductionContext | null>(null);
  const [settings, setSettings] = useState<AiEditorProjectSettings | null>(null);
  const [storage, setStorage] = useState<StorageLocation[]>([]);
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [jobs, setJobs] = useState<AiEditorJob[]>([]);
  const [agent, setAgent] = useState<AgentStatus>({ connected: false });
  const [storagePath, setStoragePath] = useState("");
  const [indexFolderPath, setIndexFolderPath] = useState("");
  const [knownDrives, setKnownDrives] = useState<AgentDriveEntry[]>([]);
  const [remountCandidates, setRemountCandidates] = useState<RemountCandidate[]>([]);
  const [editDriveOnline, setEditDriveOnline] = useState<boolean | null>(null);
  const [archiveDriveOnline, setArchiveDriveOnline] = useState<boolean | null>(null);
  const [agentToken, setAgentToken] = useState<string | null>(null);
  const [agentExpiresAt, setAgentExpiresAt] = useState<string | null>(null);
  const [statusNote, setStatusNote] = useState<string | null>(null);
  /** Sticky wipe guidance after managed card ingest. */
  const [postIngestSafety, setPostIngestSafety] = useState<PostIngestSafetyView | null>(
    null
  );
  const [createProjectFolders, setCreateProjectFolders] = useState(true);
  const [addMode, setAddMode] = useState<"in_place" | "copy">("in_place");
  const [cameraLabel, setCameraLabel] = useState("CAMERA_A");
  const [prepareWhileCopying, setPrepareWhileCopying] = useState(true);
  const [detectedSources, setDetectedSources] = useState<DetectedMediaSource[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [detectScanning, setDetectScanning] = useState(false);
  const [ingestShootLabel, setIngestShootLabel] = useState("");
  const [ingestOptions, setIngestOptions] = useState<ManagedIngestOptions>({
    verifyCopy: true,
    generateProxies: true,
    generateThumbnails: true,
    extractMetadata: true,
    analyzeDuringIngest: false,
    copyToArchive: false,
  });
  const [ingestDestFreeBytes, setIngestDestFreeBytes] = useState<number | null>(null);
  const [diskNote, setDiskNote] = useState<string | null>(null);
  const [ingestQueue, setIngestQueue] = useState<IngestQueueItem[]>([]);
  /** Files found on a card/folder awaiting selective copy. */
  const [pendingCopyFiles, setPendingCopyFiles] = useState<
    Array<{ path: string; filename: string; sizeBytes: number }> | null
  >(null);
  const [selectedCopyPaths, setSelectedCopyPaths] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState<{ pct: number; label: string } | null>(null);
  const [analysis, setAnalysis] = useState<ClipAnalysisBundle[]>([]);
  const [coverage, setCoverage] = useState<CoverageReport | null>(null);
  const [timeline, setTimeline] = useState<Timeline | null>(null);
  const [timelineVersions, setTimelineVersions] = useState<TimelineVersion[]>([]);
  const [transcriptQuery, setTranscriptQuery] = useState("");
  const [runTranscription, setRunTranscription] = useState(false);
  const [preview, setPreview] = useState<{
    title: string;
    items: PreviewItem[];
    token: string;
    /** Remount key when opening a new Play session. */
    sessionKey: string;
    /** Rough-cut review: allow Drop from cut. */
    reviewCut?: boolean;
  } | null>(null);
  const [reviewUndoDepth, setReviewUndoDepth] = useState(0);
  const [chatMessage, setChatMessage] = useState("");
  const [chatProposal, setChatProposal] = useState<{
    proposal: ChatEditProposalClient;
    descriptions: string[];
    validationOk: boolean;
    validationErrors: string[];
  } | null>(null);
  const [editNotes, setEditNotes] = useState<EditNote[]>([]);
  const [editNoteDraft, setEditNoteDraft] = useState("");
  const [editNoteSource, setEditNoteSource] = useState<EditNoteSource>("client");
  const [exportFiles, setExportFiles] = useState<Record<string, string> | null>(null);
  /** Invalidate cached Resolve export when the timeline changes. */
  const [exportStamp, setExportStamp] = useState<string | null>(null);
  /** Cut changed after a Resolve package was saved/imported this session. */
  const [resolvePackageStale, setResolvePackageStale] = useState(false);
  const [handoffDirOnDisk, setHandoffDirOnDisk] = useState<string | null>(null);
  const [finishWhere, setFinishWhere] = useState<"here" | "mac">("here");
  const [moodId, setMoodId] = useState<FinishingMoodId>("natural");
  const [transitionStyle, setTransitionStyle] = useState<TransitionStyleId>("cuts");
  const [resolveWorkflow, setResolveWorkflow] = useState<ResolveWorkflowStatus | null>(null);
  const [resolveImported, setResolveImported] = useState(false);
  const [resolveSyncCompare, setResolveSyncCompare] = useState<ResolveSyncCompare | null>(
    null
  );
  const [planningFeedback, setPlanningFeedback] = useState<PlanningFeedback | null>(null);
  const [nextShootChecklist, setNextShootChecklist] = useState<NextShootChecklist | null>(
    null
  );
  const [feedbackOutcome, setFeedbackOutcome] =
    useState<FinishingFeedbackOutcome>("kept_look");
  const [feedbackNote, setFeedbackNote] = useState("");
  const [feedbackHint, setFeedbackHint] = useState<string | null>(null);
  const [archivePath, setArchivePath] = useState("");
  const [reclaimConfirm, setReclaimConfirm] = useState("");
  const [copiedProjectName, setCopiedProjectName] = useState(false);
  const [editingProjectName, setEditingProjectName] = useState(false);
  /** Guided Steps 2–3; advanced folder pickers stay collapsed. */
  const [showAdvancedFootage, setShowAdvancedFootage] = useState(false);
  /** User override for guided destination drive root (e.g. H:\). */
  const [guidedDriveRoot, setGuidedDriveRoot] = useState<string | null>(null);
  const [projectNameDraft, setProjectNameDraft] = useState("");
  const [renamingProject, setRenamingProject] = useState(false);
  const folderHealKeyRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      if (!user) throw new Error("Not signed in");
      const dash = await aiEditorGetDashboard(getToken, projectId);
      setContext(dash.context);
      setSettings(dash.settings);
      setStorage(dash.storage);
      setMedia(dash.media);
      setJobs(dash.jobs);
      setAnalysis(dash.analysis ?? []);
      setCoverage(dash.coverage ?? null);
      setTimeline(dash.timeline ?? null);
      setTimelineVersions(dash.timelineVersions ?? []);
      if (dash.settings?.projectRootPath) {
        setStoragePath(dash.settings.projectRootPath);
        setIndexFolderPath(dash.settings.projectRootPath);
      }
      if (dash.settings?.archiveRootPath) {
        setArchivePath(dash.settings.archiveRootPath);
      }
      if (dash.settings?.lastPlanningFeedback) {
        setPlanningFeedback(dash.settings.lastPlanningFeedback);
      }
      setNextShootChecklist(dash.settings?.nextShootChecklist ?? null);
      setEditNotes(dash.settings?.editNotes ?? []);
      if (dash.timeline?.finishing?.moodId) {
        setMoodId(dash.timeline.finishing.moodId);
        if (dash.timeline.finishing.transitionStyle) {
          setTransitionStyle(dash.timeline.finishing.transitionStyle);
        }
      } else {
        let crossProject: {
          moodId: FinishingMoodId;
          transitionStyle: TransitionStyleId;
          hint: string;
        } | null = null;
        if (!dash.settings?.lastFinishingFeedback) {
          try {
            const insightRes = await aiEditorCrossProjectInsights(getToken);
            if (insightRes.lookDefaults) {
              crossProject = {
                moodId: insightRes.lookDefaults.moodId,
                transitionStyle: insightRes.lookDefaults.transitionStyle,
                hint: insightRes.lookDefaults.hint,
              };
            }
          } catch {
            /* hub patterns are optional */
          }
        }
        const defaults = defaultsForLookStep({
          feedback: dash.settings?.lastFinishingFeedback,
          crossProject,
        });
        setMoodId(defaults.moodId);
        setTransitionStyle(defaults.transitionStyle);
        setFeedbackHint(defaults.hint);
      }
      if (dash.settings?.lastFinishingFeedback?.outcome) {
        setFeedbackOutcome(dash.settings.lastFinishingFeedback.outcome);
      }
      if (dash.settings?.lastFinishingFeedback?.note) {
        setFeedbackNote(dash.settings.lastFinishingFeedback.note);
      }
      const resolveJobs = (dash.jobs ?? []).filter(
        (j) =>
          (j.type === "resolve_import" || j.type === "resolve_open") &&
          j.status === "completed"
      );
      setResolveImported(resolveJobs.some((j) => j.type === "resolve_import"));
      const priorHandoff = resolveJobs
        .map((j) => j.payload?.handoffDir)
        .find((d): d is string => typeof d === "string" && d.trim().length > 0);
      const mediaRoot = inferManagedProjectRootFromMedia(dash.media ?? []);
      const root = resolveLiveProjectRoot({
        settingsRoot: dash.settings?.projectRootPath,
        mediaRoot,
        projectName: dash.context?.projectName,
      });
      const handoff = activeHandoffDir(root, priorHandoff);
      // Only keep a prior job path when it still belongs to the live project root.
      if (handoff && priorHandoff && handoff === priorHandoff.trim().replace(/[/\\]+$/, "")) {
        setHandoffDirOnDisk(priorHandoff);
      } else if (handoff && root) {
        setHandoffDirOnDisk(handoff);
      } else {
        setHandoffDirOnDisk(null);
      }
      const health = await checkAgentHealth(DEFAULT_AGENT_BASE_URL);
      setAgent(health);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load AI Editor");
    } finally {
      setLoading(false);
    }
  }, [getToken, projectId, user]);

  useEffect(() => {
    if (!isAiEditorEnabled()) return;
    void load();
  }, [load]);

  const ensureAgentSession = useCallback(async (): Promise<string> => {
    const register = async (token: string, expiresAt?: string | null) => {
      await agentRegisterSession(DEFAULT_AGENT_BASE_URL, {
        token,
        expiresAt: expiresAt || undefined,
        projectId,
      });
    };

    if (agentToken) {
      try {
        await register(agentToken, agentExpiresAt);
        return agentToken;
      } catch {
        // Agent may have restarted or token expired - mint a fresh one.
      }
    }

    const { session } = await aiEditorMintAgentSession(getToken, projectId);
    await register(session.token, session.expiresAt);
    setAgentToken(session.token);
    setAgentExpiresAt(session.expiresAt);
    return session.token;
  }, [agentExpiresAt, agentToken, getToken, projectId]);

  const thumbBackfillAttempted = useRef(new Set<string>());

  useEffect(() => {
    setPendingCopyFiles(null);
    setSelectedCopyPaths(new Set());
  }, [indexFolderPath, addMode]);

  // Generate preview stills for clips that were ingested without thumbnails.
  useEffect(() => {
    if (!agent.connected || loading || !!busy) return;
    const missing = media.filter((m) => {
      if (m.thumbnailDataUrl) return false;
      if (thumbBackfillAttempted.current.has(m.id)) return false;
      if (!isIngestableMediaExtension(m.filename)) return false;
      const mt = (m.mediaType || "").toLowerCase();
      if (mt === "audio" || mt === "image") return false;
      return Boolean(playbackPathForAsset(m));
    });
    if (!missing.length) return;
    let cancelled = false;
    void (async () => {
      try {
        const token = await ensureAgentSession();
        const patches: Array<{ id: string; thumbnailDataUrl: string }> = [];
        for (const m of missing.slice(0, 40)) {
          if (cancelled) return;
          thumbBackfillAttempted.current.add(m.id);
          const path = playbackPathForAsset(m);
          if (!path) continue;
          try {
            const thumb = await agentThumbnail(DEFAULT_AGENT_BASE_URL, token, path);
            if (thumb.dataUrl) {
              patches.push({ id: m.id, thumbnailDataUrl: thumb.dataUrl });
            }
          } catch {
            /* best-effort */
          }
        }
        if (cancelled || !patches.length) return;
        await aiEditorPatchMedia(getToken, projectId, patches);
        if (cancelled) return;
        setMedia((prev) =>
          prev.map((m) => {
            const p = patches.find((x) => x.id === m.id);
            return p ? { ...m, thumbnailDataUrl: p.thumbnailDataUrl } : m;
          })
        );
      } catch {
        /* optional */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [agent.connected, media, loading, busy, ensureAgentSession, getToken, projectId]);

  useEffect(() => {
    if (!agent.connected || !settings?.projectRootPath) return;
    let cancelled = false;

    async function checkPresence() {
      try {
        const token = await ensureAgentSession();
        const res = await agentListDrives(DEFAULT_AGENT_BASE_URL, token);
        if (cancelled) return;
        setKnownDrives(res.drives);

        const editPath = settings?.projectRootPath?.trim();
        if (editPath) {
          try {
            const stat = await agentStorageStat(DEFAULT_AGENT_BASE_URL, token, editPath);
            if (!cancelled) setEditDriveOnline(stat.online !== false);
          } catch {
            if (!cancelled) setEditDriveOnline(null);
          }
        }
        const archive = settings?.archiveRootPath?.trim();
        if (archive) {
          try {
            const stat = await agentStorageStat(DEFAULT_AGENT_BASE_URL, token, archive);
            if (!cancelled) setArchiveDriveOnline(stat.online !== false);
          } catch {
            if (!cancelled) setArchiveDriveOnline(null);
          }
        } else if (!cancelled) {
          setArchiveDriveOnline(null);
        }
      } catch {
        /* presence check is best-effort */
      }
    }

    void checkPresence();
    const interval = window.setInterval(() => void checkPresence(), 45000);
    const onFocus = () => void checkPresence();
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [
    agent.connected,
    ensureAgentSession,
    settings?.projectRootPath,
    settings?.projectRootVolumeId,
    settings?.archiveRootPath,
    settings?.archiveRootVolumeId,
  ]);

  useEffect(() => {
    if (!settings || !knownDrives.length) {
      setRemountCandidates([]);
      return;
    }
    const found = findRemountCandidates({
      projectRootPath: settings.projectRootPath,
      archiveRootPath: settings.archiveRootPath,
      projectRootVolumeId: settings.projectRootVolumeId,
      archiveRootVolumeId: settings.archiveRootVolumeId,
      storage,
      drives: knownDrives,
    });
    setRemountCandidates((prev) => {
      if (
        prev.length === found.length &&
        prev.every(
          (p, i) =>
            p.kind === found[i].kind &&
            p.oldPath === found[i].oldPath &&
            p.newPath === found[i].newPath
        )
      ) {
        return prev;
      }
      return found;
    });
  }, [knownDrives, settings, storage]);

  const needsPrepare = useMemo(
    () =>
      media.filter(
        (m) => assetNeedsBrowserProxy(m) && playbackPathForAsset(m)
      ),
    [media]
  );
  const preparedCount = useMemo(
    () => media.filter((m) => !assetNeedsBrowserProxy(m)).length,
    [media]
  );
  const safety = useMemo(() => summarizeMediaSafety(media), [media]);
  const ingestDestinationDrives = useMemo(
    () => buildIngestDestinationDrives(knownDrives, detectedSources),
    [knownDrives, detectedSources]
  );
  const guidedCameraPlan = useMemo(() => {
    if (selectedSourceId) {
      const selected = detectedSources.find((s) => s.id === selectedSourceId);
      if (selected) {
        const model = selected.probableCameraModel || selected.label || "Camera";
        return {
          source: selected,
          title: `${model} · ${selected.clipCount} clip${selected.clipCount === 1 ? "" : "s"}`,
          detail: `${formatBytes(selected.totalBytes)} from ${selected.mountPath}`,
        };
      }
    }
    return planGuidedCamera(detectedSources);
  }, [detectedSources, selectedSourceId]);
  const guidedWorkspacePlan = useMemo(() => {
    const projectName = context?.projectName?.trim() || "Untitled footage edit";
    const base = planGuidedWorkspace({
      projectName,
      destinationDrives: ingestDestinationDrives,
      knownDrives,
      currentProjectRoot: settings?.projectRootPath || storagePath || null,
    });
    if (!base) return null;
    if (guidedDriveRoot) {
      const forced = buildGuidedWorkspaceFromDrive(guidedDriveRoot, projectName);
      const drive =
        ingestDestinationDrives.find(
          (d) =>
            d.rootPath.replace(/\\/g, "").toUpperCase() ===
            guidedDriveRoot.replace(/\\/g, "").toUpperCase()
        ) || null;
      return {
        ...base,
        projectRoot: forced,
        driveRoot: guidedDriveRoot.endsWith("\\") ? guidedDriveRoot : `${guidedDriveRoot}\\`,
        driveLabel: drive?.label || base.driveLabel,
        freeBytes: drive?.freeBytes ?? base.freeBytes,
        storageType: drive?.storageType || base.storageType,
        shouldMigrate: false,
        keepingExisting: false,
        summary: `Will save to ${drive?.label || guidedDriveRoot}`,
      };
    }
    return base;
  }, [
    context?.projectName,
    ingestDestinationDrives,
    knownDrives,
    settings?.projectRootPath,
    storagePath,
    guidedDriveRoot,
  ]);
  const analyzedCount = useMemo(
    () => analysis.filter((a) => a.analysisStatus === "complete").length,
    [analysis]
  );
  const transcriptHits = useMemo(() => {
    const q = transcriptQuery.trim().toLowerCase();
    if (!q) return [];
    const hits: Array<{ mediaAssetId: string; text: string; startSeconds: number }> = [];
    for (const a of analysis) {
      for (const t of a.transcript) {
        if (t.text.toLowerCase().includes(q)) {
          hits.push({
            mediaAssetId: a.mediaAssetId,
            text: t.text,
            startSeconds: t.startSeconds,
          });
        }
      }
    }
    return hits.slice(0, 20);
  }, [analysis, transcriptQuery]);

  const agentVersionStatus = useMemo(
    () => (agent.connected ? assessAgentVersion(agent.version) : null),
    [agent.connected, agent.version]
  );
  const step1Done =
    agent.connected &&
    agent.ffmpegAvailable !== false &&
    (agentVersionStatus?.ok ?? false);
  const step2Done = Boolean(settings?.projectRootPath);
  const step3Done = media.length > 0;
  const step4Done = media.length > 0 && needsPrepare.length === 0;
  const step5Done = media.length > 0 && analyzedCount > 0;
  const step6Done = Boolean(coverage && coverage.updatedAt);
  const preferredTakeCount =
    coverage?.shots?.filter((s) => s.preferredMediaAssetId).length ?? 0;
  const unmatchedClips =
    coverage?.unmatchedMediaIds
      ?.map((id) => media.find((m) => m.id === id))
      .filter((m): m is MediaAsset => Boolean(m)) ?? [];
  const step7Done = Boolean(timeline && timeline.tracks.some((t) => t.clips.length));
  const step8Done = Boolean(timeline && timeline.version > 1);
  const step9Done = Boolean(timeline?.finishing);
  const liveProjectRoot = useMemo(() => {
    const mediaRoot = inferManagedProjectRootFromMedia(media);
    return resolveLiveProjectRoot({
      settingsRoot: settings?.projectRootPath || storagePath,
      mediaRoot,
      projectName: context?.projectName,
    });
  }, [media, settings?.projectRootPath, storagePath, context?.projectName]);

  const resolveHandoffDir = useMemo(
    () => activeHandoffDir(liveProjectRoot, handoffDirOnDisk),
    [liveProjectRoot, handoffDirOnDisk]
  );
  const step10Done = Boolean(resolveHandoffDir || resolveImported);
  const archiveSummary = useMemo(
    () => summarizeArchiveState(media, settings?.projectRootPath),
    [media, settings?.projectRootPath]
  );

  // Drop stale Resolve paths when the project folder moves (SSD / rename).
  useEffect(() => {
    if (!liveProjectRoot || !handoffDirOnDisk) return;
    const next = activeHandoffDir(liveProjectRoot, handoffDirOnDisk);
    if (next && next !== handoffDirOnDisk) setHandoffDirOnDisk(next);
  }, [liveProjectRoot, handoffDirOnDisk]);
  const step11Done = archiveSummary.archived > 0;
  const step12Done = Boolean(settings?.lastFinishingFeedback);
  /** Shot list / coverage tools only when linked to a production plan. */
  const hasProductionPlan = Boolean(
    context && !context.aiEditorOnly && (context.shotCount ?? 0) > 0
  );
  const showPrepareStep = needsPrepare.length > 0;
  const stepVisibility = useMemo(
    () => ({
      showPrepare: showPrepareStep,
      showPlanSteps: hasProductionPlan,
    }),
    [showPrepareStep, hasProductionPlan]
  );
  const stepNo = useMemo(
    () => buildDisplayStepNumbers(stepVisibility),
    [stepVisibility]
  );
  const workflowNext = useMemo(() => {
    return getWorkflowNextStep(
      {
        connected: step1Done,
        hasProjectRoot: step2Done,
        hasMedia: step3Done,
        // Guided copy already prepares previews; skip prep step when none needed
        prepareDone: !step3Done || step4Done || !showPrepareStep,
        analyzeDone: !hasProductionPlan || !step3Done || step5Done,
        matchDone: !hasProductionPlan || step6Done,
        roughCutDone: step7Done,
        // Chat is optional - don't block Look / Resolve if they skipped it
        chatDone: step8Done || step9Done || step10Done,
        lookDone: step9Done,
        resolveDone: step10Done,
        archiveDone: step11Done || step12Done,
        wrapUpDone: step12Done,
      },
      stepVisibility
    );
  }, [
    hasProductionPlan,
    showPrepareStep,
    stepVisibility,
    step1Done,
    step2Done,
    step3Done,
    step4Done,
    step5Done,
    step6Done,
    step7Done,
    step8Done,
    step9Done,
    step10Done,
    step11Done,
    step12Done,
  ]);

  useEffect(() => {
    if (!context?.projectName || loading) return;
    writeResumeBookmark({
      projectId,
      projectName: context.projectName,
      stepN: workflowNext?.n ?? 12,
      stepTitle: workflowNext?.title ?? "Edit complete",
      stepDetail:
        workflowNext?.detail ?? "Open this project anytime to keep refining.",
      anchor: workflowNext?.anchor ?? "ai-step-12",
      updatedAt: Date.now(),
    });
  }, [context?.projectName, loading, projectId, workflowNext]);

  // Prompt for a real name when the session is still “Untitled…”
  useEffect(() => {
    if (loading || !context) return;
    const n = context.projectName?.trim() || "";
    setProjectNameDraft(n || "");
    if (!n || /^untitled(\s+footage)?(\s+edit)?$/i.test(n)) {
      setEditingProjectName(true);
      if (/^untitled/i.test(n)) setProjectNameDraft("");
    }
  }, [loading, context?.projectName, context]);

  useEffect(() => {
    if (loading || typeof window === "undefined") return;
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash.startsWith("ai-step-")) return;
    const t = window.setTimeout(() => {
      document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 250);
    return () => window.clearTimeout(t);
  }, [loading, workflowNext?.anchor]);
  const projectTips = useMemo(
    () =>
      buildProjectRecommendations(
        projectId,
        context?.projectName || "This edit",
        settings
      ),
    [projectId, context?.projectName, settings]
  );
  const storageHealth = useMemo(
    () =>
      assessStorageHealth({
        projectRootPath: storagePath.trim() || settings?.projectRootPath,
        archiveRootPath: archivePath.trim() || settings?.archiveRootPath,
        drives: knownDrives,
      }),
    [
      storagePath,
      archivePath,
      settings?.projectRootPath,
      settings?.archiveRootPath,
      knownDrives,
    ]
  );
  const drivePresence = useMemo(
    () =>
      assessDrivePresence({
        projectRootPath: settings?.projectRootPath || storagePath.trim(),
        archiveRootPath: settings?.archiveRootPath || archivePath.trim(),
        projectRootVolumeId: settings?.projectRootVolumeId,
        archiveRootVolumeId: settings?.archiveRootVolumeId,
        storage,
        drives: knownDrives,
        editAgentOnline: editDriveOnline,
        archiveAgentOnline: archiveDriveOnline,
      }),
    [
      settings?.projectRootPath,
      settings?.archiveRootPath,
      settings?.projectRootVolumeId,
      settings?.archiveRootVolumeId,
      storagePath,
      archivePath,
      storage,
      knownDrives,
      editDriveOnline,
      archiveDriveOnline,
    ]
  );
  const diskGates = useMemo(() => driveActionGates(drivePresence), [drivePresence]);

  function requireEditDisk(): boolean {
    if (diskGates.editDiskReady) return true;
    setError(diskGates.editBlockReason || "Edit drive is not ready.");
    return false;
  }

  function requireArchiveDisk(): boolean {
    if (diskGates.archiveDiskReady) return true;
    setError(diskGates.archiveBlockReason || "Backup drive is not ready.");
    return false;
  }
  const finishingSummary = summarizeFinishing(timeline?.finishing);
  const feedbackSummary = summarizeFeedback(settings?.lastFinishingFeedback);
  const resolveSyncSummary = summarizeResolveSync(settings?.lastResolveSync);
  const planningSummary =
    summarizePlanningFeedback(planningFeedback) ||
    summarizePlanningFeedback(settings?.lastPlanningFeedback);
  const checklist = nextShootChecklist || settings?.nextShootChecklist || null;
  const checklistStats = checklistProgress(checklist);
  const resolvePreflight = useMemo(
    () =>
      buildResolvePreflightTips({
        timeline,
        finishing: timeline?.finishing,
        settings,
        planning: planningFeedback,
        checklist,
      }),
    [timeline, settings, planningFeedback, checklist]
  );
  const videoTrack = timeline?.tracks.find((t) => t.kind === "video");
  const reelSummaries = useMemo(
    () => (timeline?.reels?.length ? summarizeReels(timeline) : []),
    [timeline]
  );
  const activeReelName =
    timeline?.reels?.find((r) => r.id === timeline.activeReelId)?.name || null;
  const visibleClips = useMemo(() => {
    const clips = videoTrack?.clips ?? [];
    const inReel =
      !timeline?.activeReelId || !timeline.reels?.length
        ? clips
        : clips.filter((c) => c.reelId === timeline.activeReelId);
    // Hide camera stills even if an older cut included MJPEG JPGs as "video"
    return inReel.filter((c) => {
      const asset = media.find((m) => m.id === c.mediaAssetId);
      return asset ? isRoughCutVideoAsset(asset) : true;
    });
  }, [videoTrack, timeline?.activeReelId, timeline?.reels, media]);

  const stillClipsOnCut = useMemo(() => {
    const clips = videoTrack?.clips ?? [];
    return clips.filter((c) => {
      const asset = media.find((m) => m.id === c.mediaAssetId);
      return asset ? !isRoughCutVideoAsset(asset) : false;
    });
  }, [videoTrack, media]);

  async function onRecheckAgent() {
    setBusy("recheck");
    setError(null);
    setStatusNote(null);
    try {
      const health = await checkAgentHealth();
      setAgent(health);
      if (!health.connected) {
        setStatusNote("This computer is not connected yet. Click Connect.");
        return;
      }
      if (health.ffmpegAvailable === false) {
        setError("Video tools are missing. Restart after installing FFmpeg, or click Restart.");
        setStatusNote("Connected, but video tools are not ready yet.");
      } else {
        setStatusNote("This computer is ready.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not check connection");
    } finally {
      setBusy(null);
    }
  }

  const detectScanInFlight = useRef(false);
  const scanDetectedSources = useCallback(
    async (opts?: { quiet?: boolean }) => {
      if (!agent.connected) {
        setDetectedSources([]);
        return;
      }
      if (detectScanInFlight.current) return;
      detectScanInFlight.current = true;
      const quiet = opts?.quiet === true;
      if (!quiet) setDetectScanning(true);
      try {
        const token = await ensureAgentSession();
        const res = await agentDetectSources(DEFAULT_AGENT_BASE_URL, token, {
          maxFiles: 800,
        });
        const sources = detectMediaSources(res.probes || []);
        setDetectedSources(sources);
        const bestCard = pickBestCameraSource(sources);
        setSelectedSourceId((prev) => {
          if (prev && sources.some((s) => s.id === prev)) return prev;
          return bestCard?.id ?? sources[0]?.id ?? null;
        });
        // Only suggest camera on a visible (non-quiet) scan so background polls don't yank the dropdown
        if (!quiet && bestCard?.suggestedCameraAssignment) {
          setCameraLabel((prev) =>
            prev === "CAMERA_A" || !prev ? bestCard.suggestedCameraAssignment! : prev
          );
        }
        const dest = (settings?.projectRootPath || storagePath).trim();
        if (dest) {
          try {
            const st = await agentStorageStat(DEFAULT_AGENT_BASE_URL, token, dest);
            setIngestDestFreeBytes(
              typeof st.availableBytes === "number" ? st.availableBytes : null
            );
          } catch {
            setIngestDestFreeBytes(null);
          }
        }
      } catch {
        /* card scan is best-effort */
      } finally {
        detectScanInFlight.current = false;
        if (!quiet) setDetectScanning(false);
      }
    },
    [agent.connected, ensureAgentSession, settings?.projectRootPath, storagePath]
  );

  // Initial scan when agent connects; quiet poll later (no spinner) so the card doesn't flicker.
  useEffect(() => {
    if (!agent.connected) {
      setDetectedSources([]);
      return;
    }
    void scanDetectedSources({ quiet: false });
    const t = window.setInterval(() => void scanDetectedSources({ quiet: true }), 45000);
    return () => window.clearInterval(t);
    // Intentionally only re-run when connection flips — not when scan callback identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- poll must not restart every render
  }, [agent.connected]);

  async function onStartAgent(restart = false) {
    setBusy(restart ? "restart" : "agent");
    setError(null);
    setStatusNote(null);
    try {
      if (!restart) {
        const health = await checkAgentHealth();
        if (health.connected) {
          setAgent(health);
          setStatusNote("Already connected.");
          return;
        }
      } else {
        setStatusNote("Restarting connection...");
        setAgentToken(null);
        setAgentExpiresAt(null);
      }
      await aiEditorLaunchAgent(getToken, { restart });
      const after = await checkAgentHealth();
      setAgent(after);
      if (after.connected) {
        // Agent process is new — always mint/register a session before other calls.
        setAgentToken(null);
        setAgentExpiresAt(null);
        try {
          await ensureAgentSession();
        } catch {
          /* Connect UI still useful; next action will retry mint */
        }
        if (after.ffmpegAvailable === false) {
          setError("Connected, but video tools are missing. Install FFmpeg, then Restart.");
        } else {
          setStatusNote(restart ? "Reconnected and ready." : "Connected and ready.");
        }
      } else {
        throw new Error(
          "Could not connect. Try Restart, or start the ShootSpine helper on this computer."
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not connect this computer");
    } finally {
      setBusy(null);
    }
  }

  async function refreshKnownDrives() {
    if (!agent.connected) return knownDrives;
    try {
      const token = await ensureAgentSession();
      const res = await agentListDrives(DEFAULT_AGENT_BASE_URL, token);
      setKnownDrives(res.drives);
      return res.drives;
    } catch {
      return knownDrives;
    }
  }

  function detectRemount(drives: AgentDriveEntry[], nextSettings = settings, nextStorage = storage) {
    if (!nextSettings) {
      setRemountCandidates([]);
      return [];
    }
    const found = findRemountCandidates({
      projectRootPath: nextSettings.projectRootPath,
      archiveRootPath: nextSettings.archiveRootPath,
      projectRootVolumeId: nextSettings.projectRootVolumeId,
      archiveRootVolumeId: nextSettings.archiveRootVolumeId,
      storage: nextStorage,
      drives,
    });
    setRemountCandidates(found);
    return found;
  }

  async function refreshDrivePresence(opts?: { quiet?: boolean }) {
    if (!agent.connected) return;
    if (!opts?.quiet) {
      setBusy("drives");
      setError(null);
    }
    try {
      const drives = await refreshKnownDrives();
      detectRemount(drives);
      const editPath = (settings?.projectRootPath || storagePath).trim();
      const archive = (settings?.archiveRootPath || archivePath).trim();
      const token = await ensureAgentSession();
      let editOnline: boolean | null = null;
      let archiveOnline: boolean | null = null;
      if (editPath) {
        try {
          const stat = await agentStorageStat(DEFAULT_AGENT_BASE_URL, token, editPath);
          editOnline = stat.online !== false;
        } catch {
          editOnline = letterMounted(editPath, drives) ? null : false;
        }
      }
      if (archive) {
        try {
          const stat = await agentStorageStat(DEFAULT_AGENT_BASE_URL, token, archive);
          archiveOnline = stat.online !== false;
        } catch {
          archiveOnline = letterMounted(archive, drives) ? null : false;
        }
      }
      setEditDriveOnline(editOnline);
      setArchiveDriveOnline(archiveOnline);
      if (!opts?.quiet) {
        const snap = assessDrivePresence({
          projectRootPath: editPath || settings?.projectRootPath,
          archiveRootPath: archive || settings?.archiveRootPath,
          projectRootVolumeId: settings?.projectRootVolumeId,
          archiveRootVolumeId: settings?.archiveRootVolumeId,
          storage,
          drives,
          editAgentOnline: editOnline,
          archiveAgentOnline: archiveOnline,
        });
        setStatusNote(
          snap.needsAttention
            ? "Checked drives - still need attention (plug in or Relink)."
            : "Checked drives - edit folder is reachable."
        );
      }
    } catch (e) {
      if (!opts?.quiet) {
        setError(e instanceof Error ? e.message : "Could not check drives");
      }
    } finally {
      if (!opts?.quiet) setBusy(null);
    }
  }

  function letterMounted(pathStr: string, drives: AgentDriveEntry[]) {
    const m = pathStr.replace(/\//g, "\\").match(/^([A-Za-z]:)/);
    if (!m) return true;
    const letter = `${m[1].toUpperCase()}\\`;
    return drives.some((d) => {
      if (d.kind !== "drive" && d.kind !== "volume") return false;
      const root = d.path.replace(/\//g, "\\").toUpperCase();
      return root === letter || root === letter.replace(/\\$/, "");
    });
  }

  async function onSaveWorkspace(pathOverride?: string): Promise<string | null> {
    const pathToSave = (pathOverride ?? storagePath).trim();
    if (!pathToSave) return null;
    if (pathOverride) setStoragePath(pathToSave);
    setBusy("storage");
    setStatusNote(null);
    setError(null);
    try {
      const drives = await refreshKnownDrives();
      const storageType = inferStorageTypeForPath(pathToSave, drives);
      const editDrive = driveForPath(pathToSave, drives);
      const res = await aiEditorSaveStorage(getToken, projectId, {
        name: context?.projectName || "Edit workspace",
        path: pathToSave,
        purpose: "active",
        type: storageType,
        setAsActive: true,
        volumeIdentifier: volumeIdForPath(pathToSave, drives),
        capacityBytes: editDrive?.capacityBytes,
        availableBytes: editDrive?.availableBytes,
      });
      setSettings(res.settings);
      setStorage((prev) => {
        const others = prev.filter((s) => s.id !== res.storage.id);
        return [...others, res.storage];
      });
      const root = res.settings.projectRootPath || pathToSave;
      setStoragePath(root);
      setIndexFolderPath(root);

      if (createProjectFolders && res.settings.projectRootPath) {
        const { job, projectRootPath } = await aiEditorCreateFoldersJob(getToken, projectId, {});
        setJobs((prev) => [job, ...prev.filter((j) => j.id !== job.id)]);
        const health = await checkAgentHealth();
        setAgent(health);
        if (health.connected) {
          const token = await ensureAgentSession();
          await agentCreateFolders(
            DEFAULT_AGENT_BASE_URL,
            token,
            projectRootPath,
            res.settings.cameraLabels
          );
          setStatusNote("Workspace saved and folders created. Next: add your footage.");
        } else {
          setStatusNote("Workspace saved. Connect this computer to create folders on disk.");
        }
      } else {
        setStatusNote("Workspace folder saved. Next: add your footage.");
      }

      if (archivePath.trim()) {
        const archiveType = inferStorageTypeForPath(archivePath.trim(), drives);
        const archiveDrive = driveForPath(archivePath.trim(), drives);
        const archiveRes = await aiEditorSaveStorage(getToken, projectId, {
          name: "Archive storage",
          path: archivePath.trim(),
          purpose: "archive",
          type: archiveType === "unknown" ? "externalHDD" : archiveType,
          setAsActive: false,
          volumeIdentifier: volumeIdForPath(archivePath.trim(), drives),
          capacityBytes: archiveDrive?.capacityBytes,
          availableBytes: archiveDrive?.availableBytes,
        });
        setSettings(archiveRes.settings);
        setArchivePath(archiveRes.settings.archiveRootPath || archivePath.trim());
        setStatusNote(
          "Workspace and backup folders saved. Next: add your footage." +
            (storageType === "externalSSD"
              ? " Edit drive looks like an external SSD."
              : "")
        );
      }
      await load();
      detectRemount(drives);
      return root;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save workspace");
      return null;
    } finally {
      setBusy(null);
    }
  }

  /** Guided mode: pick SSD path, save workspace + folders without a separate Step 2 ritual. */
  async function ensureGuidedWorkspace(forceMigrate = false): Promise<string> {
    const projectName = context?.projectName?.trim() || "Untitled footage edit";
    const drives = await refreshKnownDrives();
    const dests = buildIngestDestinationDrives(drives, detectedSources);
    const plan = planGuidedWorkspace({
      projectName,
      destinationDrives: dests,
      knownDrives: drives,
      currentProjectRoot: settings?.projectRootPath || storagePath || null,
    });
    let root: string | null = null;
    if (guidedDriveRoot) {
      root = buildGuidedWorkspaceFromDrive(guidedDriveRoot, projectName);
    } else if (forceMigrate && plan) {
      root = buildGuidedWorkspaceFromDrive(plan.driveRoot, projectName);
    } else if (plan?.shouldMigrate) {
      root = plan.projectRoot;
    } else if (settings?.projectRootPath?.trim()) {
      root = settings.projectRootPath.trim();
    } else if (plan) {
      root = plan.projectRoot;
    }
    if (!root) {
      throw new Error("Plug in an external SSD (like your T7), then Rescan.");
    }
    const current = settings?.projectRootPath?.trim() || "";
    if (current.toLowerCase() === root.toLowerCase()) {
      setStoragePath(root);
      return root;
    }

    const storageType = inferStorageTypeForPath(root, drives);
    const editDrive = driveForPath(root, drives);
    const res = await aiEditorSaveStorage(getToken, projectId, {
      name: projectName,
      path: root,
      purpose: "active",
      type: storageType === "unknown" ? "externalSSD" : storageType,
      setAsActive: true,
      volumeIdentifier: volumeIdForPath(root, drives),
      capacityBytes: editDrive?.capacityBytes,
      availableBytes: editDrive?.availableBytes,
    });
    setSettings(res.settings);
    setStorage((prev) => {
      const others = prev.filter((s) => s.id !== res.storage.id);
      return [...others, res.storage];
    });
    const savedRoot = res.settings.projectRootPath || root;
    setStoragePath(savedRoot);

    try {
      const { job, projectRootPath } = await aiEditorCreateFoldersJob(getToken, projectId, {});
      setJobs((prev) => [job, ...prev.filter((j) => j.id !== job.id)]);
      const token = await ensureAgentSession();
      await agentCreateFolders(
        DEFAULT_AGENT_BASE_URL,
        token,
        projectRootPath || savedRoot,
        res.settings.cameraLabels
      );
    } catch {
      /* folders best-effort; copy can still create camera dirs */
    }
    return savedRoot.trim();
  }

  async function onGuidedReviewClips() {
    setError(null);
    setStatusNote(null);
    try {
      if (!guidedCameraPlan) throw new Error("No camera card found — plug it in and Rescan.");
      await ensureGuidedWorkspace(false);
      const src = guidedCameraPlan.source;
      setAddMode("copy");
      setPrepareWhileCopying(true);
      setCameraLabel(src.suggestedCameraAssignment || cameraLabel || "CAMERA_A");
      setIndexFolderPath(src.mediaRoot);
      setSelectedSourceId(src.id);
      setBusy("index");
      const health = await checkAgentHealth();
      setAgent(health);
      if (!health.connected) throw new Error(AGENT_CONNECT_MSG);
      const token = await ensureAgentSession();
      const indexed = await agentIndexFolder(DEFAULT_AGENT_BASE_URL, token, src.mediaRoot, true);
      const sourceFiles = filterIngestableFiles(indexed.files || []);
      if (!sourceFiles.length) {
        setPendingCopyFiles(null);
        setSelectedCopyPaths(new Set());
        setStatusNote("No video or audio files found on that card.");
        return;
      }
      setPendingCopyFiles(sourceFiles);
      setSelectedCopyPaths(new Set(sourceFiles.map((f) => f.path)));
      setStatusNote(
        `Found ${sourceFiles.length} clip(s). Uncheck anything you don’t need, then Copy.`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not review clips");
    } finally {
      setBusy(null);
    }
  }

  async function onGuidedCopyFootage() {
    setError(null);
    setStatusNote(null);
    cancelBatchRef.current = false;
    setBatchStopping(false);
    try {
      if (!guidedCameraPlan) throw new Error("No camera card found — plug it in and Rescan.");
      setBusy("index");
      setProgress({ pct: 5, label: "Preparing project folder on your SSD…" });
      const projectRoot = await ensureGuidedWorkspace(Boolean(guidedWorkspacePlan?.shouldMigrate));
      if (!projectRoot) throw new Error("Could not set project folder");

      const src = guidedCameraPlan.source;
      setAddMode("copy");
      setPrepareWhileCopying(true);
      const cam = src.suggestedCameraAssignment || cameraLabel || "CAMERA_A";
      setCameraLabel(cam);
      setIndexFolderPath(src.mediaRoot);
      setSelectedSourceId(src.id);

      const health = await checkAgentHealth();
      setAgent(health);
      if (!health.connected) throw new Error(AGENT_CONNECT_MSG);
      const token = await ensureAgentSession();

      let files = pendingCopyFiles;
      let selected = files?.filter((f) => selectedCopyPaths.has(f.path)) || [];
      if (!files?.length) {
        setProgress({ pct: 15, label: "Reading clips on the camera card…" });
        const indexed = await agentIndexFolder(DEFAULT_AGENT_BASE_URL, token, src.mediaRoot, true);
        files = filterIngestableFiles(indexed.files || []);
        setPendingCopyFiles(files);
        setSelectedCopyPaths(new Set(files.map((f) => f.path)));
        selected = files;
      }
      const toCopy = selected.length ? selected : files;
      if (!toCopy.length) throw new Error("No clips selected to copy.");

      setProgress({ pct: 20, label: `Copying ${toCopy.length} clip(s) to your SSD…` });
      await runManagedCopy({
        token,
        sourceFiles: toCopy,
        camera: cam,
        prepare: true,
        projectRoot,
      });
      if (!cancelBatchRef.current) {
        setPendingCopyFiles(null);
        setSelectedCopyPaths(new Set());
        setStatusNote(
          `Footage is on your drive at ${projectRoot}. Next: make a first cut below.`
        );
        document.getElementById("ai-step-7")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not copy footage");
    } finally {
      setBusy(null);
      setProgress(null);
      setBatchStopping(false);
      copyAbortRef.current = null;
    }
  }

  async function onRelinkVolumes() {
    if (!remountCandidates.length) return;
    setBusy("remount");
    setError(null);
    setStatusNote(null);
    try {
      let nextSettings = settings;
      let nextStorage = storage;
      let nextMedia = media;
      let clipCount = 0;

      for (const candidate of remountCandidates) {
        const purpose = candidate.kind === "edit" ? "active" : "archive";
        const drives = await refreshKnownDrives();
        const inferred = inferStorageTypeForPath(candidate.newPath, drives);
        const res = await aiEditorSaveStorage(getToken, projectId, {
          name: candidate.kind === "edit" ? context?.projectName || "Edit workspace" : "Archive storage",
          path: candidate.newPath,
          purpose,
          type:
            inferred !== "unknown"
              ? inferred
              : candidate.kind === "edit"
                ? "externalSSD"
                : "externalHDD",
          setAsActive: candidate.kind === "edit",
          volumeIdentifier: candidate.volumeIdentifier,
        });
        nextSettings = res.settings;
        nextStorage = [...nextStorage.filter((s) => s.id !== res.storage.id), res.storage];

        const patches = planMediaRemount(
          nextMedia,
          candidate.oldPath,
          candidate.newPath,
          { volumeIdentifier: candidate.volumeIdentifier, mode: candidate.kind }
        );
        for (let i = 0; i < patches.length; i += 200) {
          const chunk = patches.slice(i, i + 200);
          await aiEditorPatchMedia(getToken, projectId, chunk);
        }
        if (patches.length) {
          const byId = new Map(patches.map((p) => [p.id, p]));
          nextMedia = nextMedia.map((m) => {
            const p = byId.get(m.id);
            return p ? { ...m, ...p } : m;
          });
          clipCount += patches.length;
        }

        if (candidate.kind === "edit") {
          setStoragePath(candidate.newPath);
          setIndexFolderPath(candidate.newPath);
        } else {
          setArchivePath(candidate.newPath);
        }
      }

      setSettings(nextSettings);
      setStorage(nextStorage);
      setMedia(nextMedia);
      setRemountCandidates([]);
      setStatusNote(
        clipCount
          ? `Relinked drive paths (${clipCount} clip${clipCount === 1 ? "" : "s"} updated).`
          : "Relinked drive folders to the new letter."
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not relink drive paths");
    } finally {
      setBusy(null);
    }
  }

  function filterIngestableFiles<T extends { filename: string; path?: string }>(
    files: T[]
  ): T[] {
    return files.filter(
      (f) => isIngestableMediaExtension(f.filename || f.path || "")
    );
  }

  async function probeIndexedFiles(
    token: string,
    indexed: Array<{ path: string; filename: string; sizeBytes: number }>
  ) {
    const files: Array<{
      path: string;
      filename: string;
      sizeBytes?: number;
      relativeProjectPath?: string;
      probe?: Partial<MediaAsset>;
    }> = [];
    for (const f of indexed.slice(0, 80)) {
      let probe: Partial<MediaAsset> | undefined;
      try {
        const probed = await agentProbe(DEFAULT_AGENT_BASE_URL, token, f.path);
        probe = probed.probe as Partial<MediaAsset>;
        try {
          const thumb = await agentThumbnail(DEFAULT_AGENT_BASE_URL, token, f.path);
          if (thumb.dataUrl) probe = { ...probe, thumbnailDataUrl: thumb.dataUrl };
        } catch {
          /* optional */
        }
      } catch {
        probe = await mockMediaEngine.probe(f.path);
      }
      files.push({
        path: f.path,
        filename: f.filename,
        sizeBytes: f.sizeBytes,
        probe,
      });
    }
    return files;
  }


  /** Scan footage folder — for copy mode, show a picker; for in-place, catalog immediately. */
  async function onIndexFolder() {
    const folder = indexFolderPath.trim() || settings?.projectRootPath || "";
    if (!folder) return;
    if (addMode === "copy" && !requireEditDisk()) return;
    setBusy("index");
    setStatusNote(null);
    setDiskNote(null);
    setError(null);
    setProgress({ pct: 5, label: "Scanning folder for video & audio…" });
    try {
      const health = await checkAgentHealth();
      setAgent(health);
      if (!health.connected) throw new Error("Connect this computer first, then add footage.");

      const token = await ensureAgentSession();
      setProgress({ pct: 25, label: "Listing clips on this drive…" });
      const indexed = await agentIndexFolder(DEFAULT_AGENT_BASE_URL, token, folder, true);
      const sourceFiles = filterIngestableFiles(indexed.files || []).sort((a, b) =>
        a.filename.localeCompare(b.filename, undefined, { numeric: true })
      );
      if (!sourceFiles.length) {
        setPendingCopyFiles(null);
        setSelectedCopyPaths(new Set());
        setStatusNote(
          "No video or audio files found in that folder (camera JPG stills are skipped)."
        );
        return;
      }

      // In-place: catalog where files already are
      if (addMode === "in_place") {
        setProgress({ pct: 50, label: `Reading ${sourceFiles.length} clip(s)…` });
        const files = await probeIndexedFiles(token, sourceFiles);
        setProgress({ pct: 90, label: "Saving clip records…" });
        const res = await aiEditorIndexMedia(getToken, projectId, {
          files,
          ingestMode: "in_place",
        });
        setMedia((prev) => {
          const byId = new Map(prev.map((m) => [m.id, m]));
          for (const m of res.media) byId.set(m.id, m);
          return [...byId.values()].sort((a, b) => a.filename.localeCompare(b.filename));
        });
        setJobs((prev) => [res.job as AiEditorJob, ...prev]);
        const hard = res.media.filter((m) => m.needsProxy && !m.proxyPath).length;
        setStatusNote(
          hard
            ? `Found ${res.media.length} clip(s) in place. ${hard} should be prepared for smooth editing.`
            : `Found ${res.media.length} clip(s) in place. Originals were not moved.`
        );
        return;
      }

      // Copy mode: stop for selection — do not copy everything yet
      setPendingCopyFiles(sourceFiles);
      setSelectedCopyPaths(new Set(sourceFiles.map((f) => f.path)));
      const totalBytes = sourceFiles.reduce((s, f) => s + (f.sizeBytes || 0), 0);
      setStatusNote(
        `Found ${sourceFiles.length} clip(s) (${formatBytes(totalBytes)}). Uncheck takes you don’t need, then Copy & verify.`
      );
      setDiskNote(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add footage");
    } finally {
      setBusy(null);
      setProgress(null);
    }
  }

  async function onCopySelectedFiles() {
    if (addMode !== "copy" || !pendingCopyFiles?.length) return;
    if (!requireEditDisk()) return;
    const selected = pendingCopyFiles.filter((f) => selectedCopyPaths.has(f.path));
    if (!selected.length) {
      setError("Select at least one clip to copy.");
      return;
    }
    setBusy("index");
    setError(null);
    setStatusNote(null);
    cancelBatchRef.current = false;
    setBatchStopping(false);
    setProgress({
      pct: 0,
      label: `Starting copy of ${selected.length} clip(s)…`,
    });
    try {
      const health = await checkAgentHealth();
      setAgent(health);
      if (!health.connected) throw new Error("Connect this computer first, then add footage.");
      const token = await ensureAgentSession();
      await runManagedCopy({
        token,
        sourceFiles: selected,
        camera: cameraLabel,
        prepare: prepareWhileCopying,
      });
      if (!cancelBatchRef.current) {
        setPendingCopyFiles(null);
        setSelectedCopyPaths(new Set());
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not copy footage");
    } finally {
      setBusy(null);
      setProgress(null);
      setBatchStopping(false);
      copyAbortRef.current = null;
    }
  }

  async function runManagedCopy(opts: {
    token: string;
    sourceFiles: Array<{ path: string; filename: string; sizeBytes: number }>;
    camera: string;
    prepare: boolean;
    /** Phase E — technical + shot breaks after offload (no Whisper). */
    analyze?: boolean;
    /** Phase F — verified backup to archive root after offload. */
    archive?: boolean;
    projectRoot?: string;
  }) {
    const projectRoot = (opts.projectRoot || settings?.projectRootPath || "").trim();
    if (!projectRoot) {
      throw new Error("Save a project workspace folder first, then copy footage into it.");
    }

    const batch = opts.sourceFiles.slice(0, 80);
    const requiredBytes = batch.reduce((sum, f) => sum + (f.sizeBytes || 0), 0);
    try {
      const space = await agentStorageStat(DEFAULT_AGENT_BASE_URL, opts.token, projectRoot);
      if (space.availableBytes != null) {
        setDiskNote(
          `${formatBytes(requiredBytes)} to copy - ${formatBytes(space.availableBytes)} free on destination`
        );
      }
    } catch {
      /* optional */
    }

    const chunkSize = 1;
    type IndexedFile = {
      path: string;
      filename: string;
      sizeBytes?: number;
      relativeProjectPath?: string;
      probe?: Partial<MediaAsset>;
    };
    const cam = opts.camera.replace(/_/g, " ");
    let copiedOk = 0;
    let failed = 0;
    const registeredAssets: MediaAsset[] = [];
    const wantProxy = Boolean(opts.prepare);
    const wantAnalyze = Boolean(opts.analyze);
    const wantArchive = Boolean(opts.archive);
    setPostIngestSafety(null);
    const trailingSteps = [wantProxy, wantAnalyze, wantArchive].filter(Boolean).length;
    // Reserve progress for trailing passes so card offload stays the priority.
    const copyPctCap =
      trailingSteps === 0 ? 96 : trailingSteps === 1 ? 70 : trailingSteps === 2 ? 55 : 45;
    const trailSpan = trailingSteps ? Math.floor((100 - copyPctCap) / trailingSteps) : 0;
    let trailCursor = copyPctCap;
    const proxyPctStart = trailCursor;
    const proxyPctSpan = wantProxy ? trailSpan : 0;
    if (wantProxy) trailCursor += trailSpan;
    const analyzePctStart = trailCursor;
    const analyzePctSpan = wantAnalyze ? trailSpan : 0;
    if (wantAnalyze) trailCursor += trailSpan;
    const archivePctStart = trailCursor;
    const archivePctSpan = wantArchive ? 100 - archivePctStart : 0;
    copyAbortRef.current?.abort();
    const abort = new AbortController();
    copyAbortRef.current = abort;

    /** Phase C thin — show each clip in the media browser as soon as it lands. */
    async function registerClipInLibrary(file: IndexedFile, doneCount: number) {
      setProgress({
        pct: Math.min(
          copyPctCap,
          Math.round((doneCount / Math.max(1, batch.length)) * copyPctCap)
        ),
        label: `In library ${doneCount}/${batch.length}: ${file.filename} · ${cam}`,
      });
      const res = await aiEditorIndexMedia(getToken, projectId, {
        files: [file],
        ingestMode: "managed",
      });
      setMedia((prev) => {
        const byId = new Map(prev.map((m) => [m.id, m]));
        for (const m of res.media) byId.set(m.id, m);
        return [...byId.values()].sort((a, b) => a.filename.localeCompare(b.filename));
      });
      setJobs((prev) => [res.job as AiEditorJob, ...prev.filter((j) => j.id !== res.job.id)]);
      for (const m of res.media) {
        const idx = registeredAssets.findIndex((x) => x.id === m.id);
        if (idx >= 0) registeredAssets[idx] = m;
        else registeredAssets.push(m);
      }
    }

    for (let i = 0; i < batch.length; i += chunkSize) {
      if (cancelBatchRef.current || abort.signal.aborted) break;
      const slice = batch.slice(i, i + chunkSize);
      const fileLabel = slice[0]?.filename || "clip";
      const pct = Math.round((i / Math.max(1, batch.length)) * (copyPctCap - 5));
      setProgress({
        pct,
        label: cancelBatchRef.current
          ? "Stopping…"
          : `Copying & verifying ${i + 1}/${batch.length}: ${fileLabel} · ${cam}`,
      });
      try {
        const copied = await agentIngestCopy(
          DEFAULT_AGENT_BASE_URL,
          opts.token,
          {
            projectRoot,
            cameraLabel: opts.camera,
            files: slice.map((f) => ({
              sourcePath: f.path,
              filename: f.filename,
              sizeBytes: f.sizeBytes,
            })),
            // Phase D — never proxy inside card copy; offload first, then project-side proxies.
            generateProxies: false,
          },
          { signal: abort.signal }
        );

        if (cancelBatchRef.current || abort.signal.aborted) break;

        for (const r of copied.results) {
          if (cancelBatchRef.current || abort.signal.aborted) break;
          setProgress({
            pct: Math.min(copyPctCap - 1, pct + 2),
            label: `Checking ${r.filename} · ${cam}`,
          });
          let probe: Partial<MediaAsset> = {
            checksum: r.checksum,
            checksumAlgorithm: "sha256",
            cameraAssignment: r.cameraAssignment,
            relativeProjectPath: r.relativeProjectPath,
            sizeBytes: r.sizeBytes,
            needsProxy: true,
          };
          try {
            const probed = await agentProbe(DEFAULT_AGENT_BASE_URL, opts.token, r.destPath);
            probe = { ...probe, ...(probed.probe as Partial<MediaAsset>) };
          } catch {
            probe = { ...probe, ...(await mockMediaEngine.probe(r.destPath)) };
          }

          const entry: IndexedFile = {
            path: r.destPath,
            filename: r.filename,
            sizeBytes: r.sizeBytes,
            relativeProjectPath: r.relativeProjectPath,
            probe,
          };

          if (cancelBatchRef.current || abort.signal.aborted) {
            // Still keep the verified copy we already have
            copiedOk += 1;
            try {
              await registerClipInLibrary(entry, copiedOk);
            } catch {
              /* registration best-effort on stop */
            }
            break;
          }
          try {
            const thumb = await agentThumbnail(
              DEFAULT_AGENT_BASE_URL,
              opts.token,
              r.destPath
            );
            if (thumb.dataUrl) probe = { ...probe, thumbnailDataUrl: thumb.dataUrl };
            entry.probe = probe;
          } catch {
            /* optional */
          }
          copiedOk += 1;
          await registerClipInLibrary(entry, copiedOk);
        }
      } catch (e) {
        if (
          cancelBatchRef.current ||
          abort.signal.aborted ||
          (e instanceof Error && e.message === "CANCELLED")
        ) {
          break;
        }
        failed += 1;
      }
    }

    let proxyOk = 0;
    let proxyFailed = 0;
    let analyzeOk = 0;
    let analyzeFailed = 0;
    let archiveOk = 0;
    let archiveFailed = 0;
    let archiveSkipNote = "";
    const copyStopped = cancelBatchRef.current || abort.signal.aborted;

    // Phase D thin — proxies from project files after card offload (not while copying).
    if (wantProxy && registeredAssets.length && !copyStopped) {
      const toProxy = registeredAssets.filter(
        (m) => assetNeedsBrowserProxy(m) && sourcePathForProxy(m)
      );
      if (toProxy.length) {
        setStatusNote(
          `Card offload done (${copiedOk}). Preparing proxies from project files…`
        );
        const patches: Array<{ id: string; proxyPath: string; needsProxy: boolean }> = [];
        for (let i = 0; i < toProxy.length; i++) {
          if (cancelBatchRef.current || abort.signal.aborted) break;
          const m = toProxy[i]!;
          setProgress({
            pct: proxyPctStart + Math.round(((i + 1) / toProxy.length) * proxyPctSpan),
            label: `Preparing proxy ${i + 1}/${toProxy.length}: ${m.filename} · ${cam}`,
          });
          const sourcePath = sourcePathForProxy(m);
          if (!sourcePath) {
            proxyFailed += 1;
            continue;
          }
          try {
            const res = await agentCreateProxy(DEFAULT_AGENT_BASE_URL, opts.token, sourcePath, {
              profile: "ai_720p",
            });
            patches.push({ id: m.id, proxyPath: res.proxyPath, needsProxy: true });
            proxyOk += 1;
          } catch {
            proxyFailed += 1;
          }
        }
        if (patches.length) {
          await aiEditorPatchMedia(getToken, projectId, patches);
          setMedia((prev) =>
            prev.map((m) => {
              const p = patches.find((x) => x.id === m.id);
              return p ? { ...m, proxyPath: p.proxyPath } : m;
            })
          );
          for (const p of patches) {
            const idx = registeredAssets.findIndex((x) => x.id === p.id);
            if (idx >= 0) {
              registeredAssets[idx] = {
                ...registeredAssets[idx]!,
                proxyPath: p.proxyPath,
              };
            }
          }
        }
      }
    }

    const proxyStopped = cancelBatchRef.current || abort.signal.aborted;

    // Phase E thin — analyze after offload (+ proxies); technical + shots only, no Whisper.
    if (wantAnalyze && registeredAssets.length && !copyStopped && !proxyStopped) {
      const toAnalyze = registeredAssets
        .map((m) => ({ m, path: playbackPathForAsset(m) }))
        .filter((x): x is { m: MediaAsset; path: string } => Boolean(x.path));
      if (toAnalyze.length) {
        setStatusNote(
          `Offload done (${copiedOk}). Analyzing clips (technical + shot breaks, no speech)…`
        );
        const results = [];
        for (let i = 0; i < toAnalyze.length; i++) {
          if (cancelBatchRef.current || abort.signal.aborted) break;
          const { m, path } = toAnalyze[i]!;
          setProgress({
            pct:
              analyzePctStart +
              Math.round(((i + 1) / toAnalyze.length) * Math.max(analyzePctSpan, 1)),
            label: `Analyzing ${i + 1}/${toAnalyze.length}: ${m.filename} · ${cam}`,
          });
          try {
            const analyzed = await agentAnalyze(DEFAULT_AGENT_BASE_URL, opts.token, path, {
              transcribe: false,
            });
            results.push({
              mediaAssetId: m.id,
              technical: {
                mediaAssetId: m.id,
                ...analyzed.technical,
                analyzedAt: new Date().toISOString(),
              },
              shots: analyzed.shots.map((s, idx) => ({
                id: `${m.id}_shot_${idx}`,
                mediaAssetId: m.id,
                ...s,
              })),
              transcript: [] as [],
            });
            analyzeOk += 1;
          } catch (e) {
            results.push({
              mediaAssetId: m.id,
              error: e instanceof Error ? e.message : "analyze failed",
              shots: [],
              transcript: [],
            });
            analyzeFailed += 1;
          }
        }
        if (results.length) {
          try {
            const saved = await aiEditorSaveAnalysis(getToken, projectId, results);
            setAnalysis(saved.analysis);
            setJobs((prev) => [saved.job, ...prev]);
          } catch {
            analyzeFailed += results.length;
            analyzeOk = 0;
          }
        }
      }
    }

    const analyzeStopped = cancelBatchRef.current || abort.signal.aborted;

    // Phase F thin — verified backup to archive after project offload (not dual-write from card).
    if (wantArchive && registeredAssets.length && !copyStopped && !proxyStopped && !analyzeStopped) {
      const archiveRoot = (settings?.archiveRootPath || archivePath || "").trim();
      if (!archiveRoot) {
        archiveSkipNote =
          " Backup skipped (set a backup folder in Step 2, then use Backup & safety).";
      } else if (!diskGates.archiveDiskReady) {
        archiveSkipNote =
          " Backup skipped (backup drive not ready — check Backup & safety).";
      } else {
        setStatusNote(
          `Offload done (${copiedOk}). Backing up to archive with checksum verify…`
        );
        const plan = planArchiveBatch({
          media: registeredAssets,
          projectRoot,
          archiveRoot,
          projectSlug: context?.projectName || "project",
        });
        if (!plan.items.length) {
          archiveSkipNote = plan.skipped.length
            ? " Backup skipped (clips already backed up or missing paths)."
            : " Backup skipped (nothing to archive).";
        } else {
          try {
            setProgress({
              pct: archivePctStart + 2,
              label: `Backing up ${plan.items.length} clip(s)…`,
            });
            const batchCopy = await agentCopyVerifiedBatch(
              DEFAULT_AGENT_BASE_URL,
              opts.token,
              plan.items.map((i) => ({
                id: i.mediaAssetId,
                sourcePath: i.sourcePath,
                destPath: i.destPath,
              }))
            );
            const okResults = batchCopy.results.filter((r) => r.ok);
            archiveFailed =
              batchCopy.failedCount ?? batchCopy.results.filter((r) => !r.ok).length;
            archiveOk = okResults.length;
            setProgress({
              pct: archivePctStart + Math.max(archivePctSpan - 2, 5),
              label: `Saving backup records (${archiveOk})…`,
            });
            const byId = new Map(okResults.map((r) => [r.id, r]));
            const patches = plan.items
              .map((item) => {
                const r = byId.get(item.mediaAssetId);
                if (!r || !r.ok) return null;
                const prev =
                  registeredAssets.find((m) => m.id === item.mediaAssetId) ||
                  media.find((m) => m.id === item.mediaAssetId);
                const prevCount =
                  prev?.verifiedCopyCount ?? (prev?.ingestStatus === "verified" ? 1 : 0);
                return {
                  id: item.mediaAssetId,
                  archivePath: r.destPath,
                  checksum: r.checksum,
                  checksumAlgorithm: "sha256" as const,
                  verifiedCopyCount: Math.max(prevCount, 1) + (prev?.archivePath ? 0 : 1),
                  sizeBytes: r.sizeBytes,
                };
              })
              .filter(Boolean) as Array<{ id: string } & Partial<MediaAsset>>;
            if (patches.length) {
              await aiEditorPatchMedia(getToken, projectId, patches);
              setMedia((prev) =>
                prev.map((m) => {
                  const p = patches.find((x) => x.id === m.id);
                  return p ? { ...m, ...p } : m;
                })
              );
              const log = await aiEditorArchiveAction(getToken, projectId, {
                action: "log",
                type: "archive",
                count: patches.length,
                mediaIds: patches.map((p) => p.id),
                message:
                  `Archived ${patches.length} clip(s) after managed ingest` +
                  (archiveFailed ? ` (${archiveFailed} failed)` : ""),
              });
              if (log.job) setJobs((prev) => [log.job!, ...prev]);
            }
          } catch {
            archiveFailed = plan.items.length;
            archiveOk = 0;
            archiveSkipNote = " Backup failed — try Backup & safety later.";
          }
        }
      }
    }

    const stopped = cancelBatchRef.current || abort.signal.aborted;
    const proxyNote =
      wantProxy && registeredAssets.length && !copyStopped
        ? proxyOk || proxyFailed
          ? ` Proxies: ${proxyOk} ready` +
            (proxyFailed ? `, ${proxyFailed} failed` : "") +
            "."
          : " Proxies skipped (formats already browser-friendly)."
        : wantProxy && copyStopped
          ? " Proxies skipped (stopped during copy)."
          : "";
    const analyzeNote =
      wantAnalyze && registeredAssets.length && !copyStopped && !proxyStopped
        ? analyzeOk || analyzeFailed
          ? ` Analyzed: ${analyzeOk}` +
            (analyzeFailed ? `, ${analyzeFailed} failed` : "") +
            " (no speech)."
          : " Analysis skipped (no playable paths)."
        : wantAnalyze && (copyStopped || proxyStopped)
          ? " Analysis skipped (stopped earlier)."
          : "";
    const archiveNote =
      archiveSkipNote ||
      (wantArchive && registeredAssets.length && !copyStopped && !proxyStopped && !analyzeStopped
        ? archiveOk || archiveFailed
          ? ` Backup: ${archiveOk}` +
            (archiveFailed ? `, ${archiveFailed} failed` : "") +
            "."
          : ""
        : wantArchive && (copyStopped || proxyStopped || analyzeStopped)
          ? " Backup skipped (stopped earlier)."
          : "");
    setStatusNote(
      stopped
        ? `Stopped — saved ${copiedOk} clip(s) that finished copying into ${cam}.${proxyNote}${analyzeNote}${archiveNote}`
        : `Copied and verified ${copiedOk} clip(s) into ${cam}` +
            (failed ? ` (${failed} failed)` : "") +
            "." +
            proxyNote +
            analyzeNote +
            archiveNote +
            " Camera cards are never erased by ShootSpine."
    );

    const backupStatus = (() => {
      if (!wantArchive) return "not_requested" as const;
      if (archiveOk > 0 && archiveFailed > 0) return "partial" as const;
      if (archiveOk > 0) return "done" as const;
      if (archiveSkipNote.includes("no backup folder")) return "skipped_no_folder" as const;
      if (archiveSkipNote.includes("not ready")) return "skipped_drive" as const;
      if (
        archiveSkipNote.includes("stopped") ||
        copyStopped ||
        proxyStopped ||
        analyzeStopped
      ) {
        return "skipped_stopped" as const;
      }
      if (archiveFailed > 0 || archiveSkipNote.toLowerCase().includes("failed")) {
        return "failed" as const;
      }
      if (archiveSkipNote.toLowerCase().includes("already")) return "done" as const;
      return "not_requested" as const;
    })();

    setPostIngestSafety(
      describePostIngestCardWipe({
        copiedOk,
        failed,
        stopped,
        cameraLabel: cam,
        backup: backupStatus,
        backupOk: archiveOk,
        backupFailed: archiveFailed,
      })
    );

    // Thin IngestSession stub — persist last pass + activity job (full history later).
    try {
      const logged = await aiEditorLogManagedIngest(getToken, projectId, {
        ingestSummary: {
          at: new Date().toISOString(),
          cameraLabel: cam,
          copiedOk,
          failed,
          stopped,
          ...(wantProxy
            ? { proxiesOk: proxyOk, proxiesFailed: proxyFailed }
            : {}),
          ...(wantAnalyze
            ? { analyzedOk: analyzeOk, analyzedFailed: analyzeFailed }
            : {}),
          backupStatus,
          ...(wantArchive
            ? { backupOk: archiveOk, backupFailed: archiveFailed }
            : {}),
        },
      });
      setSettings(logged.settings);
      setJobs((prev) => [logged.job, ...prev.filter((j) => j.id !== logged.job.id)]);
    } catch {
      /* non-fatal — ingest already landed */
    }
  }

  function requestStopBatch() {
    cancelBatchRef.current = true;
    setBatchStopping(true);
    copyAbortRef.current?.abort();
    setProgress((prev) =>
      prev ? { ...prev, label: "Stopping — finishing the current clip, then closing…" } : prev
    );
  }

  function addToIngestQueue() {
    const sourcePath = indexFolderPath.trim();
    if (!sourcePath) return;
    setIngestQueue((prev) => [
      ...prev,
      {
        id: `${Date.now()}_${cameraLabel}`,
        sourcePath,
        cameraLabel,
        prepare: prepareWhileCopying,
      },
    ]);
    setStatusNote(
      `Queued ${cameraLabel.replace(/_/g, " ")} from that folder. Add more cameras, then Run queue.`
    );
  }

  async function runIngestQueue() {
    if (!ingestQueue.length) return;
    if (!requireEditDisk()) return;
    setBusy("index");
    setError(null);
    setStatusNote(null);
    setPostIngestSafety(null);
    try {
      const health = await checkAgentHealth();
      setAgent(health);
      if (!health.connected) throw new Error("Connect this computer first");
      const token = await ensureAgentSession();
      const queue = [...ingestQueue];
      for (let qi = 0; qi < queue.length; qi++) {
        const item = queue[qi];
        setProgress({
          pct: Math.round((qi / queue.length) * 100),
          label: `Camera batch ${qi + 1}/${queue.length}: ${item.cameraLabel.replace(/_/g, " ")}`,
        });
        const indexed = await agentIndexFolder(
          DEFAULT_AGENT_BASE_URL,
          token,
          item.sourcePath,
          true
        );
        const sourceFiles = filterIngestableFiles(indexed.files || []);
        if (!sourceFiles.length) continue;
        await runManagedCopy({
          token,
          sourceFiles,
          camera: item.cameraLabel,
          prepare: item.prepare,
        });
      }
      setIngestQueue([]);
      setStatusNote("Multi-camera queue finished. Review safety status before erasing any card.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Queue failed");
    } finally {
      setBusy(null);
      setProgress(null);
    }
  }

  /** Managed Ingest Phase B — one-click card → verified project copy. */
  async function onManagedIngestIntoProject() {
    const src =
      detectedSources.find((s) => s.id === selectedSourceId) || detectedSources[0];
    if (!src?.mediaRoot) {
      setError("Select a detected camera card first.");
      return;
    }
    if (!requireEditDisk()) return;

    let destRoot = (settings?.projectRootPath || storagePath || "").trim();
    if (!destRoot) {
      setError("Pick a destination drive (or save a workspace) before ingesting.");
      return;
    }

    const camera =
      cameraLabel?.trim() ||
      src.suggestedCameraAssignment ||
      "CAMERA_A";

    cancelBatchRef.current = false;
    setBusy("index");
    setError(null);
    setStatusNote(null);
    setPostIngestSafety(null);
    setAddMode("copy");
    setIndexFolderPath(src.mediaRoot);
    if (src.suggestedCameraAssignment && !cameraLabel.trim()) {
      setCameraLabel(src.suggestedCameraAssignment);
    }
    setPrepareWhileCopying(ingestOptions.generateProxies);
    // One-click ingest always verifies (agent SHA-256); keep UI in sync.
    setIngestOptions((prev) => ({ ...prev, verifyCopy: true }));

    try {
      const health = await checkAgentHealth();
      setAgent(health);
      if (!health.connected) throw new Error("Connect this computer first");
      const token = await ensureAgentSession();

      if (!settings?.projectRootPath && storagePath.trim()) {
        const saved = await onSaveWorkspace(storagePath.trim());
        if (!saved) throw new Error("Could not save workspace before ingest.");
        destRoot = saved;
        setBusy("index");
      }

      setProgress({ pct: 2, label: "Scanning card for clips…" });
      const indexed = await agentIndexFolder(
        DEFAULT_AGENT_BASE_URL,
        token,
        src.mediaRoot,
        true
      );
      const sourceFiles = filterIngestableFiles(indexed.files || []);
      if (!sourceFiles.length) {
        throw new Error("No video or audio files found on this card.");
      }

      const trailing: string[] = [];
      if (ingestOptions.generateProxies) trailing.push("proxies");
      if (ingestOptions.analyzeDuringIngest) trailing.push("analyze");
      if (ingestOptions.copyToArchive) trailing.push("backup");
      setStatusNote(
        `Ingesting ${sourceFiles.length} clip${sourceFiles.length === 1 ? "" : "s"} from card → project${
          trailing.length ? ` (${trailing.join(" + ")} after copy)` : ""
        }…`
      );

      await runManagedCopy({
        token,
        sourceFiles,
        camera,
        prepare: ingestOptions.generateProxies,
        analyze: ingestOptions.analyzeDuringIngest,
        archive: ingestOptions.copyToArchive,
        projectRoot: destRoot,
      });

      setPendingCopyFiles(null);
      setSelectedCopyPaths(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Managed ingest failed");
    } finally {
      setBusy(null);
      setProgress(null);
      setBatchStopping(false);
      copyAbortRef.current = null;
    }
  }

  async function onAnalyzeFootage() {
    const eligible = media
      .map((m) => ({ m, path: playbackPathForAsset(m) }))
      .filter((x): x is { m: MediaAsset; path: string } => Boolean(x.path));
    const targets = eligible.slice(0, 40);
    if (!targets.length) {
      setStatusNote("Add footage first.");
      return;
    }
    if (!requireEditDisk()) return;
    const capped = eligible.length > targets.length;
    cancelBatchRef.current = false;
    setBusy("analyze");
    setError(null);
    setStatusNote(
      capped
        ? `Analyzing the first ${targets.length} of ${eligible.length} clips this pass-`
        : null
    );
    try {
      const health = await checkAgentHealth();
      setAgent(health);
      if (!health.connected) throw new Error(AGENT_CONNECT_MSG);
      if (runTranscription && health.whisperAvailable === false) {
        setStatusNote(
          "Transcription requested but speech-to-text isn't set up - continuing with technical + shot detection only."
        );
      }
      const token = await ensureAgentSession();
      const results = [];
      for (let i = 0; i < targets.length; i++) {
        if (cancelBatchRef.current) break;
        const { m, path } = targets[i];
        setProgress({
          pct: Math.round(((i + 1) / targets.length) * 100),
          label: `Understanding clip ${i + 1}/${targets.length}: ${m.filename}`,
        });
        try {
          const analyzed = await agentAnalyze(DEFAULT_AGENT_BASE_URL, token, path, {
            transcribe: runTranscription && health.whisperAvailable !== false,
          });
          results.push({
            mediaAssetId: m.id,
            technical: {
              mediaAssetId: m.id,
              ...analyzed.technical,
              analyzedAt: new Date().toISOString(),
            },
            shots: analyzed.shots.map((s, idx) => ({
              id: `${m.id}_shot_${idx}`,
              mediaAssetId: m.id,
              ...s,
            })),
            transcript: (analyzed.transcript.segments || []).map((t, idx) => ({
              id: `${m.id}_tr_${idx}`,
              mediaAssetId: m.id,
              startSeconds: t.startSeconds,
              endSeconds: t.endSeconds,
              text: t.text,
              confidence: t.confidence,
            })),
          });
        } catch (e) {
          results.push({
            mediaAssetId: m.id,
            error: e instanceof Error ? e.message : "analyze failed",
            shots: [],
            transcript: [],
          });
        }
      }
      if (!results.length) {
        setStatusNote("Analysis stopped before any clips finished.");
        return;
      }
      const failedCount = results.filter((r) => "error" in r && r.error).length;
      const okCount = results.length - failedCount;
      const saved = await aiEditorSaveAnalysis(getToken, projectId, results);
      setAnalysis(saved.analysis);
      setJobs((prev) => [saved.job, ...prev]);
      await load();
      const stopped = cancelBatchRef.current;
      const capNote = capped
        ? ` First ${targets.length} of ${eligible.length} this pass - run again for the rest.`
        : "";
      const stopNote = stopped ? " Stopped early - saved what finished." : "";
      if (failedCount > 0) {
        setStatusNote(
          `Understood ${okCount} of ${results.length} clip(s)` +
            (runTranscription ? " (transcript where available)" : "") +
            `. ${failedCount} couldn't be analyzed - check those files and try again.` +
            capNote +
            stopNote
        );
      } else {
        setStatusNote(
          `Analyzed ${okCount} clip(s): technical checks + shot breaks` +
            (runTranscription ? " + transcript where available" : "") +
            "." +
            capNote +
            stopNote
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setBusy(null);
      setProgress(null);
    }
  }

  async function onRunMatch() {
    setBusy("match");
    setError(null);
    setStatusNote(null);
    try {
      const res = await aiEditorRunMatch(getToken, projectId, coverage?.overrides);
      setCoverage(res.coverage);
      setJobs((prev) => [res.job, ...prev]);
      const preferredN =
        res.coverage.shots?.filter((s) => s.preferredMediaAssetId).length ?? 0;
      const unmatchedN = res.coverage.unmatchedMediaIds?.length ?? 0;
      const coverageLine = res.coverage.plannedShotCount
        ? `Coverage: ${res.coverage.coveredCount} covered, ${res.coverage.partialCount} partial, ${res.coverage.missingCount} missing.`
        : "No planned shots on the board yet - matching saved for when coverage exists.";
      const unmatchedCue =
        unmatchedN > 0
          ? ` ${unmatchedN} clip${unmatchedN === 1 ? "" : "s"} didn’t match any shot.`
          : "";
      const nextCue =
        preferredN > 0
          ? timeline
            ? " Next: Rebuild first cut (or Play) to use preferred takes."
            : " Next: Build a first cut below, then Play."
          : "";
      setStatusNote(`${coverageLine}${unmatchedCue}${nextCue}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Matching failed");
    } finally {
      setBusy(null);
    }
  }

  /** Best coverage row for a media asset (preferred match, else highest-score candidate). */
  function coverageShotForMedia(mediaAssetId: string) {
    const shots = coverage?.shots;
    if (!shots?.length) return null;
    const asPreferred = shots.find((s) => s.preferredMediaAssetId === mediaAssetId);
    if (asPreferred) return asPreferred;
    let best: { shot: (typeof shots)[number]; score: number } | null = null;
    for (const shot of shots) {
      const cand = shot.candidates.find((c) => c.mediaAssetId === mediaAssetId);
      if (!cand) continue;
      if (!best || cand.score > best.score) best = { shot, score: cand.score };
    }
    return best?.shot ?? null;
  }

  async function onPreferTake(
    plannedShotId: string,
    mediaAssetId: string,
    opts?: { quiet?: boolean; label?: string; shotLabel?: string }
  ) {
    if (!opts?.quiet) setBusy("match");
    setError(null);
    try {
      const overrides = [
        ...(coverage?.overrides ?? []).filter((o) => o.plannedShotId !== plannedShotId),
        { plannedShotId, mediaAssetId },
      ];
      const res = await aiEditorRunMatch(getToken, projectId, overrides);
      setCoverage(res.coverage);
      setJobs((prev) => [res.job, ...prev]);
      const shot =
        opts?.shotLabel ||
        res.coverage.shots.find((s) => s.plannedShotId === plannedShotId)?.shotName ||
        "shot";
      const take = opts?.label?.trim();
      const head = take
        ? `Preferred for ${shot}: ${take}.`
        : `Preferred take updated for ${shot}.`;
      const next = timeline
        ? " Press R in the player (or Rebuild first cut) to reshuffle."
        : " Next: Build a first cut, then Play to review.";
      setStatusNote(`${head}${next}`);
      return res;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not set preferred take";
      if (opts?.quiet) throw e instanceof Error ? e : new Error(msg);
      setError(msg);
      return undefined;
    } finally {
      if (!opts?.quiet) setBusy(null);
    }
  }

  async function onRenamePreferredFromShotList() {
    if (!coverage?.shots?.some((s) => s.preferredMediaAssetId)) {
      setError("Match clips and set preferred takes first.");
      return;
    }
    const planned = planPreferredTakeRenames({ coverage, context, media });
    if (!planned.length) {
      setStatusNote("Preferred takes already use shot-list names (or none to rename).");
      return;
    }
    const preview = planned
      .slice(0, 6)
      .map((p) => `${p.fromFilename} → ${p.filename}`)
      .join("\n");
    const more = planned.length > 6 ? `\n…and ${planned.length - 6} more` : "";
    const ok = window.confirm(
      `Rename ${planned.length} preferred take(s) in ShootSpine to match the shot list?\n\n` +
        `This updates display names only — camera files on disk stay as-is.\n` +
        `Original camera names are kept as originalFilename.\n\n${preview}${more}`
    );
    if (!ok) return;

    setBusy("match");
    setError(null);
    setStatusNote(null);
    try {
      const patches = planned.map((p) => ({
        id: p.id,
        filename: p.filename,
        clipName: p.clipName,
        originalFilename: p.originalFilename,
      }));
      await aiEditorPatchMedia(getToken, projectId, patches);
      const byId = new Map(patches.map((p) => [p.id, p]));
      setMedia((prev) =>
        prev.map((m) => {
          const patch = byId.get(m.id);
          return patch
            ? {
                ...m,
                filename: patch.filename,
                clipName: patch.clipName,
                originalFilename: patch.originalFilename || m.originalFilename,
              }
            : m;
        })
      );
      setStatusNote(
        `Renamed ${patches.length} preferred take(s) from the shot list (display names only).`
      );
      // Refresh coverage so Preferred labels show the new names.
      const res = await aiEditorRunMatch(getToken, projectId, coverage.overrides);
      setCoverage(res.coverage);
      setJobs((prev) => [res.job, ...prev]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not rename preferred takes");
    } finally {
      setBusy(null);
    }
  }

  /** Clear cached Resolve export; flag Step 10 if a package may be out of date. */
  function invalidateLocalCutExport() {
    setExportFiles(null);
    setExportStamp(null);
    setResolvePackageStale(true);
  }

  async function onBuildRoughCut(opts?: { skipConfirm?: boolean; quiet?: boolean }) {
    const hasCut = Boolean(videoTrack?.clips?.length);
    const multiReels = (timeline?.reels?.length ?? 0) > 1;
    if (hasCut && !opts?.skipConfirm) {
      const ok = window.confirm(
        multiReels
          ? "Rebuild replaces your current cut and act/reel layout with a new assembly from preferred takes. Earlier versions stay under Versions / Restore. Continue?"
          : "Rebuild replaces your current first cut with a new assembly from preferred takes. Earlier versions stay under Versions / Restore. Continue?"
      );
      if (!ok) return undefined;
    }
    if (!opts?.quiet) setBusy("rough_cut");
    setError(null);
    if (!opts?.quiet) setStatusNote(null);
    try {
      const res = await aiEditorTimelineAction(getToken, projectId, {
        action: "build_rough_cut",
        note: "First cut from preferred takes",
      });
      setTimeline(res.timeline);
      invalidateLocalCutExport();
      setTimelineVersions(res.versions);
      setJobs((prev) => [res.job, ...prev]);
      setStatusNote(
        `First cut v${res.summary.version}: ${res.summary.clipCount} clip placements - ${res.summary.durationTimecode}`
      );
      return res;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not build first cut";
      if (opts?.quiet) throw e instanceof Error ? e : new Error(msg);
      setError(msg);
      return undefined;
    } finally {
      if (!opts?.quiet) setBusy(null);
    }
  }

  async function onRippleDeleteClip(
    clipId: string,
    opts?: { quiet?: boolean; label?: string }
  ) {
    if (!opts?.quiet) setBusy("rough_cut");
    setError(null);
    try {
      const res = await aiEditorTimelineAction(getToken, projectId, {
        action: "apply_ops",
        ops: [{ type: "rippleDelete", clipId }],
        note: "Ripple delete",
      });
      setTimeline(res.timeline);
      invalidateLocalCutExport();
      setTimelineVersions(res.versions);
      const n = res.summary.clipCount;
      const name = opts?.label?.trim();
      setStatusNote(
        name
          ? `Dropped “${name}” · cut is now v${res.summary.version} · ${n} clip${n === 1 ? "" : "s"}`
          : `Removed from cut · v${res.summary.version} · ${n} clip${n === 1 ? "" : "s"}`
      );
      return res;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Edit failed";
      if (opts?.quiet) throw e instanceof Error ? e : new Error(msg);
      setError(msg);
      return undefined;
    } finally {
      if (!opts?.quiet) setBusy(null);
    }
  }

  /** Join two contiguous same-media clips (Play review — reverse of Split). */
  async function onJoinCutClips(
    leftClipId: string,
    rightClipId: string,
    opts?: { quiet?: boolean }
  ) {
    if (!timeline) throw new Error("No timeline yet");
    const track = timeline.tracks.find((t) => t.kind === "video");
    const left = track?.clips.find((c) => c.id === leftClipId);
    const right = track?.clips.find((c) => c.id === rightClipId);
    if (!track || !left || !right) throw new Error("Clips not found");
    if (left.mediaAssetId !== right.mediaAssetId) {
      throw new Error("Only join two pieces of the same take");
    }
    if (left.sourceInFrame + left.durationFrames !== right.sourceInFrame) {
      throw new Error("Clips aren’t contiguous in the source — can’t join");
    }
    if (left.timelineStartFrame + left.durationFrames !== right.timelineStartFrame) {
      throw new Error("Clips aren’t neighbors on the cut — can’t join");
    }
    const durationFrames = left.durationFrames + right.durationFrames;
    if (!opts?.quiet) setBusy("rough_cut");
    setError(null);
    try {
      const res = await aiEditorTimelineAction(getToken, projectId, {
        action: "apply_ops",
        ops: [
          {
            type: "trim",
            clipId: leftClipId,
            sourceInFrame: left.sourceInFrame,
            durationFrames,
          },
          { type: "rippleDelete", clipId: rightClipId },
        ],
        note: "Join from Play review",
      });
      setTimeline(res.timeline);
      invalidateLocalCutExport();
      setTimelineVersions(res.versions);
      const joined = res.timeline.tracks
        .find((t) => t.kind === "video")
        ?.clips.find((c) => c.id === leftClipId);
      if (!joined) {
        throw new Error("Join saved, but couldn’t locate the clip — Play again.");
      }
      setStatusNote(
        `Joined clips · cut is now v${res.summary.version} · ${res.summary.clipCount} clips`
      );
      return { res, joined, frameRate: res.timeline.frameRate };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not join clips";
      if (opts?.quiet) throw e instanceof Error ? e : new Error(msg);
      setError(msg);
      return undefined;
    } finally {
      if (!opts?.quiet) setBusy(null);
    }
  }

  /** Split a cut clip at a source-seconds playhead (Play review). */
  async function onSplitCutClip(
    clipId: string,
    atSourceSeconds: number,
    opts?: { quiet?: boolean }
  ) {
    if (!timeline) throw new Error("No timeline yet");
    const track = timeline.tracks.find((t) => t.kind === "video");
    const clip = track?.clips.find((c) => c.id === clipId);
    if (!track || !clip) throw new Error("Clip not found");
    const fps = timeline.frameRate;
    const sourceInSec = framesToSeconds(clip.sourceInFrame, fps);
    const relFrames = secondsToFrames(atSourceSeconds - sourceInSec, fps);
    if (relFrames <= 0 || relFrames >= clip.durationFrames) {
      throw new Error("Scrub inside the take, then Split");
    }
    const atTimelineFrame = clip.timelineStartFrame + relFrames;
    if (!opts?.quiet) setBusy("rough_cut");
    setError(null);
    try {
      const res = await aiEditorTimelineAction(getToken, projectId, {
        action: "apply_ops",
        ops: [{ type: "split", clipId, atTimelineFrame }],
        note: "Split from Play review",
      });
      setTimeline(res.timeline);
      invalidateLocalCutExport();
      setTimelineVersions(res.versions);
      const nextTrack = res.timeline.tracks.find((t) => t.kind === "video");
      const left = nextTrack?.clips.find((c) => c.id === clipId);
      const right = nextTrack?.clips.find(
        (c) =>
          c.id !== clipId &&
          c.mediaAssetId === clip.mediaAssetId &&
          c.sourceInFrame === (left?.sourceInFrame ?? 0) + (left?.durationFrames ?? 0)
      );
      if (!left || !right) {
        throw new Error("Split saved, but couldn’t locate both halves — Play again.");
      }
      setStatusNote(
        `Split clip · cut is now v${res.summary.version} · ${res.summary.clipCount} clips`
      );
      return { res, left, right, frameRate: res.timeline.frameRate };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not split clip";
      if (opts?.quiet) throw e instanceof Error ? e : new Error(msg);
      setError(msg);
      return undefined;
    } finally {
      if (!opts?.quiet) setBusy(null);
    }
  }

  /** Trim a cut clip’s source in/out from Play review (compacts the track after). */
  async function onTrimCutClip(
    clipId: string,
    startSeconds: number,
    endSeconds: number,
    opts?: { quiet?: boolean }
  ) {
    if (!timeline) throw new Error("No timeline yet");
    const track = timeline.tracks.find((t) => t.kind === "video");
    if (!track) throw new Error("No video track");
    if (!(endSeconds > startSeconds + 0.04)) {
      throw new Error("Out point must be after in point");
    }
    const sourceInFrame = secondsToFrames(startSeconds, timeline.frameRate);
    const durationFrames = Math.max(
      1,
      secondsToFrames(endSeconds - startSeconds, timeline.frameRate)
    );
    if (!opts?.quiet) setBusy("rough_cut");
    setError(null);
    try {
      const res = await aiEditorTimelineAction(getToken, projectId, {
        action: "apply_ops",
        ops: [
          { type: "trim", clipId, sourceInFrame, durationFrames },
          // Compact so shortening a take doesn’t leave a hole in the assembly.
          {
            type: "reorder",
            trackId: track.id,
            clipIds: track.clips.map((c) => c.id),
          },
        ],
        note: "Trim from Play review",
      });
      setTimeline(res.timeline);
      invalidateLocalCutExport();
      setTimelineVersions(res.versions);
      setStatusNote(
        `Trimmed clip · cut is now v${res.summary.version} · ${res.summary.durationTimecode}`
      );
      return res;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not trim clip";
      if (opts?.quiet) throw e instanceof Error ? e : new Error(msg);
      setError(msg);
      return undefined;
    } finally {
      if (!opts?.quiet) setBusy(null);
    }
  }

  /** Slip source window while keeping cut duration (Play review). */
  async function onSlipCutClip(
    clipId: string,
    deltaSeconds: number,
    opts?: { quiet?: boolean; mediaDurationSeconds?: number }
  ) {
    if (!timeline) throw new Error("No timeline yet");
    const track = timeline.tracks.find((t) => t.kind === "video");
    const clip = track?.clips.find((c) => c.id === clipId);
    if (!track || !clip) throw new Error("Clip not found");
    const fps = timeline.frameRate;
    const asset = media.find((m) => m.id === clip.mediaAssetId);
    const mediaDurSec =
      (typeof opts?.mediaDurationSeconds === "number" &&
      opts.mediaDurationSeconds > 0
        ? opts.mediaDurationSeconds
        : undefined) ??
      (typeof asset?.durationSeconds === "number" && asset.durationSeconds > 0
        ? asset.durationSeconds
        : undefined);
    if (mediaDurSec == null) {
      throw new Error("Wait for the clip to load, then Slip");
    }
    const mediaDurFrames = secondsToFrames(mediaDurSec, fps);
    const { durationFrames } = clip;
    if (durationFrames >= mediaDurFrames) {
      throw new Error("Nothing to slip — this take fills the whole file");
    }
    const deltaFrames = secondsToFrames(deltaSeconds, fps);
    if (deltaFrames === 0) {
      throw new Error("Slip a little farther");
    }
    const maxIn = Math.max(0, mediaDurFrames - durationFrames);
    const nextIn = Math.max(0, Math.min(maxIn, clip.sourceInFrame + deltaFrames));
    if (nextIn === clip.sourceInFrame) {
      throw new Error(
        deltaSeconds < 0
          ? "Already at the start of the take"
          : "Already at the end of the take"
      );
    }
    if (!opts?.quiet) setBusy("rough_cut");
    setError(null);
    try {
      const res = await aiEditorTimelineAction(getToken, projectId, {
        action: "apply_ops",
        ops: [
          {
            type: "trim",
            clipId,
            sourceInFrame: nextIn,
            durationFrames,
          },
        ],
        note: "Slip from Play review",
      });
      setTimeline(res.timeline);
      invalidateLocalCutExport();
      setTimelineVersions(res.versions);
      const slipped = res.timeline.tracks
        .find((t) => t.kind === "video")
        ?.clips.find((c) => c.id === clipId);
      if (!slipped) {
        throw new Error("Slip saved, but couldn’t locate the clip — Play again.");
      }
      const startSeconds = framesToSeconds(slipped.sourceInFrame, fps);
      const endSeconds =
        startSeconds + framesToSeconds(slipped.durationFrames, fps);
      setStatusNote(
        `Slipped clip · cut is now v${res.summary.version} · ${res.summary.clipCount} clips`
      );
      return { res, slipped, frameRate: fps, startSeconds, endSeconds };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not slip clip";
      if (opts?.quiet) throw e instanceof Error ? e : new Error(msg);
      setError(msg);
      return undefined;
    } finally {
      if (!opts?.quiet) setBusy(null);
    }
  }

  /** Roll shared edit between two neighbor clips (Play review). */
  async function onRollCutClips(
    leftClipId: string,
    rightClipId: string,
    deltaSeconds: number,
    opts?: { quiet?: boolean; leftMediaDurationSeconds?: number }
  ) {
    if (!timeline) throw new Error("No timeline yet");
    const track = timeline.tracks.find((t) => t.kind === "video");
    const left = track?.clips.find((c) => c.id === leftClipId);
    const right = track?.clips.find((c) => c.id === rightClipId);
    if (!track || !left || !right) throw new Error("Clips not found");
    if (left.timelineStartFrame + left.durationFrames !== right.timelineStartFrame) {
      throw new Error("Clips aren’t neighbors on the cut — can’t roll");
    }
    const fps = timeline.frameRate;
    const deltaFrames = secondsToFrames(deltaSeconds, fps);
    if (deltaFrames === 0) throw new Error("Roll a little farther");

    const minDur = Math.max(1, secondsToFrames(0.08, fps));
    const leftNextDur = left.durationFrames + deltaFrames;
    const rightNextDur = right.durationFrames - deltaFrames;
    const rightNextIn = right.sourceInFrame + deltaFrames;
    if (leftNextDur < minDur) {
      throw new Error("Can’t roll earlier — current clip is already short");
    }
    if (rightNextDur < minDur) {
      throw new Error("Can’t roll later — next clip is already short");
    }
    if (rightNextIn < 0) {
      throw new Error("Can’t roll earlier — next take has no earlier media");
    }

    const leftAsset = media.find((m) => m.id === left.mediaAssetId);
    const leftMediaDurSec =
      (typeof opts?.leftMediaDurationSeconds === "number" &&
      opts.leftMediaDurationSeconds > 0
        ? opts.leftMediaDurationSeconds
        : undefined) ??
      (typeof leftAsset?.durationSeconds === "number" &&
      leftAsset.durationSeconds > 0
        ? leftAsset.durationSeconds
        : undefined);
    if (leftMediaDurSec != null) {
      const leftMediaFrames = secondsToFrames(leftMediaDurSec, fps);
      if (left.sourceInFrame + leftNextDur > leftMediaFrames) {
        throw new Error("Can’t roll later — current take ends");
      }
    } else if (deltaFrames > 0) {
      throw new Error("Wait for the clip to load, then Roll");
    }

    const rightAsset = media.find((m) => m.id === right.mediaAssetId);
    if (
      typeof rightAsset?.durationSeconds === "number" &&
      rightAsset.durationSeconds > 0
    ) {
      const rightMediaFrames = secondsToFrames(rightAsset.durationSeconds, fps);
      if (rightNextIn + rightNextDur > rightMediaFrames) {
        throw new Error("Can’t roll earlier — next take ends");
      }
    }

    if (!opts?.quiet) setBusy("rough_cut");
    setError(null);
    try {
      const res = await aiEditorTimelineAction(getToken, projectId, {
        action: "apply_ops",
        ops: [
          {
            type: "trim",
            clipId: leftClipId,
            sourceInFrame: left.sourceInFrame,
            durationFrames: leftNextDur,
          },
          {
            type: "trim",
            clipId: rightClipId,
            sourceInFrame: rightNextIn,
            durationFrames: rightNextDur,
          },
          {
            type: "reorder",
            trackId: track.id,
            clipIds: track.clips.map((c) => c.id),
          },
        ],
        note: "Roll from Play review",
      });
      setTimeline(res.timeline);
      invalidateLocalCutExport();
      setTimelineVersions(res.versions);
      const nextTrack = res.timeline.tracks.find((t) => t.kind === "video");
      const leftClip = nextTrack?.clips.find((c) => c.id === leftClipId);
      const rightClip = nextTrack?.clips.find((c) => c.id === rightClipId);
      if (!leftClip || !rightClip) {
        throw new Error("Roll saved, but couldn’t locate clips — Play again.");
      }
      setStatusNote(
        `Rolled edit · cut is now v${res.summary.version} · ${res.summary.clipCount} clips`
      );
      return { res, left: leftClip, right: rightClip, frameRate: fps };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not roll edit";
      if (opts?.quiet) throw e instanceof Error ? e : new Error(msg);
      setError(msg);
      return undefined;
    } finally {
      if (!opts?.quiet) setBusy(null);
    }
  }

  /** Duplicate a cut clip immediately after itself (Play review). */
  async function onDuplicateCutClip(
    clipId: string,
    opts?: { quiet?: boolean }
  ) {
    if (!timeline) throw new Error("No timeline yet");
    const track = timeline.tracks.find((t) => t.kind === "video");
    const clip = track?.clips.find((c) => c.id === clipId);
    if (!track || !clip) throw new Error("Clip not found");
    const insertAt = clip.timelineStartFrame + clip.durationFrames;
    if (!opts?.quiet) setBusy("rough_cut");
    setError(null);
    try {
      const res = await aiEditorTimelineAction(getToken, projectId, {
        action: "apply_ops",
        ops: [
          {
            type: "insert",
            trackId: track.id,
            mediaAssetId: clip.mediaAssetId,
            timelineStartFrame: insertAt,
            sourceInFrame: clip.sourceInFrame,
            durationFrames: clip.durationFrames,
            label: clip.label,
            plannedShotId: clip.plannedShotId,
          },
        ],
        note: "Duplicate from Play review",
      });
      setTimeline(res.timeline);
      invalidateLocalCutExport();
      setTimelineVersions(res.versions);
      const nextTrack = res.timeline.tracks.find((t) => t.kind === "video");
      const copy = nextTrack?.clips.find(
        (c) =>
          c.id !== clipId &&
          c.mediaAssetId === clip.mediaAssetId &&
          c.sourceInFrame === clip.sourceInFrame &&
          c.durationFrames === clip.durationFrames &&
          c.timelineStartFrame === insertAt
      );
      if (!copy) {
        throw new Error("Duplicate saved, but couldn’t locate the copy — Play again.");
      }
      setStatusNote(
        `Duplicated clip · cut is now v${res.summary.version} · ${res.summary.clipCount} clips`
      );
      return { res, copy, frameRate: res.timeline.frameRate };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not duplicate clip";
      if (opts?.quiet) throw e instanceof Error ? e : new Error(msg);
      setError(msg);
      return undefined;
    } finally {
      if (!opts?.quiet) setBusy(null);
    }
  }

  /**
   * Reorder visible Play-review clips while preserving any non-visible
   * reel/track clips in their relative slots.
   */
  async function onReorderCutClips(
    visibleOrderedIds: string[],
    opts?: { quiet?: boolean }
  ) {
    if (!timeline) throw new Error("No timeline yet");
    const track = timeline.tracks.find((t) => t.kind === "video");
    if (!track) throw new Error("No video track");
    const visibleSet = new Set(visibleOrderedIds);
    const clipIds: string[] = [];
    let vi = 0;
    for (const c of track.clips) {
      if (visibleSet.has(c.id)) {
        const nextId = visibleOrderedIds[vi++];
        if (nextId) clipIds.push(nextId);
      } else {
        clipIds.push(c.id);
      }
    }
    while (vi < visibleOrderedIds.length) {
      clipIds.push(visibleOrderedIds[vi++]!);
    }
    const unchanged =
      clipIds.length === track.clips.length &&
      clipIds.every((id, i) => id === track.clips[i]?.id);
    if (unchanged) return undefined;

    if (!opts?.quiet) setBusy("rough_cut");
    setError(null);
    try {
      const res = await aiEditorTimelineAction(getToken, projectId, {
        action: "apply_ops",
        ops: [{ type: "reorder", trackId: track.id, clipIds }],
        note: "Reorder from Play review",
      });
      setTimeline(res.timeline);
      invalidateLocalCutExport();
      setTimelineVersions(res.versions);
      setStatusNote(
        `Reordered cut · now v${res.summary.version} · ${res.summary.clipCount} clips`
      );
      return res;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not reorder cut";
      if (opts?.quiet) throw e instanceof Error ? e : new Error(msg);
      setError(msg);
      return undefined;
    } finally {
      if (!opts?.quiet) setBusy(null);
    }
  }

  async function onStripNonVideoFromCut() {
    if (!stillClipsOnCut.length) return;
    setBusy("rough_cut");
    setError(null);
    try {
      const res = await aiEditorTimelineAction(getToken, projectId, {
        action: "strip_non_video",
        note: "Remove camera stills from first cut",
      });
      setTimeline(res.timeline);
      invalidateLocalCutExport();
      setTimelineVersions(res.versions);
      setStatusNote(
        `Removed camera stills / non-video from the cut (v${res.timeline.version}).`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not clean cut");
    } finally {
      setBusy(null);
    }
  }

  function clearReviewUndoStack() {
    reviewUndoStackRef.current = [];
    setReviewUndoDepth(0);
  }

  function pushReviewUndo(versionId: string) {
    reviewUndoStackRef.current.push(versionId);
    setReviewUndoDepth(reviewUndoStackRef.current.length);
  }

  function popReviewUndo(): string | undefined {
    const id = reviewUndoStackRef.current.pop();
    setReviewUndoDepth(reviewUndoStackRef.current.length);
    return id;
  }

  async function onRestoreVersion(
    versionId: string,
    opts?: { quiet?: boolean }
  ) {
    if (!opts?.quiet) setBusy("rough_cut");
    setError(null);
    try {
      const res = await aiEditorTimelineAction(getToken, projectId, {
        action: "restore_version",
        versionId,
      });
      setTimeline(res.timeline);
      invalidateLocalCutExport();
      setTimelineVersions(res.versions);
      setStatusNote(`Restored timeline to a previous version (now v${res.summary.version}).`);
      return res;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Restore failed";
      if (opts?.quiet) throw e instanceof Error ? e : new Error(msg);
      setError(msg);
      return undefined;
    } finally {
      if (!opts?.quiet) setBusy(null);
    }
  }

  async function openPreview(
    title: string,
    items: PreviewItem[],
    opts?: { reviewCut?: boolean }
  ) {
    if (!items.length) {
      setError("Nothing to play - clip has no local path on this PC.");
      return;
    }
    try {
      const health = await checkAgentHealth();
      setAgent(health);
      if (!health.connected) throw new Error("Connect this computer first to preview footage");
      const token = await ensureAgentSession();
      setPreview({
        title,
        items,
        token,
        sessionKey: `${Date.now()}`,
        reviewCut: opts?.reviewCut,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open preview");
    }
  }

  async function ensureProxyForWatch(asset: MediaAsset): Promise<string | null> {
    const existing = asset.proxyPath?.trim();
    if (existing && !assetNeedsBrowserProxy(asset)) return existing;

    const sourcePath = sourcePathForProxy(asset);
    if (!sourcePath) return null;
    if (!requireEditDisk()) return null;

    const health = await checkAgentHealth();
    setAgent(health);
    if (!health.connected) throw new Error("Connect this computer first to prepare a preview.");
    if (health.ffmpegAvailable === false) {
      throw new Error("Video tools are missing. Restart the Desktop Agent after FFmpeg is installed.");
    }

    setBusy("proxy");
    setProgress({ pct: 35, label: `Preparing preview: ${asset.filename}` });
    try {
      const token = await ensureAgentSession();
      const res = await agentCreateProxy(DEFAULT_AGENT_BASE_URL, token, sourcePath, {
        profile: "ai_720p",
      });
      await aiEditorPatchMedia(getToken, projectId, [
        { id: asset.id, proxyPath: res.proxyPath, needsProxy: true },
      ]);
      setMedia((prev) =>
        prev.map((m) =>
          m.id === asset.id ? { ...m, proxyPath: res.proxyPath, needsProxy: true } : m
        )
      );
      return res.proxyPath;
    } finally {
      setBusy(null);
      setProgress(null);
    }
  }

  async function previewClipAsset(asset: MediaAsset) {
    try {
      setError(null);
      let path = playbackPathForAsset(asset);
      if (!path) {
        setError("This clip has no path on this PC.");
        return;
      }
      // FX3 / XAVC originals usually fail in the browser and Windows Media Player.
      if (assetNeedsBrowserProxy(asset)) {
        setStatusNote(`Making a light preview for ${asset.filename} (original stays untouched)…`);
        path = await ensureProxyForWatch(asset);
        if (!path) {
          setError(
            "Couldn’t prepare a preview for this clip. Use Step 4 · Prepare clips, or open the original in DaVinci Resolve / VLC (Windows Media Player can’t play many FX3 files)."
          );
          return;
        }
        setStatusNote(null);
      }
      await openPreview(asset.filename, [{ path, label: asset.filename }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open preview");
    }
  }

  function previewTimelineClip(clipId: string) {
    if (!timeline) return;
    const clip = videoTrack?.clips.find((c) => c.id === clipId);
    const asset = clip ? media.find((m) => m.id === clip.mediaAssetId) : undefined;
    if (!clip || !asset) {
      setError("Clip media isn't available on this PC.");
      return;
    }
    void (async () => {
      try {
        setError(null);
        let path = playbackPathForAsset(asset);
        if (assetNeedsBrowserProxy(asset)) {
          setStatusNote(`Making a light preview for ${asset.filename}…`);
          path = await ensureProxyForWatch(asset);
          setStatusNote(null);
        }
        if (!path) {
          setError("Clip media isn't available on this PC.");
          return;
        }
        const startSeconds = framesToSeconds(clip.sourceInFrame, timeline.frameRate);
        const endSeconds =
          startSeconds + framesToSeconds(clip.durationFrames, timeline.frameRate);
        await openPreview(clip.label || asset.filename || "Timeline clip", [
          {
            path,
            label: clip.label || asset.filename || clip.id,
            startSeconds,
            endSeconds,
          },
        ]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not open preview");
      }
    })();
  }

  function visibleClipsFromTimeline(tl: Timeline) {
    const track = tl.tracks.find((t) => t.kind === "video");
    const clips = track?.clips ?? [];
    const inReel =
      !tl.activeReelId || !tl.reels?.length
        ? clips
        : clips.filter((c) => c.reelId === tl.activeReelId);
    return inReel.filter((c) => {
      const asset = media.find((m) => m.id === c.mediaAssetId);
      return asset ? isRoughCutVideoAsset(asset) : true;
    });
  }

  async function openRoughCutPreviewFromTimeline(tl: Timeline) {
    setError(null);
    cancelBatchRef.current = false;
    const clips = visibleClipsFromTimeline(tl);
    if (!clips.length) {
      setStatusNote("No clips in this cut to play after rebuild.");
      return;
    }
    const needPrep = clips.filter((clip) => {
      const asset = media.find((m) => m.id === clip.mediaAssetId);
      return asset ? assetNeedsBrowserProxy(asset) : false;
    });
    /** Fresh proxy paths (React media state may lag behind ensureProxyForWatch). */
    const proxyByAssetId = new Map<string, string>();

    for (let i = 0; i < needPrep.length; i++) {
      if (cancelBatchRef.current) break;
      const clip = needPrep[i]!;
      const asset = media.find((m) => m.id === clip.mediaAssetId);
      if (!asset) continue;
      setStatusNote(
        `Preparing preview ${i + 1}/${needPrep.length} for Play: ${asset.filename}`
      );
      const proxyPath = await ensureProxyForWatch(asset);
      if (proxyPath) proxyByAssetId.set(asset.id, proxyPath);
    }
    if (cancelBatchRef.current) {
      setStatusNote("Stopped preparing previews — Play again when ready.");
      return;
    }

    const items: PreviewItem[] = [];
    let skipped = 0;
    for (const clip of clips) {
      const asset = media.find((m) => m.id === clip.mediaAssetId);
      const path =
        proxyByAssetId.get(clip.mediaAssetId) ??
        (asset ? playbackPathForAsset(asset) : null);
      if (!path) {
        skipped += 1;
        continue;
      }
      const startSeconds = framesToSeconds(clip.sourceInFrame, tl.frameRate);
      const endSeconds =
        startSeconds + framesToSeconds(clip.durationFrames, tl.frameRate);
      const shot = coverageShotForMedia(clip.mediaAssetId);
      items.push({
        path,
        clipId: clip.id,
        mediaAssetId: clip.mediaAssetId,
        plannedShotId: shot?.plannedShotId,
        shotLabel: shot?.shotName || shot?.shotType || undefined,
        isPreferred: Boolean(
          shot?.preferredMediaAssetId && shot.preferredMediaAssetId === clip.mediaAssetId
        ),
        thumbnailDataUrl: asset?.thumbnailDataUrl,
        label: clip.label || asset?.filename || clip.id,
        startSeconds,
        endSeconds,
      });
    }
    if (!items.length) {
      setStatusNote(
        "No online clips to preview - reconnect media or prepare proxies, then try again."
      );
      return;
    }
    if (skipped > 0) {
      setStatusNote(
        `Preview skipped ${skipped} offline clip${skipped === 1 ? "" : "s"} - the full cut may be longer.`
      );
    } else {
      setStatusNote(null);
    }
    const reelName = tl.reels?.find((r) => r.id === tl.activeReelId)?.name || null;
    const title = reelName
      ? `${reelName} - first cut v${tl.version}`
      : `First cut v${tl.version}`;
    await openPreview(title, items, { reviewCut: true });
  }

  async function previewRoughCut() {
    if (!timeline || !visibleClips.length) return;
    try {
      clearReviewUndoStack();
      await openRoughCutPreviewFromTimeline(timeline);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not play cut");
    }
  }

  /** From Play review: rebuild assembly from preferred takes, then reopen the player. */
  async function rebuildCutAndReplayFromReview() {
    clearReviewUndoStack();
    const res = await onBuildRoughCut({ skipConfirm: true, quiet: true });
    if (!res?.timeline) throw new Error("Could not rebuild cut");
    await openRoughCutPreviewFromTimeline(res.timeline);
  }

  /** Undo the last Drop in Play review by restoring the pre-drop timeline version. */
  async function undoLastDropAndReplayFromReview() {
    const versionId = popReviewUndo();
    if (!versionId) throw new Error("Nothing to undo");
    try {
      const res = await onRestoreVersion(versionId, { quiet: true });
      if (!res?.timeline) throw new Error("Could not undo drop");
      setStatusNote(
        `Undo drop · cut restored (now v${res.summary.version} · ${res.summary.clipCount} clips)`
      );
      await openRoughCutPreviewFromTimeline(res.timeline);
    } catch (e) {
      // Put the version back so the user can retry.
      reviewUndoStackRef.current.push(versionId);
      setReviewUndoDepth(reviewUndoStackRef.current.length);
      throw e;
    }
  }

  async function persistEditNotes(next: EditNote[]) {
    const res = await aiEditorSaveEditNotes(getToken, projectId, { notes: next });
    setEditNotes(res.notes);
    setSettings(res.settings);
    setJobs((prev) => [res.job, ...prev.filter((j) => j.id !== res.job.id)]);
    return res.notes;
  }

  async function onAddEditNote() {
    const note = createEditNote({ text: editNoteDraft, source: editNoteSource });
    if (!note) {
      setError("Write a note first");
      return;
    }
    setBusy("edit_notes");
    setError(null);
    try {
      await persistEditNotes([note, ...editNotes]);
      setEditNoteDraft("");
      setStatusNote("Edit note saved - Edit by chat can use it.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save note");
    } finally {
      setBusy(null);
    }
  }

  async function onRemoveEditNote(id: string) {
    setBusy("edit_notes");
    setError(null);
    try {
      await persistEditNotes(editNotes.filter((n) => n.id !== id));
      setStatusNote("Edit note removed.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove note");
    } finally {
      setBusy(null);
    }
  }

  async function onChatPropose(messageOverride?: string) {
    const message = (messageOverride ?? chatMessage).trim();
    if (!message) return;
    if (messageOverride) setChatMessage(messageOverride);
    setBusy("chat_edit");
    setError(null);
    setChatProposal(null);
    try {
      const res = await aiEditorChatEdit(getToken, projectId, {
        message,
        apply: false,
        reelId: timeline?.activeReelId ?? null,
      });
      setChatProposal({
        proposal: res.proposal,
        descriptions: res.descriptions ?? [],
        validationOk: res.validation?.ok ?? res.proposal.action === "undo",
        validationErrors: res.validation?.errors ?? [],
      });
      const truncNote =
        res.scope?.truncated && res.scope.totalInReel
          ? ` (using first ${MAX_CHAT_CONTEXT_CLIPS} of ${res.scope.totalInReel} clips in this reel - switch acts/reels for the rest)`
          : "";
      setStatusNote(res.proposal.summary + truncNote);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not interpret edit");
    } finally {
      setBusy(null);
    }
  }

  async function onSetupFeatureReels(mode: "acts" | "reels") {
    setBusy("rough_cut");
    setError(null);
    try {
      const res = await aiEditorTimelineAction(getToken, projectId, {
        action: "setup_feature_reels",
        reelMode: mode,
        runtimeSeconds: FEATURE_DEFAULT_RUNTIME_SECONDS,
        reelCount: mode === "reels" ? 6 : undefined,
        note:
          mode === "acts"
            ? "Feature acts (~1h45)"
            : "Feature reels (~20 min each)",
      });
      setTimeline(res.timeline);
      invalidateLocalCutExport();
      setTimelineVersions(res.versions);
      setJobs((prev) => [res.job, ...prev.filter((j) => j.id !== res.job.id)]);
      setStatusNote(
        mode === "acts"
          ? "Split into Act 1-3 for a ~1h45 feature. Edit by chat focuses on the active act."
          : "Split into ~20 min reels. Edit by chat focuses on the active reel."
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not set up reels");
    } finally {
      setBusy(null);
    }
  }

  async function onSetActiveReel(reelId: string) {
    setBusy("rough_cut");
    setError(null);
    try {
      const res = await aiEditorTimelineAction(getToken, projectId, {
        action: "set_active_reel",
        reelId,
      });
      setTimeline(res.timeline);
      setStatusNote(
        `Editing focus: ${res.timeline.reels?.find((r) => r.id === reelId)?.name || "reel"}`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not switch reel");
    } finally {
      setBusy(null);
    }
  }

  async function onChatApply() {
    if (!chatProposal) return;
    setBusy("chat_edit");
    setError(null);
    try {
      const res = await aiEditorChatEdit(getToken, projectId, {
        message: chatMessage.trim() || chatProposal.proposal.summary,
        apply: true,
        reelId: timeline?.activeReelId ?? null,
        proposal: chatProposal.proposal,
      });
      if (res.timeline) {
        setTimeline(res.timeline);
        invalidateLocalCutExport();
      }
      if (res.versions) setTimelineVersions(res.versions);
      if (res.job) setJobs((prev) => [res.job!, ...prev]);
      setChatProposal(null);
      setChatMessage("");
      setStatusNote(res.proposal.summary + (res.timeline ? ` - now v${res.timeline.version}` : ""));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not apply edit");
    } finally {
      setBusy(null);
    }
  }

  async function onChatUndo() {
    setBusy("chat_edit");
    setError(null);
    try {
      const res = await aiEditorChatEdit(getToken, projectId, {
        message: "undo",
        apply: true,
      });
      if (res.timeline) {
        setTimeline(res.timeline);
        invalidateLocalCutExport();
      }
      if (res.versions) setTimelineVersions(res.versions);
      if (res.job) setJobs((prev) => [res.job!, ...prev]);
      setChatProposal(null);
      setStatusNote(res.proposal.summary + (res.timeline ? ` - now v${res.timeline.version}` : ""));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nothing to undo");
    } finally {
      setBusy(null);
    }
  }

  async function onApplyFinishing() {
    if (!timeline) {
      setError("Build a first cut first");
      return;
    }
    setBusy("finishing");
    setError(null);
    setStatusNote(null);
    try {
      const res = await aiEditorTimelineAction(getToken, projectId, {
        action: "apply_finishing",
        moodId,
        transitionStyle,
      });
      setTimeline(res.timeline);
      invalidateLocalCutExport();
      setTimelineVersions(res.versions);
      if (res.job) setJobs((prev) => [res.job, ...prev.filter((j) => j.id !== res.job.id)]);
      setStatusNote(
        `Saved: ${res.timeline.finishing?.moodLabel} look with ${res.timeline.finishing?.transitionLabel.toLowerCase()}. Soft blends go into the EDL; markers mark acts/fades. Color stays in Resolve.`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save look");
    } finally {
      setBusy(null);
    }
  }

  async function onToggleNextShootItem(itemId: string, done: boolean) {
    setBusy("next_shoot");
    setError(null);
    try {
      const res = await aiEditorNextShootChecklist(getToken, projectId, {
        itemId,
        done,
      });
      setNextShootChecklist(res.checklist);
      setSettings(res.settings);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update checklist");
    } finally {
      setBusy(null);
    }
  }

  async function onRebuildNextShootChecklist() {
    setBusy("next_shoot");
    setError(null);
    try {
      const res = await aiEditorNextShootChecklist(getToken, projectId, {
        rebuild: true,
      });
      setNextShootChecklist(res.checklist);
      setSettings(res.settings);
      setStatusNote(
        res.checklist.items.length
          ? `Next shoot checklist: ${res.checklist.items.filter((i) => !i.done).length} remaining`
          : "No next-shoot items yet - sync from Resolve after a cut."
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not rebuild checklist");
    } finally {
      setBusy(null);
    }
  }

  async function onSendChecklistToBoard() {
    setBusy("board_handoff");
    setError(null);
    try {
      const res = await aiEditorBoardHandoff(getToken, projectId);
      setSettings(res.settings);
      setJobs((prev) => [res.job, ...prev.filter((j) => j.id !== res.job.id)]);
      setStatusNote(
        `Sent ${res.openCount} open item${res.openCount === 1 ? "" : "s"} to Production ? Filming notes.`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send to production board");
    } finally {
      setBusy(null);
    }
  }

  async function onImportResolveCut() {
    const hasCut = Boolean(videoTrack?.clips?.length);
    const multiReels = (timeline?.reels?.length ?? 0) > 1;
    if (hasCut) {
      const ok = window.confirm(
        multiReels
          ? "Import replaces your current ShootSpine cut and act/reel layout with what's open in Resolve. Earlier versions stay under Versions / Restore. Continue?"
          : "Import replaces your current ShootSpine first cut with what's open in Resolve. Earlier versions stay under Versions / Restore. Continue?"
      );
      if (!ok) return;
    }
    setBusy("resolve-import-cut");
    setError(null);
    setStatusNote(null);
    try {
      // Always re-read Resolve so we don't import a stale cut
      const health = await checkAgentHealth();
      setAgent(health);
      if (!health.connected) throw new Error(AGENT_CONNECT_MSG);
      const projectRoot = settings?.projectRootPath?.trim();
      if (!projectRoot) throw new Error("Set your project folder in step 2 first");
      const token = await ensureAgentSession();
      const probe = await refreshResolveWorkflow(token);
      if (!probe?.projectOpen) {
        setStatusNote("Open Resolve with a project and timeline, then try again.");
        return;
      }
      const handoffDir =
        activeHandoffDir(projectRoot, handoffDirOnDisk) ||
        resolveHandoffAbsoluteDir(projectRoot);
      const synced = await agentResolveSyncFromNle(DEFAULT_AGENT_BASE_URL, token, {
        projectRoot,
        handoffDir,
        exportEdl: true,
      });
      if (!synced.synced || !synced.snapshot) {
        setStatusNote(synced.message || "Couldn't read Resolve yet.");
        return;
      }
      const saved = await aiEditorSaveResolveSync(getToken, projectId, {
        snapshot: synced.snapshot,
      });
      setSettings(saved.settings);
      setPlanningFeedback(saved.planning);
      if (saved.checklist) setNextShootChecklist(saved.checklist);
      // Only keep handoffDir if the folder already exists (don't fake "edit saved").
      try {
        const st = await agentStorageStat(DEFAULT_AGENT_BASE_URL, token, handoffDir);
        if (st.exists) setHandoffDirOnDisk(handoffDir);
      } catch {
        /* leave prior handoffDir state */
      }

      const res = await aiEditorTimelineAction(getToken, projectId, {
        action: "import_resolve_cut",
        resolveSnapshot: saved.sync,
        note: "Imported cut from Resolve",
      });
      setTimeline(res.timeline);
      setTimelineVersions(res.versions);
      setJobs((prev) => [res.job, ...prev.filter((j) => j.id !== res.job.id)]);
      setExportFiles(null);
      setExportStamp(null);
      setResolvePackageStale(false);
      const unmatched = res.importMeta?.unmatchedNames ?? [];
      const unmatchedNote = unmatched.length
        ? ` Unmatched: ${unmatched.slice(0, 8).join(", ")}${unmatched.length > 8 ? "-" : ""}`
        : "";
      setStatusNote(
        (res.importMeta?.summary || "Imported from Resolve") +
          (res.summary ? ` - ${res.summary.durationTimecode}` : "") +
          unmatchedNote
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not import Resolve cut");
    } finally {
      setBusy(null);
    }
  }

  async function onSyncFromResolve() {
    setBusy("resolve-sync");
    setError(null);
    setStatusNote(null);
    setResolveSyncCompare(null);
    try {
      const health = await checkAgentHealth();
      setAgent(health);
      if (!health.connected) throw new Error(AGENT_CONNECT_MSG);
      const projectRoot = settings?.projectRootPath?.trim();
      if (!projectRoot) throw new Error("Set your project folder in step 2 first");
      const token = await ensureAgentSession();

      const probe = await refreshResolveWorkflow(token);
      if (!probe?.projectOpen) {
        setStatusNote("Open Resolve with a project and timeline, then try again.");
        return;
      }

      const handoffDir =
        activeHandoffDir(projectRoot, handoffDirOnDisk) ||
        resolveHandoffAbsoluteDir(projectRoot);

      const result = await agentResolveSyncFromNle(DEFAULT_AGENT_BASE_URL, token, {
        projectRoot,
        handoffDir,
        exportEdl: true,
      });
      if (!result.synced || !result.snapshot) {
        setStatusNote(result.message || "Couldn't read Resolve yet.");
        return;
      }

      const saved = await aiEditorSaveResolveSync(getToken, projectId, {
        snapshot: result.snapshot,
      });
      setSettings(saved.settings);
      setPlanningFeedback(saved.planning);
      if (saved.checklist) setNextShootChecklist(saved.checklist);
      setJobs((prev) => [saved.job, ...prev.filter((j) => j.id !== saved.job.id)]);

      const compare = compareResolveToRoughCut({
        sync: saved.sync,
        roughCutDurationFrames: timeline ? timelineDurationFrames(timeline) : undefined,
        roughCutClipCount: videoTrack?.clips.length,
        roughCutFrameRate: timeline?.frameRate,
      });
      setResolveSyncCompare(compare);
      try {
        const st = await agentStorageStat(DEFAULT_AGENT_BASE_URL, token, handoffDir);
        if (st.exists) setHandoffDirOnDisk(handoffDir);
      } catch {
        /* leave prior handoffDir state */
      }
      const tip = saved.planning.insights[0]?.text;
      setStatusNote(
        tip ? `${compare.title} ${tip}` : `${compare.title} ${compare.detail}`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not sync from Resolve");
    } finally {
      setBusy(null);
    }
  }

  async function onSaveFeedback() {
    setBusy("feedback");
    setError(null);
    setStatusNote(null);
    try {
      const res = await aiEditorSaveFeedback(getToken, projectId, {
        moodId,
        transitionStyle,
        outcome: feedbackOutcome,
        note: feedbackNote,
      });
      setSettings(res.settings);
      setJobs((prev) => [res.job, ...prev.filter((j) => j.id !== res.job.id)]);
      const defaults = defaultsFromFeedback(res.feedback);
      setFeedbackHint(defaults.hint);
      setStatusNote("Saved for next time - Look & transitions will remember this.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save feedback");
    } finally {
      setBusy(null);
    }
  }

  async function ensureExportFiles(force = false): Promise<{
    files: Record<string, string>;
    projectRootPath?: string | null;
  }> {
    const stamp = timeline
      ? `${timeline.version}:${timeline.updatedAt || ""}:${timeline.finishing?.moodId || ""}:${timeline.finishing?.transitionStyle || ""}`
      : "";
    if (
      !force &&
      exportFiles &&
      exportStamp === stamp &&
      Object.keys(exportFiles).length
    ) {
      return { files: exportFiles, projectRootPath: settings?.projectRootPath };
    }
    const res = await aiEditorExportResolve(getToken, projectId);
    setExportFiles(res.files);
    setExportStamp(stamp);
    setJobs((prev) => [res.job, ...prev.filter((j) => j.id !== res.job.id)]);
    return { files: res.files, projectRootPath: res.projectRootPath };
  }

  async function onWriteResolveHandoff() {
    if (!requireEditDisk()) return;
    setBusy("write-handoff");
    setError(null);
    setStatusNote(null);
    try {
      const health = await checkAgentHealth();
      setAgent(health);
      if (!health.connected) throw new Error(AGENT_CONNECT_MSG);
      const projectRoot = liveProjectRoot?.trim();
      if (!projectRoot) throw new Error("Set a project folder in step 2 first");
      const token = await ensureAgentSession();
      const { files } = await ensureExportFiles(true);
      const written = await agentWriteResolveHandoff(DEFAULT_AGENT_BASE_URL, token, {
        projectRoot,
        files,
        relativeDir: RESOLVE_HANDOFF_REL_DIR,
      });
      setHandoffDirOnDisk(written.handoffDir);
      setResolvePackageStale(false);
      const log = await aiEditorLogResolveOpen(getToken, projectId, {
        message: `Wrote Resolve handoff ? ${written.handoffDir}`,
        launched: false,
        handoffDir: written.handoffDir,
      });
      setJobs((prev) => [log.job, ...prev.filter((j) => j.id !== log.job.id)]);
      setStatusNote(
        finishWhere === "mac"
          ? "Saved. Copy your project folder to the Mac, then open Resolve there."
          : written.edlAligned
            ? `Saved with camera timecode on ${written.edlAligned} clip(s). Ready for Resolve.`
            : "Saved with your project. Open Resolve when you're ready."
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Write handoff failed");
    } finally {
      setBusy(null);
    }
  }

  /** Rewrite handoff if needed, then open Explorer/Finder on shootspine_rough_cut.edl. */
  async function onShowHandoffFolder() {
    setBusy("reveal-handoff");
    setError(null);
    setStatusNote(null);
    try {
      const health = await checkAgentHealth();
      setAgent(health);
      if (!health.connected) throw new Error(AGENT_CONNECT_MSG);
      const projectRoot = liveProjectRoot?.trim();
      if (!projectRoot) throw new Error("Set your project folder in step 2 first");
      if (!timeline) throw new Error("Build a first cut before saving for Resolve");
      if (!requireEditDisk()) return;

      const token = await ensureAgentSession();
      const { files } = await ensureExportFiles(true);
      if (!files?.[RESOLVE_HANDOFF_FILES.edl]) {
        throw new Error("Could not build the timeline file — rebuild the first cut, then try again.");
      }
      const written = await agentWriteResolveHandoff(DEFAULT_AGENT_BASE_URL, token, {
        projectRoot,
        files,
        relativeDir: RESOLVE_HANDOFF_REL_DIR,
      });
      setHandoffDirOnDisk(written.handoffDir);
      setResolvePackageStale(false);

      await agentRevealPath(DEFAULT_AGENT_BASE_URL, token, written.handoffDir);
      const sep = written.handoffDir.includes("\\") ? "\\" : "/";
      setStatusNote(
        `Opened the Resolve folder${
          written.edlAligned ? ` (camera timecode applied to ${written.edlAligned} clip${written.edlAligned === 1 ? "" : "s"})` : ""
        }. Import: ${written.handoffDir}${sep}${RESOLVE_HANDOFF_FILES.edl}`
      );
      document.getElementById("ai-step-10")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open the folder");
      document.getElementById("ai-step-10")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    } finally {
      setBusy(null);
    }
  }

  async function refreshResolveWorkflow(token?: string) {
    try {
      const t = token || (await ensureAgentSession());
      const probe = await agentResolveScriptingProbe(DEFAULT_AGENT_BASE_URL, t);
      setResolveWorkflow(summarizeResolveWorkflow(probe));
      return probe;
    } catch (e) {
      setResolveWorkflow(
        summarizeResolveProbeFailure(e instanceof Error ? e.message : undefined)
      );
      return null;
    }
  }

  function isPlaceholderProjectName(name?: string | null) {
    const n = (name || "").trim();
    return !n || /^untitled(\s+footage)?(\s+edit)?$/i.test(n);
  }

  async function syncProjectFolderToName(projectName: string): Promise<string> {
    const folderPlan = planManagedProjectFolderRename({
      currentProjectRoot: settings?.projectRootPath || storagePath,
      newProjectName: projectName,
    });

    if (folderPlan.action === "none") return "";
    if (folderPlan.action === "name_only") {
      return " Footage stays in your current folder (custom path) — rename doesn’t move it.";
    }

    // folderPlan.action === "rename"
    const health = await checkAgentHealth();
    setAgent(health);
    if (!health.connected) {
      return " Connect this computer to rename the project folder on disk.";
    }
    if (
      !isAgentVersionAtLeast(
        health.version,
        MIN_PROJECT_FOLDER_RENAME_AGENT_VERSION
      )
    ) {
      return ` Folder not moved — Desktop Agent ${
        health.version || "?"
      } is too old (need ${MIN_PROJECT_FOLDER_RENAME_AGENT_VERSION}+). Restart the agent in Step 1, then Save name again.`;
    }

    try {
      const token = await ensureAgentSession();
      let diskRenamed = false;
      try {
        const st = await agentStorageStat(
          DEFAULT_AGENT_BASE_URL,
          token,
          folderPlan.from
        );
        if (st.exists) {
          await agentRenameDir(
            DEFAULT_AGENT_BASE_URL,
            token,
            folderPlan.from,
            folderPlan.to
          );
          diskRenamed = true;
        }
      } catch (diskErr) {
        const msg = diskErr instanceof Error ? diskErr.message : "";
        // Source already moved, or destination already there — remount paths below.
        if (
          !(
            msg.includes("not found") ||
            msg.includes("Source folder") ||
            msg.includes("Destination already exists")
          )
        ) {
          throw diskErr;
        }
      }

      if (!diskRenamed) {
        const destStat = await agentStorageStat(
          DEFAULT_AGENT_BASE_URL,
          token,
          folderPlan.to
        ).catch(() => ({ exists: false }));
        if (destStat.exists) diskRenamed = true;
      }

      const drives = await refreshKnownDrives();
      const storageType = inferStorageTypeForPath(folderPlan.to, drives);
      const editDrive = driveForPath(folderPlan.to, drives);
      const saved = await aiEditorSaveStorage(getToken, projectId, {
        name: projectName,
        path: folderPlan.to,
        purpose: "active",
        type: storageType === "unknown" ? "externalSSD" : storageType,
        setAsActive: true,
        volumeIdentifier: volumeIdForPath(folderPlan.to, drives),
        capacityBytes: editDrive?.capacityBytes,
        availableBytes: editDrive?.availableBytes,
      });
      setSettings(saved.settings);
      setStoragePath(folderPlan.to);
      setIndexFolderPath(folderPlan.to);

      if (media.length) {
        const patches = planMediaRemount(media, folderPlan.from, folderPlan.to, {
          volumeIdentifier: volumeIdForPath(folderPlan.to, drives) || undefined,
          mode: "edit",
        });
        for (let i = 0; i < patches.length; i += 200) {
          await aiEditorPatchMedia(getToken, projectId, patches.slice(i, i + 200));
        }
        if (patches.length) {
          setMedia((prev) => {
            const byId = new Map(patches.map((p) => [p.id, p]));
            return prev.map((m) => {
              const p = byId.get(m.id);
              return p ? { ...m, ...p } : m;
            });
          });
        }
      }

      setHandoffDirOnDisk(resolveHandoffAbsoluteDir(folderPlan.to));

      return diskRenamed
        ? ` Folder on disk is now ${folderPlan.to}.`
        : ` Project folder path set to ${folderPlan.to} (will be used on next copy).`;
    } catch (folderErr) {
      return ` Name saved, but the folder wasn’t moved: ${
        folderErr instanceof Error ? folderErr.message : "disk error"
      }.`;
    }
  }

  async function onSaveProjectName() {
    const next = projectNameDraft.trim();
    if (!next) {
      setError("Enter a project name (e.g. Monopoly Night).");
      return;
    }
    if (isPlaceholderProjectName(next)) {
      setError("Pick a real name — not “Untitled”.");
      return;
    }
    const nameUnchanged = next === (context?.projectName || "").trim();
    const folderNeedsSync =
      planManagedProjectFolderRename({
        currentProjectRoot: settings?.projectRootPath || storagePath,
        newProjectName: next,
      }).action === "rename";

    if (nameUnchanged && !folderNeedsSync) {
      setEditingProjectName(false);
      return;
    }
    setRenamingProject(true);
    setError(null);
    try {
      let projectName = next;
      if (!nameUnchanged) {
        const res = await aiEditorRenameSession(getToken, projectId, next);
        projectName = res.projectName;
        setContext((prev) =>
          prev ? { ...prev, projectName: res.projectName } : prev
        );
      }
      setEditingProjectName(false);

      const folderNote = await syncProjectFolderToName(projectName);

      setStatusNote(`Project named “${projectName}”.${folderNote}`);
      writeResumeBookmark({
        projectId,
        projectName,
        stepN: workflowNext?.n ?? 1,
        stepTitle: workflowNext?.title ?? "Continue editing",
        stepDetail:
          workflowNext?.detail ?? "Open this project anytime to keep refining.",
        anchor: workflowNext?.anchor ?? "ai-step-2",
        updatedAt: Date.now(),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not rename project");
    } finally {
      setRenamingProject(false);
    }
  }

  // Settings/media can still say Untitled_footage_edit after the folder was
  // renamed on disk (or the project was renamed). Heal once when agent is up.
  useEffect(() => {
    if (loading || renamingProject || busy || !agent.connected) return;
    const name = context?.projectName?.trim();
    if (!name || isPlaceholderProjectName(name)) return;
    const current = settings?.projectRootPath || storagePath;
    const plan = planManagedProjectFolderRename({
      currentProjectRoot: current,
      newProjectName: name,
    });
    if (plan.action !== "rename") return;
    const key = `${projectId}:${plan.from}->${plan.to}`;
    if (folderHealKeyRef.current === key) return;
    folderHealKeyRef.current = key;
    void (async () => {
      try {
        const note = await syncProjectFolderToName(name);
        if (note.includes("Folder on disk") || note.includes("path set to")) {
          setStatusNote(`Project folder updated.${note}`);
        } else if (note.includes("too old") || note.includes("wasn’t moved")) {
          folderHealKeyRef.current = null;
        }
      } catch {
        folderHealKeyRef.current = null;
      }
    })();
  }, [
    loading,
    renamingProject,
    busy,
    agent.connected,
    context?.projectName,
    settings?.projectRootPath,
    storagePath,
    projectId,
  ]);

  async function onOpenInResolve() {
    if (!requireEditDisk()) return;
    setBusy("open-resolve");
    setError(null);
    setStatusNote(null);
    setProgress({ pct: 10, label: "Starting DaVinci Resolve…" });
    try {
      let health = await checkAgentHealth();
      setAgent(health);
      if (!health.connected) throw new Error(AGENT_CONNECT_MSG);

      // Old agents often reported success without actually launching Resolve.
      if (!isAgentVersionAtLeast(health.version, MIN_RESOLVE_LAUNCH_AGENT_VERSION)) {
        setProgress({
          pct: 20,
          label: `Updating Desktop Agent (need ${MIN_RESOLVE_LAUNCH_AGENT_VERSION}+)…`,
        });
        setStatusNote(
          `Desktop Agent ${health.version || "?"} is too old to open Resolve reliably. Restarting…`
        );
        setAgentToken(null);
        setAgentExpiresAt(null);
        await aiEditorLaunchAgent(getToken, { restart: true });
        await new Promise((r) => setTimeout(r, 2500));
        health = await checkAgentHealth();
        setAgent(health);
        if (!health.connected) {
          throw new Error(
            "Desktop Agent didn’t come back after restart. Use Restart in Step 1, then try Open Resolve again."
          );
        }
        if (!isAgentVersionAtLeast(health.version, MIN_RESOLVE_LAUNCH_AGENT_VERSION)) {
          throw new Error(
            `Still on Desktop Agent ${health.version || "?"}. Need ${MIN_RESOLVE_LAUNCH_AGENT_VERSION}+. Use Restart in Step 1.`
          );
        }
      }

      const projectRoot = liveProjectRoot?.trim() || settings?.projectRootPath?.trim();
      if (!projectRoot) throw new Error("Set your project folder in step 2 first");
      // Always re-register after agent process changes so Open Resolve isn’t 401.
      setAgentToken(null);
      setAgentExpiresAt(null);
      const token = await ensureAgentSession();
      if (!token?.trim()) {
        throw new Error("Could not create an agent session — click Restart in Step 1.");
      }

      setProgress({ pct: 40, label: "Starting DaVinci Resolve…" });
      // Launch first — that's what “Open Resolve app” means.
      const opened = await agentOpenResolve(DEFAULT_AGENT_BASE_URL, token, {
        projectRoot,
        launch: true,
        reveal: false,
      });
      if (!opened.launched) {
        setError(
          opened.message ||
            opened.detect?.note ||
            "Couldn’t start Resolve. Open DaVinci Resolve from the Start menu, then come back here."
        );
        setStatusNote(
          "If Resolve won’t start from ShootSpine, open it once from the Start menu (Windows sometimes blocks background launches)."
        );
      } else {
        setStatusNote(
          opened.message ||
            (opened.alreadyRunning
              ? "Resolve is already open — check the taskbar / Alt+Tab if you don’t see it."
              : "Resolve is starting (splash can take ~30–60s). Check the taskbar.")
        );
      }

      // Then save the edit package so Bring edit into Resolve is ready.
      setProgress({ pct: 55, label: "Saving edit package for Resolve…" });
      let handoffDir: string | undefined;
      let handoffWriteError: string | null = null;
      try {
        const { files } = await ensureExportFiles();
        const written = await agentWriteResolveHandoff(DEFAULT_AGENT_BASE_URL, token, {
          projectRoot,
          files,
          relativeDir: RESOLVE_HANDOFF_REL_DIR,
        });
        handoffDir = written.handoffDir;
        setHandoffDirOnDisk(written.handoffDir);
        setResolvePackageStale(false);
      } catch (e) {
        handoffWriteError =
          e instanceof Error ? e.message : "Could not save the Resolve timeline file";
      }

      const log = await aiEditorLogResolveOpen(getToken, projectId, {
        message: opened.message,
        launched: opened.launched,
        handoffDir,
      });
      setJobs((prev) => [log.job, ...prev.filter((j) => j.id !== log.job.id)]);
      if (handoffWriteError) {
        // Don't make a successful launch look like Resolve failed to open.
        setStatusNote(
          `${opened.message || "Resolve is ready."} Timeline file not saved yet: ${handoffWriteError}. Use “Show me the folder” or “Bring edit into Resolve”.`
        );
      }
      await refreshResolveWorkflow(token);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open Resolve");
    } finally {
      setBusy(null);
      setProgress(null);
    }
  }

  async function onBringIntoResolve() {
    if (!requireEditDisk()) return;
    setBusy("import-resolve");
    setError(null);
    setStatusNote(null);
    setProgress({ pct: 10, label: "Saving edit package for Resolve…" });
    try {
      const health = await checkAgentHealth();
      setAgent(health);
      if (!health.connected) throw new Error(AGENT_CONNECT_MSG);
      const projectRoot = settings?.projectRootPath?.trim();
      if (!projectRoot) throw new Error("Set your project folder in step 2 first");
      const token = await ensureAgentSession();
      const { files } = await ensureExportFiles();
      setProgress({ pct: 35, label: "Writing timeline files…" });
      const written = await agentWriteResolveHandoff(DEFAULT_AGENT_BASE_URL, token, {
        projectRoot,
        files,
        relativeDir: RESOLVE_HANDOFF_REL_DIR,
      });
      setHandoffDirOnDisk(written.handoffDir);
      setResolvePackageStale(false);

      setProgress({ pct: 55, label: "Checking Resolve…" });
      let probe = await refreshResolveWorkflow(token);
      if (!probe?.running) {
        await agentOpenResolve(DEFAULT_AGENT_BASE_URL, token, {
          projectRoot,
          handoffDir: written.handoffDir,
          launch: true,
          reveal: false,
        });
        setStatusNote("Starting Resolve — open your project, then we’ll try again.");
        await new Promise((r) => setTimeout(r, 2500));
        probe = await refreshResolveWorkflow(token);
      }

      if (!probe?.projectOpen) {
        const note = String(probe?.note || "");
        const scriptingBlocked =
          Boolean(probe?.running) &&
          (!probe?.scriptingReachable ||
            note.includes("NO_RESOLVE") ||
            note.includes("IMPORT_FAIL"));
        if (scriptingBlocked) {
          setError(
            "Resolve is open, but ShootSpine can’t auto-import (needs Studio + “External scripting using” = Local). Free Resolve often doesn’t show that setting — import by hand: Show saved folder → in Resolve File → Import → Timeline → pick shootspine_rough_cut.edl."
          );
          setStatusNote(
            "Edit package is saved. Studio users: Preferences → System → General → External scripting using → Local, restart Resolve, try Bring edit again."
          );
        } else {
          setError(
            "Resolve doesn’t have a project open yet. Create/open your project in Resolve (you should see the Edit page), then press Bring edit into Resolve again."
          );
          setStatusNote("Edit package is saved — you can also import it by hand from the saved folder.");
        }
        try {
          await agentOpenResolve(DEFAULT_AGENT_BASE_URL, token, {
            projectRoot,
            handoffDir: written.handoffDir,
            launch: false,
            reveal: true,
          });
        } catch {
          /* reveal is best-effort */
        }
        document.getElementById("ai-step-10")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
        return;
      }

      setProgress({ pct: 75, label: "Importing timeline into Resolve…" });
      const imported = await agentResolveImportEdl(DEFAULT_AGENT_BASE_URL, token, {
        projectRoot,
        handoffDir: written.handoffDir,
        timelineName: timeline?.name || "ShootSpine Rough Cut",
        linkMedia: true,
      });
      const msg = importResultMessage(imported);
      setResolveImported(imported.imported);
      const log = await aiEditorLogResolveOpen(getToken, projectId, {
        type: "resolve_import",
        message: imported.message,
        launched: false,
        handoffDir: written.handoffDir,
      });
      setJobs((prev) => [log.job, ...prev.filter((j) => j.id !== log.job.id)]);
      setStatusNote(`${msg.title} ${msg.detail}`);
      if (!imported.imported) {
        setError(`${msg.title} — ${msg.detail}`);
        try {
          await agentOpenResolve(DEFAULT_AGENT_BASE_URL, token, {
            projectRoot,
            handoffDir: written.handoffDir,
            launch: false,
            reveal: true,
          });
        } catch {
          /* optional */
        }
      }
      await refreshResolveWorkflow(token);
      document.getElementById("ai-step-10")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not bring edit into Resolve");
    } finally {
      setBusy(null);
      setProgress(null);
    }
  }

  async function onSaveArchiveRoot() {
    const path = archivePath.trim();
    if (!path) {
      setError("Choose an archive folder first");
      return;
    }
    setBusy("archive-root");
    setError(null);
    try {
      const drives = await refreshKnownDrives();
      const storageType = inferStorageTypeForPath(path, drives);
      const archiveDrive = driveForPath(path, drives);
      const res = await aiEditorSaveStorage(getToken, projectId, {
        name: "Archive storage",
        path,
        purpose: "archive",
        type: storageType === "unknown" ? "externalHDD" : storageType,
        setAsActive: false,
        volumeIdentifier: volumeIdForPath(path, drives),
        capacityBytes: archiveDrive?.capacityBytes,
        availableBytes: archiveDrive?.availableBytes,
      });
      setSettings(res.settings);
      setStorage((prev) => {
        const rest = prev.filter((s) => s.id !== res.storage.id);
        return [res.storage, ...rest];
      });
      setArchivePath(res.settings.archiveRootPath || path);
      setStatusNote("Backup folder remembered.");
      detectRemount(drives, res.settings, [res.storage, ...storage]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save backup folder");
    } finally {
      setBusy(null);
    }
  }

  async function onArchiveMedia() {
    if (!requireEditDisk() || !requireArchiveDisk()) return;
    setBusy("archive");
    setError(null);
    setStatusNote(null);
    setProgress({ pct: 5, label: "Planning archive..." });
    try {
      const health = await checkAgentHealth();
      setAgent(health);
      if (!health.connected) throw new Error(AGENT_CONNECT_MSG);
      const token = await ensureAgentSession();
      const plan = await aiEditorArchiveAction(getToken, projectId, {
        action: "plan",
        archiveRootPath: archivePath.trim() || undefined,
      });
      if (!plan.archive?.items.length) {
        setStatusNote(
          plan.archive?.skipped.length
            ? "Nothing new to back up - these clips may already be backed up."
            : "Pick a backup folder and add clips first."
        );
        return;
      }
      setProgress({ pct: 20, label: `Copying ${plan.archive.items.length} file(s)-` });
      const batch = await agentCopyVerifiedBatch(
        DEFAULT_AGENT_BASE_URL,
        token,
        plan.archive.items.map((i) => ({
          id: i.mediaAssetId,
          sourcePath: i.sourcePath,
          destPath: i.destPath,
        }))
      );
      const okResults = batch.results.filter((r) => r.ok);
      const failedCount = batch.failedCount ?? batch.results.filter((r) => !r.ok).length;
      const byId = new Map(okResults.map((r) => [r.id, r]));
      const patches = plan.archive.items
        .map((item) => {
          const r = byId.get(item.mediaAssetId);
          if (!r || !r.ok) return null;
          const prev = media.find((m) => m.id === item.mediaAssetId);
          const prevCount = prev?.verifiedCopyCount ?? (prev?.ingestStatus === "verified" ? 1 : 0);
          return {
            id: item.mediaAssetId,
            archivePath: r.destPath,
            checksum: r.checksum,
            checksumAlgorithm: "sha256" as const,
            verifiedCopyCount: Math.max(prevCount, 1) + (prev?.archivePath ? 0 : 1),
            sizeBytes: r.sizeBytes,
          };
        })
        .filter(Boolean) as Array<{ id: string } & Partial<MediaAsset>>;
      if (patches.length) {
        await aiEditorPatchMedia(getToken, projectId, patches);
      }
      const log = await aiEditorArchiveAction(getToken, projectId, {
        action: "log",
        type: "archive",
        count: patches.length,
        mediaIds: patches.map((p) => p.id),
        message: `Archived ${patches.length} clip(s) with checksum verify` +
          (failedCount ? ` (${failedCount} failed)` : ""),
      });
      if (log.job) setJobs((prev) => [log.job!, ...prev]);
      if (!patches.length) {
        setError(
          failedCount
            ? `Backup didn't finish for any clips (${failedCount} failed). Check disk space and paths.`
            : "Backup didn't finish for any clips."
        );
      } else {
        setStatusNote(
          `Backed up ${patches.length} clip${patches.length === 1 ? "" : "s"}. Camera cards were not touched.` +
            (failedCount ? ` ${failedCount} couldn't be copied - try again for those.` : "")
        );
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Backup failed");
    } finally {
      setProgress(null);
      setBusy(null);
    }
  }

  async function onRestoreMedia() {
    if (!requireEditDisk() || !requireArchiveDisk()) return;
    setBusy("restore");
    setError(null);
    setStatusNote(null);
    setProgress({ pct: 5, label: "Planning restore..." });
    try {
      const health = await checkAgentHealth();
      setAgent(health);
      if (!health.connected) throw new Error(AGENT_CONNECT_MSG);
      const token = await ensureAgentSession();
      const plan = await aiEditorArchiveAction(getToken, projectId, { action: "plan" });
      if (!plan.restore?.items.length) {
        setStatusNote("Nothing to bring back - the files may already be on this PC.");
        return;
      }
      setProgress({ pct: 20, label: `Restoring ${plan.restore.items.length} file(s)-` });
      const batch = await agentCopyVerifiedBatch(
        DEFAULT_AGENT_BASE_URL,
        token,
        plan.restore.items.map((i) => ({
          id: i.mediaAssetId,
          sourcePath: i.sourcePath,
          destPath: i.destPath,
        }))
      );
      const okResults = batch.results.filter((r) => r.ok);
      const failedCount = batch.failedCount ?? batch.results.filter((r) => !r.ok).length;
      const byId = new Map(okResults.map((r) => [r.id, r]));
      const patches = plan.restore.items
        .map((item) => {
          const r = byId.get(item.mediaAssetId);
          if (!r || !r.ok) return null;
          return {
            id: item.mediaAssetId,
            currentPath: r.destPath,
            relativeProjectPath: item.relativeArchivePath,
            checksum: r.checksum,
            checksumAlgorithm: "sha256" as const,
            ingestStatus: "verified" as const,
            onlineStatus: "online" as const,
            sizeBytes: r.sizeBytes,
          };
        })
        .filter(Boolean) as Array<{ id: string } & Partial<MediaAsset>>;
      if (patches.length) {
        await aiEditorPatchMedia(getToken, projectId, patches);
      }
      const log = await aiEditorArchiveAction(getToken, projectId, {
        action: "log",
        type: "restore",
        count: patches.length,
        mediaIds: patches.map((p) => p.id),
        message:
          `Restored ${patches.length} clip(s) from archive` +
          (failedCount ? ` (${failedCount} failed)` : ""),
      });
      if (log.job) setJobs((prev) => [log.job!, ...prev]);
      if (!patches.length) {
        setError(
          failedCount
            ? `Restore didn't finish for any clips (${failedCount} failed).`
            : "Restore didn't finish for any clips."
        );
      } else {
        setStatusNote(
          `Brought back ${patches.length} clip${patches.length === 1 ? "" : "s"} to this PC.` +
            (failedCount ? ` ${failedCount} couldn't be restored - try again for those.` : "")
        );
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Restore failed");
    } finally {
      setProgress(null);
      setBusy(null);
    }
  }

  async function onReclaimActive() {
    if (reclaimConfirm.trim() !== SAFE_DELETE_CONFIRM_PHRASE) {
      setError(`Type ${SAFE_DELETE_CONFIRM_PHRASE} to reclaim active copies`);
      return;
    }
    if (!requireEditDisk()) return;
    const projectRoot = settings?.projectRootPath?.trim();
    if (!projectRoot) {
      setError("Set your project folder in step 2 first");
      return;
    }
    const eligible = media.filter((m) => canReclaimActiveCopy(m, projectRoot).ok);
    if (!eligible.length) {
      setStatusNote("Nothing to free yet - back up clips first.");
      return;
    }
    setBusy("reclaim");
    setError(null);
    setStatusNote(null);
    setProgress({ pct: 10, label: `Freeing space for ${eligible.length} clip(s)-` });
    try {
      const health = await checkAgentHealth();
      setAgent(health);
      if (!health.connected) throw new Error(AGENT_CONNECT_MSG);
      const token = await ensureAgentSession();
      const neverDeletePaths = eligible
        .map((m) => m.archivePath?.trim())
        .filter(Boolean) as string[];
      const deleted = await agentSafeDelete(DEFAULT_AGENT_BASE_URL, token, {
        projectRoot,
        confirmPhrase: SAFE_DELETE_CONFIRM_PHRASE,
        neverDeletePaths,
        files: eligible.map((m) => ({
          id: m.id,
          path: m.currentPath!.trim(),
          expectedChecksum: m.checksum,
        })),
      });
      const okIds = new Set(
        deleted.results.filter((r) => r.ok).map((r) => r.id).filter(Boolean) as string[]
      );
      const failedCount =
        deleted.failedCount ?? deleted.results.filter((r) => !r.ok).length;
      const patches = eligible
        .filter((m) => okIds.has(m.id))
        .map((m) => ({
          id: m.id,
          currentPath: "",
          onlineStatus: "offline" as const,
          verifiedCopyCount: Math.max(1, (m.verifiedCopyCount ?? 2) - 1),
        }));
      if (patches.length) {
        await aiEditorPatchMedia(getToken, projectId, patches);
      }
      const log = await aiEditorArchiveAction(getToken, projectId, {
        action: "log",
        type: "reclaim",
        count: patches.length,
        mediaIds: patches.map((p) => p.id),
        message:
          `Reclaimed ${patches.length} active copy(ies); archive kept` +
          (failedCount ? ` (${failedCount} failed)` : ""),
      });
      if (log.job) setJobs((prev) => [log.job!, ...prev]);
      setReclaimConfirm("");
      if (!patches.length) {
        setError(
          failedCount
            ? `Couldn't free space for any clips (${failedCount} failed). Active copies left as-is.`
            : "Couldn't free space for any clips."
        );
      } else {
        setStatusNote(
          `Freed space for ${patches.length} clip${patches.length === 1 ? "" : "s"}. Backup copies kept. Camera cards never erased.` +
            (failedCount
              ? ` ${failedCount} still on this PC - check those files and try again.`
              : "")
        );
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not free space");
    } finally {
      setProgress(null);
      setBusy(null);
    }
  }

  async function onPrepareClips() {
    if (!needsPrepare.length) {
      setStatusNote("All clips are already ready for editing.");
      return;
    }
    if (!requireEditDisk()) return;
    setBusy("proxy");
    setError(null);
    setStatusNote(null);
    try {
      const health = await checkAgentHealth();
      setAgent(health);
      if (!health.connected) throw new Error("Connect this computer first");
      if (health.ffmpegAvailable === false) {
        throw new Error("Video tools are missing. Restart after FFmpeg is installed.");
      }
      const token = await ensureAgentSession();
      const patches: Array<{ id: string; proxyPath: string; needsProxy: boolean }> = [];
      let failed = 0;
      const list = needsPrepare.slice(0, 40);
      const capped = needsPrepare.length > list.length;
      cancelBatchRef.current = false;
      if (capped) {
        setStatusNote(
          `Preparing the first ${list.length} of ${needsPrepare.length} clips this pass-`
        );
      }
      for (let i = 0; i < list.length; i++) {
        if (cancelBatchRef.current) break;
        const m = list[i];
        setProgress({
          pct: Math.round(((i + 1) / list.length) * 100),
          label: `Preparing preview ${i + 1}/${list.length}: ${m.filename}`,
        });
        const sourcePath = sourcePathForProxy(m);
        if (!sourcePath) {
          failed += 1;
          continue;
        }
        try {
          const res = await agentCreateProxy(DEFAULT_AGENT_BASE_URL, token, sourcePath, {
            profile: "ai_720p",
          });
          patches.push({ id: m.id, proxyPath: res.proxyPath, needsProxy: true });
        } catch {
          failed += 1;
        }
      }
      if (patches.length) {
        await aiEditorPatchMedia(getToken, projectId, patches);
        setMedia((prev) =>
          prev.map((m) => {
            const p = patches.find((x) => x.id === m.id);
            return p ? { ...m, proxyPath: p.proxyPath } : m;
          })
        );
      }
      setStatusNote(
        `Prepared ${patches.length} clip(s) for smooth editing` +
          (failed ? ` (${failed} couldn't convert)` : "") +
          ". Your original camera files were not changed." +
          (capped
            ? ` First ${list.length} of ${needsPrepare.length} this pass - run again for the rest.`
            : "") +
          (cancelBatchRef.current ? " Stopped early - saved what finished." : "")
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not prepare clips");
    } finally {
      setBusy(null);
      setProgress(null);
    }
  }

  if (!isAiEditorEnabled()) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <p className="text-sm text-zinc-600">AI Editor is disabled for this environment.</p>
        <Link href={`/projects/${projectId}`} className="mt-4 inline-block text-sky-800 underline">
          Back to project
        </Link>
      </div>
    );
  }

  if (loading) return <LoadingSpinner className="py-16" />;

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-6 md:max-w-4xl">
      <PageHeader
        title="AI Editor"
        subtitle={
          context?.aiEditorOnly
            ? "Bring in footage and get a strong first edit"
            : "From your ShootSpine plan to a first cut"
        }
        action={
          <Link href="/ai-editor">
            <Button variant="outline" size="sm">
              All edits
            </Button>
          </Link>
        }
      />

      <Card>
        <CardBody className="space-y-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">Project name</p>
            <p className="mt-0.5 text-xs text-slate-500">
              Used in ShootSpine, Resolve, and — when your footage is in a ShootSpine project
              folder — the folder name on disk (same drive).
            </p>
          </div>
          {editingProjectName || isPlaceholderProjectName(context?.projectName) ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-base font-medium text-slate-900 shadow-sm"
                value={projectNameDraft}
                disabled={renamingProject || !!busy}
                autoFocus
                maxLength={120}
                placeholder="e.g. Monopoly Night"
                onChange={(e) => setProjectNameDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void onSaveProjectName();
                  }
                }}
              />
              <Button
                type="button"
                disabled={renamingProject || !!busy || !projectNameDraft.trim()}
                onClick={() => void onSaveProjectName()}
              >
                {renamingProject ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : null}
                Save name
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <p className="min-w-0 flex-1 truncate text-lg font-semibold text-slate-900">
                {context?.projectName}
              </p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={!!busy || renamingProject}
                onClick={() => {
                  setProjectNameDraft(context?.projectName?.trim() || "");
                  setEditingProjectName(true);
                }}
              >
                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                Rename
              </Button>
            </div>
          )}
          {isPlaceholderProjectName(context?.projectName) ? (
            <p className="text-xs font-medium text-amber-800">
              Name this edit before you continue — e.g. Monopoly Night.
            </p>
          ) : null}
        </CardBody>
      </Card>

      {context && !context.aiEditorOnly ? (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm text-slate-600">
          <Clapperboard className="h-4 w-4 text-sky-600" />
          <span>
            Linked plan: {context.scenes.length} scenes - {context.shotCount} shots
            {context.scriptTitle ? ` - ${context.scriptTitle}` : ""}
          </span>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}
      {statusNote ? (
        <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">
          {statusNote}
        </div>
      ) : null}

      {drivePresence.needsAttention ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            drivePresence.items.some((i) => i.status === "offline")
              ? "border-red-200 bg-red-50/80 text-slate-800"
              : "border-amber-200 bg-amber-50/70 text-slate-800"
          }`}
        >
          <p className="font-medium text-slate-900">
            {drivePresence.items.some((i) => i.status === "offline")
              ? "Drive offline"
              : "Drive letter changed"}
          </p>
          <ul className="mt-1.5 list-disc space-y-1 pl-5 text-slate-700">
            {drivePresence.items
              .filter((i) => i.status === "offline" || i.status === "remount")
              .map((i) => (
                <li key={i.kind}>{i.message}</li>
              ))}
          </ul>
          <p className="mt-2 text-xs text-slate-600">
            {!diskGates.editDiskReady
              ? "Copy, prepare, analyze, and Resolve write are paused until the edit drive is ready."
              : null}
            {!diskGates.archiveDiskReady
              ? `${!diskGates.editDiskReady ? " " : ""}Backup / restore / free-space are paused until the backup drive is ready.`
              : null}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void refreshDrivePresence()}
              disabled={!!busy || !agent.connected}
            >
              {busy === "drives" ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-1.5 h-4 w-4" />
              )}
              Recheck drives
            </Button>
            {remountCandidates.length > 0 ? (
              <Button
                size="sm"
                onClick={() => void onRelinkVolumes()}
                disabled={!!busy || !agent.connected}
              >
                Relink paths
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {workflowNext ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-sky-200 bg-sky-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-800">
              Continue - Step {workflowNext.n}
            </p>
            <p className="font-medium text-slate-900">{workflowNext.title}</p>
            <p className="text-xs text-slate-600">{workflowNext.detail}</p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              document
                .getElementById(workflowNext.anchor)
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          >
            Go to step
          </Button>
        </div>
      ) : null}

      {projectTips[0] ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 px-4 py-3 text-sm text-slate-800">
          <p className="font-medium text-amber-950">{projectTips[0].title}</p>
          <p className="mt-0.5 text-xs text-slate-600">{projectTips[0].detail}</p>
        </div>
      ) : null}

      {preview ? (
        <MediaPreview
          key={preview.sessionKey}
          title={preview.title}
          items={preview.items}
          resolveUrl={(item) =>
            agentMediaStreamUrl(DEFAULT_AGENT_BASE_URL, preview.token, item.path, {
              startSeconds: item.startSeconds,
              endSeconds: item.endSeconds,
            })
          }
          onClose={() => setPreview(null)}
          onRemoveClip={
            preview.reviewCut
              ? async (clipId) => {
                  const item = preview.items.find((i) => i.clipId === clipId);
                  const res = await onRippleDeleteClip(clipId, {
                    quiet: true,
                    label: item?.label,
                  });
                  if (!res) return;
                  const prior = res.versions.find(
                    (v) => v.version === res.timeline.version - 1
                  );
                  if (prior) pushReviewUndo(prior.id);
                  setPreview((prev) =>
                    prev
                      ? {
                          ...prev,
                          title: activeReelName
                            ? `${activeReelName} - first cut v${res.summary.version}`
                            : `First cut v${res.summary.version}`,
                          items: prev.items.filter((i) => i.clipId !== clipId),
                        }
                      : null
                  );
                }
              : undefined
          }
          onUndoDrop={
            preview.reviewCut
              ? async () => {
                  await undoLastDropAndReplayFromReview();
                }
              : undefined
          }
          canUndoDrop={preview.reviewCut ? reviewUndoDepth > 0 : false}
          onReorderClips={
            preview.reviewCut
              ? async (orderedClipIds) => {
                  const res = await onReorderCutClips(orderedClipIds, {
                    quiet: true,
                  });
                  if (!res) return;
                  const prior = res.versions.find(
                    (v) => v.version === res.timeline.version - 1
                  );
                  if (prior) pushReviewUndo(prior.id);
                  setPreview((prev) =>
                    prev
                      ? {
                          ...prev,
                          title: activeReelName
                            ? `${activeReelName} - first cut v${res.summary.version}`
                            : `First cut v${res.summary.version}`,
                        }
                      : null
                  );
                }
              : undefined
          }
          onTrimClip={
            preview.reviewCut
              ? async ({ clipId, startSeconds, endSeconds }) => {
                  const res = await onTrimCutClip(
                    clipId,
                    startSeconds,
                    endSeconds,
                    { quiet: true }
                  );
                  if (!res) return;
                  const prior = res.versions.find(
                    (v) => v.version === res.timeline.version - 1
                  );
                  if (prior) pushReviewUndo(prior.id);
                  setPreview((prev) =>
                    prev
                      ? {
                          ...prev,
                          title: activeReelName
                            ? `${activeReelName} - first cut v${res.summary.version}`
                            : `First cut v${res.summary.version}`,
                          items: prev.items.map((i) =>
                            i.clipId === clipId
                              ? { ...i, startSeconds, endSeconds }
                              : i
                          ),
                        }
                      : null
                  );
                }
              : undefined
          }
          onSplitClip={
            preview.reviewCut
              ? async ({ clipId, atSourceSeconds }) => {
                  const split = await onSplitCutClip(clipId, atSourceSeconds, {
                    quiet: true,
                  });
                  if (!split) {
                    throw new Error("Could not split clip");
                  }
                  const prior = split.res.versions.find(
                    (v) => v.version === split.res.timeline.version - 1
                  );
                  if (prior) pushReviewUndo(prior.id);
                  const base = preview.items.find((i) => i.clipId === clipId);
                  const fps = split.frameRate;
                  const leftStart = framesToSeconds(split.left.sourceInFrame, fps);
                  const leftEnd =
                    leftStart + framesToSeconds(split.left.durationFrames, fps);
                  const rightStart = framesToSeconds(split.right.sourceInFrame, fps);
                  const rightEnd =
                    rightStart + framesToSeconds(split.right.durationFrames, fps);
                  const leftItem: PreviewItem = {
                    path: base?.path || "",
                    clipId: split.left.id,
                    mediaAssetId: split.left.mediaAssetId,
                    plannedShotId: base?.plannedShotId,
                    shotLabel: base?.shotLabel,
                    isPreferred: base?.isPreferred,
                    thumbnailDataUrl: base?.thumbnailDataUrl,
                    label: split.left.label || base?.label || split.left.id,
                    startSeconds: leftStart,
                    endSeconds: leftEnd,
                  };
                  const rightItem: PreviewItem = {
                    path: base?.path || "",
                    clipId: split.right.id,
                    mediaAssetId: split.right.mediaAssetId,
                    plannedShotId: base?.plannedShotId,
                    shotLabel: base?.shotLabel,
                    isPreferred: false,
                    thumbnailDataUrl: base?.thumbnailDataUrl,
                    label: split.right.label || base?.label || split.right.id,
                    startSeconds: rightStart,
                    endSeconds: rightEnd,
                  };
                  if (!leftItem.path) {
                    throw new Error("Split saved, but preview path is missing — Play again.");
                  }
                  setPreview((prev) =>
                    prev
                      ? {
                          ...prev,
                          title: activeReelName
                            ? `${activeReelName} - first cut v${split.res.summary.version}`
                            : `First cut v${split.res.summary.version}`,
                          items: prev.items.flatMap((i) =>
                            i.clipId === clipId ? [leftItem, rightItem] : [i]
                          ),
                        }
                      : null
                  );
                  return { left: leftItem, right: rightItem };
                }
              : undefined
          }
          onJoinClip={
            preview.reviewCut
              ? async ({ leftClipId, rightClipId }) => {
                  const join = await onJoinCutClips(leftClipId, rightClipId, {
                    quiet: true,
                  });
                  if (!join) throw new Error("Could not join clips");
                  const prior = join.res.versions.find(
                    (v) => v.version === join.res.timeline.version - 1
                  );
                  if (prior) pushReviewUndo(prior.id);
                  const base = preview.items.find((i) => i.clipId === leftClipId);
                  const fps = join.frameRate;
                  const startSeconds = framesToSeconds(join.joined.sourceInFrame, fps);
                  const endSeconds =
                    startSeconds +
                    framesToSeconds(join.joined.durationFrames, fps);
                  const joinedItem: PreviewItem = {
                    path: base?.path || "",
                    clipId: join.joined.id,
                    mediaAssetId: join.joined.mediaAssetId,
                    plannedShotId: base?.plannedShotId,
                    shotLabel: base?.shotLabel,
                    isPreferred: base?.isPreferred,
                    thumbnailDataUrl: base?.thumbnailDataUrl,
                    label: join.joined.label || base?.label || join.joined.id,
                    startSeconds,
                    endSeconds,
                  };
                  if (!joinedItem.path) {
                    throw new Error("Join saved, but preview path is missing — Play again.");
                  }
                  setPreview((prev) =>
                    prev
                      ? {
                          ...prev,
                          title: activeReelName
                            ? `${activeReelName} - first cut v${join.res.summary.version}`
                            : `First cut v${join.res.summary.version}`,
                          items: prev.items
                            .filter((i) => i.clipId !== rightClipId)
                            .map((i) => (i.clipId === leftClipId ? joinedItem : i)),
                        }
                      : null
                  );
                  return joinedItem;
                }
              : undefined
          }
          onSlipClip={
            preview.reviewCut
              ? async ({ clipId, deltaSeconds, mediaDurationSeconds }) => {
                  const slip = await onSlipCutClip(clipId, deltaSeconds, {
                    quiet: true,
                    mediaDurationSeconds,
                  });
                  if (!slip) throw new Error("Could not slip clip");
                  const prior = slip.res.versions.find(
                    (v) => v.version === slip.res.timeline.version - 1
                  );
                  if (prior) pushReviewUndo(prior.id);
                  setPreview((prev) =>
                    prev
                      ? {
                          ...prev,
                          title: activeReelName
                            ? `${activeReelName} - first cut v${slip.res.summary.version}`
                            : `First cut v${slip.res.summary.version}`,
                          items: prev.items.map((i) =>
                            i.clipId === clipId
                              ? {
                                  ...i,
                                  startSeconds: slip.startSeconds,
                                  endSeconds: slip.endSeconds,
                                }
                              : i
                          ),
                        }
                      : null
                  );
                  return {
                    startSeconds: slip.startSeconds,
                    endSeconds: slip.endSeconds,
                  };
                }
              : undefined
          }
          onRollClip={
            preview.reviewCut
              ? async ({
                  leftClipId,
                  rightClipId,
                  deltaSeconds,
                  leftMediaDurationSeconds,
                }) => {
                  const roll = await onRollCutClips(
                    leftClipId,
                    rightClipId,
                    deltaSeconds,
                    { quiet: true, leftMediaDurationSeconds }
                  );
                  if (!roll) throw new Error("Could not roll edit");
                  const prior = roll.res.versions.find(
                    (v) => v.version === roll.res.timeline.version - 1
                  );
                  if (prior) pushReviewUndo(prior.id);
                  const leftBase = preview.items.find((i) => i.clipId === leftClipId);
                  const rightBase = preview.items.find(
                    (i) => i.clipId === rightClipId
                  );
                  const fps = roll.frameRate;
                  const leftStart = framesToSeconds(roll.left.sourceInFrame, fps);
                  const leftEnd =
                    leftStart + framesToSeconds(roll.left.durationFrames, fps);
                  const rightStart = framesToSeconds(roll.right.sourceInFrame, fps);
                  const rightEnd =
                    rightStart + framesToSeconds(roll.right.durationFrames, fps);
                  const leftItem: PreviewItem = {
                    path: leftBase?.path || "",
                    clipId: roll.left.id,
                    mediaAssetId: roll.left.mediaAssetId,
                    plannedShotId: leftBase?.plannedShotId,
                    shotLabel: leftBase?.shotLabel,
                    isPreferred: leftBase?.isPreferred,
                    thumbnailDataUrl: leftBase?.thumbnailDataUrl,
                    label: roll.left.label || leftBase?.label || roll.left.id,
                    startSeconds: leftStart,
                    endSeconds: leftEnd,
                  };
                  const rightItem: PreviewItem = {
                    path: rightBase?.path || "",
                    clipId: roll.right.id,
                    mediaAssetId: roll.right.mediaAssetId,
                    plannedShotId: rightBase?.plannedShotId,
                    shotLabel: rightBase?.shotLabel,
                    isPreferred: rightBase?.isPreferred,
                    thumbnailDataUrl: rightBase?.thumbnailDataUrl,
                    label: roll.right.label || rightBase?.label || roll.right.id,
                    startSeconds: rightStart,
                    endSeconds: rightEnd,
                  };
                  if (!leftItem.path || !rightItem.path) {
                    throw new Error("Roll saved, but preview path is missing — Play again.");
                  }
                  setPreview((prev) =>
                    prev
                      ? {
                          ...prev,
                          title: activeReelName
                            ? `${activeReelName} - first cut v${roll.res.summary.version}`
                            : `First cut v${roll.res.summary.version}`,
                          items: prev.items.map((i) => {
                            if (i.clipId === leftClipId) return leftItem;
                            if (i.clipId === rightClipId) return rightItem;
                            return i;
                          }),
                        }
                      : null
                  );
                  return { left: leftItem, right: rightItem };
                }
              : undefined
          }
          onDuplicateClip={
            preview.reviewCut
              ? async ({ clipId }) => {
                  const dup = await onDuplicateCutClip(clipId, { quiet: true });
                  if (!dup) throw new Error("Could not duplicate clip");
                  const prior = dup.res.versions.find(
                    (v) => v.version === dup.res.timeline.version - 1
                  );
                  if (prior) pushReviewUndo(prior.id);
                  const base = preview.items.find((i) => i.clipId === clipId);
                  const fps = dup.frameRate;
                  const startSeconds = framesToSeconds(dup.copy.sourceInFrame, fps);
                  const endSeconds =
                    startSeconds + framesToSeconds(dup.copy.durationFrames, fps);
                  const copyItem: PreviewItem = {
                    path: base?.path || "",
                    clipId: dup.copy.id,
                    mediaAssetId: dup.copy.mediaAssetId,
                    plannedShotId: base?.plannedShotId ?? dup.copy.plannedShotId,
                    shotLabel: base?.shotLabel,
                    isPreferred: base?.isPreferred,
                    thumbnailDataUrl: base?.thumbnailDataUrl,
                    label: dup.copy.label || base?.label || dup.copy.id,
                    startSeconds,
                    endSeconds,
                  };
                  if (!copyItem.path) {
                    throw new Error(
                      "Duplicate saved, but preview path is missing — Play again."
                    );
                  }
                  setPreview((prev) => {
                    if (!prev) return null;
                    const i = prev.items.findIndex((x) => x.clipId === clipId);
                    const items =
                      i < 0
                        ? [...prev.items, copyItem]
                        : [
                            ...prev.items.slice(0, i + 1),
                            copyItem,
                            ...prev.items.slice(i + 1),
                          ];
                    return {
                      ...prev,
                      title: activeReelName
                        ? `${activeReelName} - first cut v${dup.res.summary.version}`
                        : `First cut v${dup.res.summary.version}`,
                      items,
                    };
                  });
                  return copyItem;
                }
              : undefined
          }
          onPreferClip={
            preview.reviewCut
              ? async (item) => {
                  if (!item.plannedShotId || !item.mediaAssetId) {
                    throw new Error("This clip isn’t matched to a planned shot yet.");
                  }
                  const res = await onPreferTake(item.plannedShotId, item.mediaAssetId, {
                    quiet: true,
                    label: item.label,
                    shotLabel: item.shotLabel,
                  });
                  if (!res) return;
                  setPreview((prev) =>
                    prev
                      ? {
                          ...prev,
                          items: prev.items.map((i) =>
                            i.plannedShotId !== item.plannedShotId
                              ? i
                              : {
                                  ...i,
                                  isPreferred: i.mediaAssetId === item.mediaAssetId,
                                }
                          ),
                        }
                      : null
                  );
                }
              : undefined
          }
          onRebuildCut={
            preview.reviewCut
              ? async () => {
                  await rebuildCutAndReplayFromReview();
                }
              : undefined
          }
        />
      ) : null}

      {progress ? (
        <div className="sticky top-2 z-40 rounded-2xl border border-sky-200 bg-white/95 px-4 py-3 shadow-md shadow-slate-200/50 backdrop-blur-sm">
          <div className="mb-1 flex items-center justify-between gap-3 text-xs text-slate-600">
            <span className="min-w-0 truncate font-medium text-slate-800">
              {progress.label}
            </span>
            <span className="flex shrink-0 items-center gap-2">
              <span>{progress.pct}%</span>
              {busy === "analyze" || busy === "proxy" || busy === "index" ? (
                batchStopping ? (
                  <span className="font-medium text-amber-800">Stopping…</span>
                ) : (
                  <button
                    type="button"
                    className="font-medium text-sky-800 underline"
                    onClick={() => requestStopBatch()}
                  >
                    Stop
                  </button>
                )
              ) : null}
              {!busy ? (
                <button
                  type="button"
                  className="font-medium text-slate-600 underline"
                  onClick={() => {
                    setProgress(null);
                    setBatchStopping(false);
                  }}
                >
                  Dismiss
                </button>
              ) : null}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-sky-500 transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, progress.pct))}%` }}
            />
          </div>
        </div>
      ) : null}

      {!progress && postIngestSafety ? (
        <PostIngestSafetyCallout
          view={postIngestSafety}
          onDismiss={() => setPostIngestSafety(null)}
        />
      ) : null}

      {media.length > 0 ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            safety.level === "green"
              ? "border-emerald-200 bg-emerald-50 text-emerald-950"
              : safety.level === "red"
                ? "border-red-200 bg-red-50 text-red-900"
                : "border-amber-200 bg-amber-50 text-amber-950"
          }`}
        >
          <div className="font-semibold">Media safety: {safety.label}</div>
          <p className="mt-1 text-xs opacity-90">{safety.detail}</p>
        </div>
      ) : null}

      {/* Step 1 */}
      <Card id="ai-step-1">
        <CardBody className="space-y-4">
          <div className="flex items-start gap-3">
            <StepBadge n={stepNo.connect} done={step1Done} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-slate-900">Connect this computer</h2>
                <Badge
                  variant={
                    !agent.connected
                      ? "warning"
                      : agentVersionStatus && !agentVersionStatus.ok
                        ? "warning"
                        : "success"
                  }
                >
                  {!agent.connected ? (
                    <span className="inline-flex items-center gap-1">
                      <WifiOff className="h-3 w-3" /> Not connected
                    </span>
                  ) : agentVersionStatus && !agentVersionStatus.ok ? (
                    <span className="inline-flex items-center gap-1">
                      <Wifi className="h-3 w-3" /> Update needed
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      <Wifi className="h-3 w-3" /> Ready
                    </span>
                  )}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-slate-600">
                ShootSpine needs a small helper on this PC to read folders and camera files. Your
                footage stays on your drives.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pl-10">
            <Button
              size="sm"
              onClick={() => void onStartAgent(false)}
              disabled={!!busy || agent.connected}
            >
              {busy === "agent" ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Play className="mr-1.5 h-3.5 w-3.5" />
              )}
              Connect
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => void onStartAgent(true)}
              disabled={!!busy}
            >
              {busy === "restart" ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              )}
              Restart
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void onRecheckAgent()}
              disabled={!!busy}
            >
              {busy === "recheck" ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : null}
              Check again
            </Button>
          </div>
          {agent.connected && agentVersionStatus && !agentVersionStatus.ok ? (
            <div className="ml-10 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-950">
              <p className="font-medium">Desktop Agent needs an update</p>
              <p className="mt-1 text-xs leading-relaxed opacity-90">
                {agentVersionStatus.message}
              </p>
              <p className="mt-2 text-xs text-amber-900/80">
                Need {MIN_DESKTOP_AGENT_VERSION}+. Use Restart above after stopping any old helper
                window.
              </p>
            </div>
          ) : agent.connected && agentVersionStatus?.ok ? (
            <p className="ml-10 text-xs text-slate-500">
              Desktop Agent {agentVersionStatus.version} — drive labels and offline checks ready.
            </p>
          ) : null}
        </CardBody>
      </Card>

      {/* Steps 2–3: Guided footage (advanced folder UI collapsed) */}
      <Card id="ai-step-2">
        <CardBody className="space-y-5">
          <div className="flex items-start gap-3">
            <StepBadge n={stepNo.footage} done={step2Done && step3Done} />
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Get footage in</h2>
              <p className="mt-1 text-sm text-slate-600">
                Plug in the camera card and your SSD. ShootSpine chooses where files go — nothing
                uploads to the cloud.
              </p>
            </div>
          </div>

          <div className="pl-10 space-y-4">
            <GuidedFootagePanel
              agentConnected={agent.connected}
              scanning={detectScanning}
              busy={!!busy}
              busyCopying={busy === "index"}
              projectName={context?.projectName?.trim() || "Untitled footage edit"}
              cameraPlan={guidedCameraPlan}
              workspacePlan={guidedWorkspacePlan}
              destinationDrives={ingestDestinationDrives}
              selectedDriveRoot={guidedDriveRoot || guidedWorkspacePlan?.driveRoot || null}
              onSelectDriveRoot={(root) => {
                setGuidedDriveRoot(root.endsWith("\\") ? root : `${root}\\`);
                const managed = buildGuidedWorkspaceFromDrive(
                  root,
                  context?.projectName?.trim() || "Untitled footage edit"
                );
                setStoragePath(managed);
                const drive = driveForPath(root, knownDrives);
                setIngestDestFreeBytes(
                  typeof drive?.availableBytes === "number" ? drive.availableBytes : null
                );
              }}
              sources={detectedSources}
              selectedSourceId={selectedSourceId}
              onSelectSource={setSelectedSourceId}
              pendingFiles={pendingCopyFiles}
              selectedPaths={selectedCopyPaths}
              onTogglePath={(path) => {
                setSelectedCopyPaths((prev) => {
                  const next = new Set(prev);
                  if (next.has(path)) next.delete(path);
                  else next.add(path);
                  return next;
                });
              }}
              onSelectAllPending={() => {
                if (pendingCopyFiles) {
                  setSelectedCopyPaths(new Set(pendingCopyFiles.map((f) => f.path)));
                }
              }}
              onSelectNonePending={() => setSelectedCopyPaths(new Set())}
              mediaCount={media.length}
              progressLabel={busy === "index" ? progress?.label : null}
              onRescan={() => {
                void refreshKnownDrives();
                void scanDetectedSources({ quiet: false });
              }}
              onPrepareAndReview={() => void onGuidedReviewClips()}
              onCopyFootage={() => void onGuidedCopyFootage()}
              onUseRecommendedDrive={() => {
                const projectName = context?.projectName?.trim() || "Untitled footage edit";
                const plan = planGuidedWorkspace({
                  projectName,
                  destinationDrives: ingestDestinationDrives,
                  knownDrives,
                  currentProjectRoot: null,
                });
                if (!plan) {
                  setError("No SSD found — plug in your T7 and Rescan.");
                  return;
                }
                setGuidedDriveRoot(plan.driveRoot);
                setStoragePath(plan.projectRoot);
                setStatusNote(`Will use ${plan.driveLabel}. Press Copy footage when ready.`);
              }}
            />

            <div id="ai-step-3" />

            <details
              className="rounded-2xl border border-slate-200 bg-slate-50/40 px-4 py-3"
              open={showAdvancedFootage}
              onToggle={(e) => setShowAdvancedFootage((e.target as HTMLDetailsElement).open)}
            >
              <summary className="cursor-pointer text-sm font-medium text-slate-700">
                Advanced — folders, backup drive, manual copy
              </summary>
              <div className="mt-4 space-y-4 border-t border-slate-200 pt-4">
            <div className="rounded-2xl border border-sky-100 bg-sky-50/50 px-4 py-3 text-sm text-slate-700">
              <p className="font-medium text-slate-900">Recommended setup</p>
              <ul className="mt-1.5 list-disc space-y-1 pl-5">
                <li>
                  <span className="font-medium">Edit folder</span> on your external SSD (fast
                  copy/proxy/preview)
                </li>
                <li>
                  <span className="font-medium">Backup folder</span> on your external HDD (safe copy
                  you can reclaim from later)
                </li>
              </ul>
              {knownDrives.some((d) => d.kind === "drive") ? (
                <p className="mt-2 text-xs text-slate-600">
                  Connected drives:{" "}
                  {knownDrives
                    .filter((d) => d.kind === "drive" && !/^[cC]:\\?$/.test(d.path))
                    .slice(0, 4)
                    .map((d) => friendlyDriveLabel(d))
                    .join(" - ") || "plug in your SSD/HDD, then reopen the picker"}
                </p>
              ) : null}
            </div>

            <FolderPicker
              label="Edit folder (project)"
              hint="Best on an external SSD. Camera/audio copies and proxies will live here."
              purpose="edit"
              value={storagePath}
              onChange={setStoragePath}
              onDrivesLoaded={setKnownDrives}
              getAgentToken={ensureAgentSession}
              agentConnected={agent.connected}
              disabled={!!busy}
              placeholder="e.g. E:\\Shoots\\My_Project"
            />
            {storagePath.trim() ? (
              <p className="text-xs text-slate-500">
                Detected: {storageTypeLabel(inferStorageTypeForPath(storagePath, knownDrives))}
              </p>
            ) : null}

            <FolderPicker
              label="Backup folder (optional)"
              hint="Best on an external HDD. Run the actual backup in Backup & free space below."
              purpose="archive"
              value={archivePath}
              onChange={setArchivePath}
              onDrivesLoaded={setKnownDrives}
              getAgentToken={ensureAgentSession}
              agentConnected={agent.connected}
              disabled={!!busy}
              placeholder="e.g. F:\\ShootSpine_Backup"
            />
            {archivePath.trim() ? (
              <p className="text-xs text-slate-500">
                Detected: {storageTypeLabel(inferStorageTypeForPath(archivePath, knownDrives))}
              </p>
            ) : null}

            {storageHealth ? (
              <div
                className={`rounded-2xl border px-4 py-3 text-sm ${
                  storageHealth.level === "good"
                    ? "border-emerald-200 bg-emerald-50/60 text-slate-800"
                    : storageHealth.level === "risk"
                      ? "border-red-200 bg-red-50/70 text-slate-800"
                      : storageHealth.level === "warn"
                        ? "border-amber-200 bg-amber-50/70 text-slate-800"
                        : "border-slate-200 bg-slate-50/80 text-slate-800"
                }`}
              >
                <p className="font-medium text-slate-900">Workspace health</p>
                <p className="mt-0.5 text-xs text-slate-600">{storageHealth.headline}</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-700">
                  {storageHealth.items.map((item) => (
                    <li key={item.id}>{item.text}</li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-slate-500">
                  Guidance only - AI Editor still works if you keep footage on This PC.
                </p>
              </div>
            ) : null}

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-3 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={createProjectFolders}
                onChange={(e) => setCreateProjectFolders(e.target.checked)}
                disabled={!!busy}
              />
              <span>
                <span className="font-medium text-slate-800">Create organized folders</span>
                <span className="mt-0.5 block text-slate-500">
                  Camera media, audio, exports, and cache - so you don't have to build the structure
                  by hand.
                </span>
              </span>
            </label>

            <Button
              onClick={() => void onSaveWorkspace()}
              disabled={!!busy || !storagePath.trim() || !agent.connected}
            >
              {busy === "storage" || busy === "folders" || busy === "archive-root" ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <HardDrive className="mr-1.5 h-4 w-4" />
              )}
              Save workspace
            </Button>

            {settings?.projectRootPath ? (
              <p className="text-xs text-emerald-800">
                Edit folder: <span className="font-medium">{settings.projectRootPath}</span>
                {settings.archiveRootPath ? (
                  <>
                    <br />
                    Backup: <span className="font-medium">{settings.archiveRootPath}</span>
                  </>
                ) : null}
              </p>
            ) : null}

            {remountCandidates.length > 0 ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-sm text-slate-800">
                <p className="font-medium text-amber-950">Drive letter changed</p>
                <ul className="mt-1.5 list-disc space-y-1 pl-5 text-slate-700">
                  {remountCandidates.map((c) => (
                    <li key={`${c.kind}-${c.volumeIdentifier}`}>
                      {c.kind === "edit" ? "Edit" : "Backup"} folder was{" "}
                      <span className="font-medium">{c.oldPath}</span>, now on{" "}
                      <span className="font-medium">{c.driveLabel}</span> ?{" "}
                      <span className="font-medium">{c.newPath}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-3"
                  variant="secondary"
                  onClick={() => void onRelinkVolumes()}
                  disabled={!!busy || !agent.connected}
                >
                  {busy === "remount" ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-1.5 h-4 w-4" />
                  )}
                  Relink paths
                </Button>
              </div>
            ) : null}

            <p className="text-sm font-medium text-slate-800">Manual add / multi-camera</p>
            <ManagedIngestReview
              projectName={context?.projectName || "This edit"}
              clientOrProject={context?.projectName || "Project"}
              shootLabel={ingestShootLabel || "Shoot"}
              sources={detectedSources}
              selectedSourceId={selectedSourceId}
              onSelectSource={setSelectedSourceId}
              cameraAssignment={cameraLabel}
              onCameraAssignmentChange={setCameraLabel}
              shootLabelEdit={ingestShootLabel}
              onShootLabelChange={setIngestShootLabel}
              destinationRoot={
                (() => {
                  const root = (settings?.projectRootPath || storagePath).trim();
                  if (!root) return null;
                  const m = root.match(/^([A-Za-z]:)([\\/]|$)/);
                  return m ? `${m[1].toUpperCase()}\\` : root;
                })()
              }
              destinationDrives={ingestDestinationDrives}
              onDestinationRootChange={(rootPath) => {
                setGuidedDriveRoot(rootPath.endsWith("\\") ? rootPath : `${rootPath}\\`);
                const managed = buildGuidedWorkspaceFromDrive(
                  rootPath,
                  context?.projectName?.trim() || "Untitled footage edit"
                );
                setStoragePath(managed);
                const drive = driveForPath(rootPath, knownDrives);
                setIngestDestFreeBytes(
                  typeof drive?.availableBytes === "number"
                    ? drive.availableBytes
                    : null
                );
                setStatusNote(
                  `Edit folder set to ${managed}. Save workspace below (or use Copy footage in Guided).`
                );
              }}
              freeBytes={ingestDestFreeBytes}
              options={ingestOptions}
              onOptionsChange={setIngestOptions}
              archiveRootPath={settings?.archiveRootPath || archivePath || null}
              scanning={detectScanning}
              onRescan={() => void scanDetectedSources({ quiet: false })}
              onUseSourceFolder={() => {
                const src =
                  detectedSources.find((s) => s.id === selectedSourceId) ||
                  detectedSources[0];
                if (!src) return;
                setAddMode("copy");
                setIndexFolderPath(src.mediaRoot);
                setPendingCopyFiles(null);
                setSelectedCopyPaths(new Set());
                if (src.suggestedCameraAssignment) {
                  setCameraLabel(src.suggestedCameraAssignment);
                }
                setPrepareWhileCopying(ingestOptions.generateProxies);
                setStatusNote(
                  `Source folder set. Next: Review files to copy, then Copy & verify.`
                );
              }}
              onIngestIntoProject={() => void onManagedIngestIntoProject()}
              ingesting={busy === "index"}
              disabled={!!busy || !agent.connected}
            />

            {settings?.lastManagedIngest ||
            jobs.some((j) => j.type === "ingest_copy") ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-700">
                <p className="font-medium text-slate-900">Recent ingest</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Last managed offload on this project (full IngestSession history later).
                </p>
                {settings?.lastManagedIngest ? (
                  <p className="mt-2 text-sm text-slate-800">
                    <span className="font-medium">
                      {settings.lastManagedIngest.cameraLabel.replace(/_/g, " ")}
                    </span>
                    {" · "}
                    {settings.lastManagedIngest.copiedOk} verified
                    {settings.lastManagedIngest.failed
                      ? `, ${settings.lastManagedIngest.failed} failed`
                      : ""}
                    {settings.lastManagedIngest.stopped ? " · stopped" : ""}
                    {typeof settings.lastManagedIngest.proxiesOk === "number"
                      ? ` · proxies ${settings.lastManagedIngest.proxiesOk}`
                      : ""}
                    {typeof settings.lastManagedIngest.analyzedOk === "number"
                      ? ` · analyzed ${settings.lastManagedIngest.analyzedOk}`
                      : ""}
                    {settings.lastManagedIngest.backupStatus &&
                    settings.lastManagedIngest.backupStatus !== "not_requested"
                      ? ` · backup ${settings.lastManagedIngest.backupStatus.replace(
                          /_/g,
                          " "
                        )}`
                      : ""}
                    <span className="text-slate-500">
                      {" · "}
                      {new Date(settings.lastManagedIngest.at).toLocaleString()}
                    </span>
                  </p>
                ) : null}
                {jobs.filter((j) => j.type === "ingest_copy").length > 0 ? (
                  <ul className="mt-2 space-y-1 text-xs text-slate-600">
                    {jobs
                      .filter((j) => j.type === "ingest_copy")
                      .slice(0, 5)
                      .map((j) => (
                        <li key={j.id} className="flex flex-wrap items-center gap-2">
                          <Badge variant="default">{j.status}</Badge>
                          <span className="min-w-0 truncate">
                            {j.message || "Managed ingest"}
                          </span>
                        </li>
                      ))}
                  </ul>
                ) : null}
              </div>
            ) : null}

            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                disabled={!!busy}
                onClick={() => setAddMode("in_place")}
                className={`rounded-2xl border px-4 py-3 text-left transition ${
                  addMode === "in_place"
                    ? "border-sky-400 bg-sky-50 shadow-sm"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="font-medium text-slate-900">Use files where they are</div>
                <div className="mt-1 text-xs text-slate-500">
                  Fast catalog only - good when footage is already on your edit drive.
                </div>
              </button>
              <button
                type="button"
                disabled={!!busy}
                onClick={() => setAddMode("copy")}
                className={`rounded-2xl border px-4 py-3 text-left transition ${
                  addMode === "copy"
                    ? "border-sky-400 bg-sky-50 shadow-sm"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="font-medium text-slate-900">Copy into project folders</div>
                <div className="mt-1 text-xs text-slate-500">
                  Safe verified copy into Camera A/B, then optional prep for editing.
                </div>
              </button>
            </div>

            <FolderPicker
              label={addMode === "copy" ? "Source footage folder" : "Footage folder"}
              hint={
                addMode === "copy"
                  ? "Camera card, reader path, or SSD folder to copy from."
                  : "Folder that already has your clips."
              }
              value={indexFolderPath}
              onChange={setIndexFolderPath}
              getAgentToken={ensureAgentSession}
              agentConnected={agent.connected}
              disabled={!!busy}
              placeholder="Folder with video files"
            />

            {addMode === "copy" ? (
              <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                <CameraLabelPicker
                  idPrefix="copy-camera"
                  value={cameraLabel}
                  onChange={setCameraLabel}
                  disabled={!!busy}
                />
                <label className="flex cursor-pointer items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={prepareWhileCopying}
                    disabled={!!busy}
                    onChange={(e) => setPrepareWhileCopying(e.target.checked)}
                  />
                  <span>
                    <span className="font-medium text-slate-800">
                      Prepare previews after copy
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-500">
                      Copy & verify finishes first, then lighter proxies from project files.
                      Originals stay intact.
                    </span>
                  </span>
                </label>
                {diskNote ? <p className="text-xs text-slate-600">{diskNote}</p> : null}
              </div>
            ) : null}

            {addMode === "copy" && pendingCopyFiles?.length ? (
              <div className="space-y-3 rounded-2xl border border-sky-200 bg-sky-50/50 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      Choose clips to copy ({selectedCopyPaths.size} of{" "}
                      {pendingCopyFiles.length})
                    </p>
                    <p className="mt-0.5 text-xs text-slate-600">
                      Uncheck bad takes / scenes you don’t need. Selected:{" "}
                      {formatBytes(
                        pendingCopyFiles
                          .filter((f) => selectedCopyPaths.has(f.path))
                          .reduce((s, f) => s + (f.sizeBytes || 0), 0)
                      )}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <button
                      type="button"
                      className="font-medium text-sky-800 underline disabled:opacity-50"
                      disabled={!!busy}
                      onClick={() =>
                        setSelectedCopyPaths(new Set(pendingCopyFiles.map((f) => f.path)))
                      }
                    >
                      Select all
                    </button>
                    <button
                      type="button"
                      className="font-medium text-sky-800 underline disabled:opacity-50"
                      disabled={!!busy}
                      onClick={() => setSelectedCopyPaths(new Set())}
                    >
                      Select none
                    </button>
                  </div>
                </div>
                <ul className="max-h-64 space-y-1 overflow-y-auto rounded-xl border border-white bg-white/90 p-2">
                  {pendingCopyFiles.map((f) => {
                    const checked = selectedCopyPaths.has(f.path);
                    return (
                      <li key={f.path}>
                        <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50">
                          <input
                            type="checkbox"
                            className="shrink-0"
                            checked={checked}
                            disabled={!!busy}
                            onChange={() => {
                              setSelectedCopyPaths((prev) => {
                                const next = new Set(prev);
                                if (next.has(f.path)) next.delete(f.path);
                                else next.add(f.path);
                                return next;
                              });
                            }}
                          />
                          <span className="min-w-0 flex-1 truncate font-medium text-slate-800">
                            {f.filename}
                          </span>
                          <span className="shrink-0 text-xs text-slate-500">
                            {formatBytes(f.sizeBytes || 0)}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
                {busy === "index" && progress ? (
                  <p className="text-xs font-medium text-sky-900">{progress.label}</p>
                ) : null}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => void onIndexFolder()}
                disabled={
                  !!busy ||
                  !agent.connected ||
                  !indexFolderPath.trim() ||
                  (addMode === "copy" && !settings?.projectRootPath) ||
                  (addMode === "copy" && !diskGates.editDiskReady)
                }
              >
                {busy === "index" && !pendingCopyFiles ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <FolderOpen className="mr-1.5 h-4 w-4" />
                )}
                {addMode === "copy"
                  ? pendingCopyFiles?.length
                    ? "Rescan folder"
                    : "Review files to copy"
                  : "Find clips in this folder"}
              </Button>
              {addMode === "copy" && pendingCopyFiles?.length ? (
                <Button
                  onClick={() => void onCopySelectedFiles()}
                  disabled={
                    !!busy ||
                    !selectedCopyPaths.size ||
                    !diskGates.editDiskReady ||
                    !agent.connected
                  }
                >
                  {busy === "index" ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : null}
                  Copy & verify {selectedCopyPaths.size} selected
                </Button>
              ) : null}
              {addMode === "copy" ? (
                <Button
                  variant="secondary"
                  onClick={addToIngestQueue}
                  disabled={!!busy || !indexFolderPath.trim()}
                >
                  Add camera to queue
                </Button>
              ) : null}
            </div>

            {ingestQueue.length > 0 ? (
              <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-3">
                <div className="text-sm font-medium text-slate-800">
                  Multi-camera queue ({ingestQueue.length})
                </div>
                <ul className="space-y-1 text-xs text-slate-600">
                  {ingestQueue.map((q) => (
                    <li key={q.id} className="flex justify-between gap-2">
                      <span className="truncate">
                        {q.cameraLabel.replace(/_/g, " ")} ? {q.sourcePath}
                      </span>
                      <button
                        type="button"
                        className="text-red-600 underline"
                        disabled={!!busy}
                        onClick={() =>
                          setIngestQueue((prev) => prev.filter((x) => x.id !== q.id))
                        }
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
                <Button
                  size="sm"
                  onClick={() => void runIngestQueue()}
                  disabled={!!busy || !diskGates.editDiskReady}
                >
                  {busy === "index" ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : null}
                  Run queue
                </Button>
              </div>
            ) : null}
              </div>
            </details>
          </div>
        </CardBody>
      </Card>

      {/* Step 4 — only when previews still needed (guided copy usually handles this) */}
      {needsPrepare.length > 0 ? (
      <Card id="ai-step-4">
        <CardBody className="space-y-5">
          <div className="flex items-start gap-3">
            <StepBadge n={stepNo.prepare} done={step4Done} />
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold text-slate-900">
                Prepare clips for smooth editing
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Some camera formats are hard for Windows to play. ShootSpine makes lighter preview
                copies for editing - your originals stay untouched for DaVinci Resolve.
              </p>
            </div>
          </div>

          <div className="pl-10 space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-slate-50 px-3 py-3 text-center">
                <div className="text-2xl font-semibold text-slate-900">{media.length}</div>
                <div className="text-xs text-slate-500">Clips found</div>
              </div>
              <div className="rounded-xl bg-slate-50 px-3 py-3 text-center">
                <div className="text-2xl font-semibold text-slate-900">{preparedCount}</div>
                <div className="text-xs text-slate-500">Ready to edit</div>
              </div>
              <div className="rounded-xl bg-amber-50 px-3 py-3 text-center">
                <div className="text-2xl font-semibold text-amber-900">{needsPrepare.length}</div>
                <div className="text-xs text-amber-800">Need prep</div>
              </div>
            </div>

            <Button
              onClick={() => void onPrepareClips()}
              disabled={!!busy || !needsPrepare.length || !diskGates.editDiskReady}
            >
              {busy === "proxy" ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-1.5 h-4 w-4" />
              )}
              {needsPrepare.length
                ? `Prepare ${needsPrepare.length} clip${needsPrepare.length === 1 ? "" : "s"}`
                : "All clips prepared"}
            </Button>
          </div>
        </CardBody>
      </Card>
      ) : (
        <div id="ai-step-4" className="hidden" aria-hidden />
      )}

      {/* Steps 5–6 — only when linked to a production shot list / plan */}
      {hasProductionPlan ? (
      <>
      <Card id="ai-step-5">
        <CardBody className="space-y-5">
          <div className="flex items-start gap-3">
            <StepBadge n={stepNo.analyze} done={step5Done} />
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Understand your footage</h2>
              <p className="mt-1 text-sm text-slate-600">
                Local analysis finds technical issues, rough shot breaks, and spoken words you can
                search.
              </p>
            </div>
          </div>
          <div className="space-y-4 pl-10">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-slate-50 px-3 py-3 text-center">
                <div className="text-2xl font-semibold text-slate-900">{analyzedCount}</div>
                <div className="text-xs text-slate-500">Clips analyzed</div>
              </div>
              <div className="rounded-xl bg-slate-50 px-3 py-3 text-center">
                <div className="text-2xl font-semibold text-slate-900">
                  {analysis.reduce((n, a) => n + a.shots.length, 0)}
                </div>
                <div className="text-xs text-slate-500">Shot segments</div>
              </div>
              <div className="rounded-xl bg-slate-50 px-3 py-3 text-center">
                <div className="text-2xl font-semibold text-slate-900">
                  {analysis.reduce((n, a) => n + a.transcript.length, 0)}
                </div>
                <div className="text-xs text-slate-500">Transcript lines</div>
              </div>
            </div>

            <label className="flex cursor-pointer items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={runTranscription}
                disabled={!!busy}
                onChange={(e) => setRunTranscription(e.target.checked)}
              />
              <span className="font-medium text-slate-800">Also transcribe speech</span>
            </label>

            <Button
              onClick={() => void onAnalyzeFootage()}
              disabled={
                !!busy || !media.length || !agent.connected || !diskGates.editDiskReady
              }
            >
              {busy === "analyze" ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-1.5 h-4 w-4" />
              )}
              Analyze footage
            </Button>

            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Search transcript</span>
              <input
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder='e.g. "hello" or a character line'
                value={transcriptQuery}
                onChange={(e) => setTranscriptQuery(e.target.value)}
              />
            </label>
            {transcriptQuery.trim() ? (
              transcriptHits.length ? (
                <ul className="space-y-2 text-sm">
                  {transcriptHits.map((h, i) => {
                    const clip = media.find((m) => m.id === h.mediaAssetId);
                    const path = clip ? playbackPathForAsset(clip) : null;
                    return (
                      <li
                        key={`${h.mediaAssetId}_${i}`}
                        className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-xs text-slate-500">
                              {clip?.filename || h.mediaAssetId} - {h.startSeconds.toFixed(1)}s
                            </div>
                            <div className="text-slate-800">{h.text}</div>
                          </div>
                          {path ? (
                            <button
                              type="button"
                              className="shrink-0 text-xs font-medium text-sky-800 underline disabled:opacity-50"
                              disabled={!!busy || !agent.connected}
                              onClick={() =>
                                void openPreview(clip?.filename || "Transcript hit", [
                                  {
                                    path,
                                    label: clip?.filename || h.mediaAssetId,
                                    startSeconds: h.startSeconds,
                                  },
                                ])
                              }
                            >
                              Play
                            </button>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-xs text-slate-500">No transcript matches yet.</p>
              )
            ) : null}
          </div>
        </CardBody>
      </Card>

      {/* Step 6 — V1D */}
      <Card id="ai-step-6">
        <CardBody className="space-y-5">
          <div className="flex items-start gap-3">
            <StepBadge n={stepNo.match} done={step6Done} />
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Match to your shot list</h2>
              <p className="mt-1 text-sm text-slate-600">
                Compare clips to coverage shots using filenames, camera labels, shot size, and
                dialogue when a script is linked. Shoot Mode takes show here when synced from the
                board. Pick preferred takes anytime.
              </p>
            </div>
          </div>
          <div className="space-y-4 pl-10">
            {coverage ? (
              <div className="grid gap-3 sm:grid-cols-4">
                <div className="rounded-xl bg-slate-50 px-3 py-3 text-center">
                  <div className="text-2xl font-semibold text-slate-900">
                    {coverage.plannedShotCount}
                  </div>
                  <div className="text-xs text-slate-500">Planned shots</div>
                </div>
                <div className="rounded-xl bg-emerald-50 px-3 py-3 text-center">
                  <div className="text-2xl font-semibold text-emerald-800">
                    {coverage.coveredCount}
                  </div>
                  <div className="text-xs text-emerald-700">Covered</div>
                </div>
                <div className="rounded-xl bg-amber-50 px-3 py-3 text-center">
                  <div className="text-2xl font-semibold text-amber-800">
                    {coverage.partialCount}
                  </div>
                  <div className="text-xs text-amber-700">Partial</div>
                </div>
                <div className="rounded-xl bg-rose-50 px-3 py-3 text-center">
                  <div className="text-2xl font-semibold text-rose-800">
                    {coverage.missingCount}
                  </div>
                  <div className="text-xs text-rose-700">Missing</div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                Run matching after you have clips (and ideally a Prep shot list).
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void onRunMatch()} disabled={!!busy || !media.length}>
                {busy === "match" ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Clapperboard className="mr-1.5 h-4 w-4" />
                )}
                {coverage ? "Re-run matching" : "Match clips to shot list"}
              </Button>
              <Button
                variant="secondary"
                onClick={() => void onRenamePreferredFromShotList()}
                disabled={
                  !!busy ||
                  !coverage?.shots?.some((s) => s.preferredMediaAssetId) ||
                  !context?.shots?.length
                }
              >
                <Pencil className="mr-1.5 h-4 w-4" />
                Rename preferred from shot list
              </Button>
            </div>
            <p className="text-xs text-slate-500">
              Rename updates ShootSpine display names to{" "}
              <span className="font-mono text-[11px]">shot_01_Approach</span> style for matching and
              Resolve — files on disk stay as the camera originals.
            </p>

            {coverage?.notes?.length ? (
              <p className="text-xs text-slate-500">{coverage.notes.join(" ")}</p>
            ) : null}

            {unmatchedClips.length > 0 ? (
              <p className="text-xs text-amber-800">
                {unmatchedClips.length} clip{unmatchedClips.length === 1 ? "" : "s"} didn’t
                match any planned shot — review below (they won’t enter a preferred-take first
                cut until you Prefer them onto a shot).
              </p>
            ) : null}

            {coverage?.shots?.length ? (
              <ul className="space-y-3">
                {coverage.shots.slice(0, 40).map((row) => {
                  const preferred = media.find((m) => m.id === row.preferredMediaAssetId);
                  return (
                    <li
                      key={row.plannedShotId}
                      className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-medium text-slate-900">
                            {[row.scene, row.shotName || row.shotType || "Shot"]
                              .filter(Boolean)
                              .join(" - ")}
                          </div>
                          <div className="text-xs text-slate-500">
                            Preferred:{" "}
                            {preferred?.filename ||
                              (row.preferredMediaAssetId ? row.preferredMediaAssetId : "-")}
                            {row.preferredManual ? " (manual)" : ""}
                            {typeof row.preferredScore === "number"
                              ? ` - score ${(row.preferredScore * 100).toFixed(0)}%`
                              : ""}
                            {row.preferredReason ? ` · ${row.preferredReason}` : ""}
                          </div>
                          {row.onSetTakes?.length || row.onSetNotes ? (
                            <ShootModeShotMeta
                              className="mt-1.5"
                              takes={row.onSetTakes}
                              shootNotes={row.onSetNotes}
                            />
                          ) : null}
                        </div>
                        <Badge
                          variant={
                            row.status === "covered" || row.status === "multi_take"
                              ? "success"
                              : row.status === "partial"
                                ? "warning"
                                : "default"
                          }
                        >
                          {row.status.replace("_", " ")}
                        </Badge>
                      </div>
                      {row.candidates.length ? (
                        <ul className="mt-2 space-y-1.5">
                          {row.candidates.slice(0, 4).map((c) => {
                            const isPreferred =
                              row.preferredMediaAssetId === c.mediaAssetId;
                            return (
                              <li
                                key={c.mediaAssetId}
                                className={
                                  isPreferred
                                    ? "flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50/90 px-2 py-1.5 text-xs text-emerald-950"
                                    : "flex flex-wrap items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-xs text-slate-600"
                                }
                              >
                                <span className="flex min-w-0 items-center gap-1.5 truncate">
                                  {isPreferred ? (
                                    <Star className="h-3 w-3 shrink-0 fill-emerald-600 text-emerald-700" />
                                  ) : null}
                                  <span className="truncate">
                                    {c.filename} - {(c.score * 100).toFixed(0)}%
                                    {c.reasons[0] ? ` - ${c.reasons[0]}` : ""}
                                  </span>
                                </span>
                                {isPreferred ? (
                                  <span className="inline-flex shrink-0 items-center gap-1 font-medium text-emerald-800">
                                    Preferred
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    className="inline-flex shrink-0 items-center gap-1 text-sky-800 underline disabled:opacity-50"
                                    disabled={!!busy}
                                    onClick={() =>
                                      void onPreferTake(row.plannedShotId, c.mediaAssetId)
                                    }
                                  >
                                    <Star className="h-3 w-3" />
                                    Prefer
                                  </button>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <p className="mt-2 text-xs text-slate-500">No clip candidates yet.</p>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : null}

            {unmatchedClips.length > 0 ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-sm text-amber-950">
                <p>
                  <span className="font-medium">Unmatched clips</span>
                  {` — ${unmatchedClips.length} video clip${
                    unmatchedClips.length === 1 ? "" : "s"
                  } not linked to any planned shot.`}
                </p>
                <p className="mt-1 text-xs text-amber-900/80">
                  Watch to decide if they’re B-roll, junk, or a take that needs Prefer on a shot
                  above. Filename-only first cut may still include them.
                </p>
                <ul className="mt-2.5 max-h-48 space-y-1.5 overflow-y-auto">
                  {unmatchedClips.slice(0, 24).map((m) => {
                    const canPlay = Boolean(playbackPathForAsset(m));
                    return (
                      <li
                        key={m.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-100/80 bg-white/70 px-2 py-1.5 text-xs"
                      >
                        <span className="min-w-0 truncate font-medium text-amber-950">
                          {m.filename || m.id}
                        </span>
                        {canPlay ? (
                          <button
                            type="button"
                            className="inline-flex shrink-0 items-center gap-1 text-sky-800 underline disabled:opacity-50"
                            disabled={!!busy || !agent.connected}
                            onClick={() => void previewClipAsset(m)}
                          >
                            <Play className="h-3 w-3" />
                            Watch
                          </button>
                        ) : (
                          <span className="shrink-0 text-amber-800/70">No preview path</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
                {unmatchedClips.length > 24 ? (
                  <p className="mt-1.5 text-xs text-amber-900/70">
                    Showing 24 of {unmatchedClips.length}.
                  </p>
                ) : null}
              </div>
            ) : null}

            {preferredTakeCount > 0 ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-950">
                <p>
                  <span className="font-medium">Preferred takes ready</span>
                  {` — ${preferredTakeCount} shot${
                    preferredTakeCount === 1 ? "" : "s"
                  } with a preferred take.`}
                </p>
                <p className="mt-1 text-xs text-emerald-900/80">
                  {timeline
                    ? "Next: Rebuild first cut (or Play) so the assembly uses these preferences."
                    : "Next: Line up a first cut, then Play to Prefer / Drop / trim."}
                </p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  <Button
                    onClick={() => void onBuildRoughCut()}
                    disabled={!!busy || !media.length}
                  >
                    {busy === "rough_cut" ? (
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    ) : (
                      <Clapperboard className="mr-1.5 h-4 w-4" />
                    )}
                    {timeline ? "Rebuild first cut" : "Build first cut"}
                  </Button>
                  {timeline && videoTrack?.clips?.length ? (
                    <Button
                      variant="secondary"
                      onClick={() => void previewRoughCut()}
                      disabled={!!busy || !agent.connected}
                    >
                      <Play className="mr-1.5 h-4 w-4" />
                      {activeReelName ? `Play ${activeReelName}` : "Play this cut"}
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      onClick={() =>
                        document
                          .getElementById("ai-step-7")
                          ?.scrollIntoView({ behavior: "smooth", block: "start" })
                      }
                      disabled={!!busy}
                    >
                      Go to first cut
                    </Button>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </CardBody>
      </Card>
      </>
      ) : (
        <>
          <div id="ai-step-5" className="hidden" aria-hidden />
          <div id="ai-step-6" className="hidden" aria-hidden />
        </>
      )}

      {/* Step 7 — V1E */}
      <Card id="ai-step-7">
        <CardBody className="space-y-5">
          <div className="flex items-start gap-3">
            <StepBadge n={stepNo.rough_cut} done={step7Done} />
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Line up a first cut</h2>
              <p className="mt-1 text-sm text-slate-600">
                This is not the final edit. It lines up preferred Match takes so you can Play the
                cut, Prefer better takes, Drop junk, then hand that order to DaVinci Resolve. When
                clips were analyzed, uses local shot breaks for in/out instead of starting at the
                head of each file.
              </p>
            </div>
          </div>
          <div className="space-y-4 pl-10">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-700">
              {hasProductionPlan && coverage?.shots?.some((s) => s.preferredMediaAssetId) ? (
                <p>
                  <span className="font-medium text-slate-900">From your shot list:</span> uses the
                  preferred take for each planned shot.
                </p>
              ) : (
                <p>
                  Sequences your video clips in filename order — a starting assembly so you can
                  watch and remove bad takes. Long clips are capped (~12s each) for a quick first
                  pass.
                </p>
              )}
              <p className="mt-1.5 text-xs text-slate-500">
                Next: Play → In/Out · Slip/Roll · Split/Join · Duplicate · reorder · Prefer / Drop · Undo → Resolve.
              </p>
            </div>

            {timeline ? (
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-slate-50 px-3 py-3 text-center">
                  <div className="text-2xl font-semibold text-slate-900">v{timeline.version}</div>
                  <div className="text-xs text-slate-500">Version</div>
                </div>
                <div className="rounded-xl bg-slate-50 px-3 py-3 text-center">
                  <div className="text-2xl font-semibold text-slate-900">
                    {visibleClips.length}
                  </div>
                  <div className="text-xs text-slate-500">Clips in this cut</div>
                </div>
                <div className="rounded-xl bg-slate-50 px-3 py-3 text-center">
                  <div className="text-lg font-semibold text-slate-900">
                    {framesToTimecode(
                      visibleClips.reduce(
                        (max, c) => Math.max(max, c.timelineStartFrame + c.durationFrames),
                        0
                      ),
                      timeline.frameRate
                    )}
                  </div>
                  <div className="text-xs text-slate-500">Duration</div>
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => void onBuildRoughCut()}
                disabled={!!busy || !media.length}
              >
                {busy === "rough_cut" ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Clapperboard className="mr-1.5 h-4 w-4" />
                )}
                {timeline ? "Rebuild first cut" : "Build first cut"}
              </Button>
              {videoTrack?.clips?.length ? (
                <Button
                  variant="secondary"
                  onClick={() => void previewRoughCut()}
                  disabled={!!busy || !agent.connected}
                >
                  <Play className="mr-1.5 h-4 w-4" />
                  {activeReelName ? `Play ${activeReelName}` : "Play this cut"}
                </Button>
              ) : null}
            </div>

            {timeline && videoTrack?.clips?.length ? (
              <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Acts / reels (long form)</p>
                  <p className="mt-0.5 text-xs text-slate-600">
                    For a feature (~1h45), split into acts or ~20 min reels. Edit by chat focuses on
                    the active one.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={!!busy}
                    onClick={() => void onSetupFeatureReels("acts")}
                  >
                    Set up for feature (3 acts)
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={!!busy}
                    onClick={() => void onSetupFeatureReels("reels")}
                  >
                    Split into ~20 min reels
                  </Button>
                </div>
                {reelSummaries.length ? (
                  <div className="flex flex-wrap gap-2">
                    {reelSummaries.map((r) => {
                      const active = r.id === timeline.activeReelId;
                      const mins = Math.round(r.durationSeconds / 60);
                      return (
                        <button
                          key={r.id}
                          type="button"
                          disabled={!!busy}
                          onClick={() => void onSetActiveReel(r.id)}
                          className={`rounded-xl border px-3 py-2 text-left text-xs transition ${
                            active
                              ? "border-sky-300 bg-sky-50 text-sky-950 shadow-sm"
                              : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                          }`}
                        >
                          <div className="font-semibold">{r.name}</div>
                          <div className="mt-0.5 text-slate-500">
                            {r.clipCount} clips - ~{mins} min
                            {r.targetDurationSeconds
                              ? ` / ~${Math.round(r.targetDurationSeconds / 60)} min target`
                              : ""}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            ) : null}

            {stillClipsOnCut.length ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-2 text-sm text-amber-950">
                <p>
                  This cut still includes {stillClipsOnCut.length} camera still
                  {stillClipsOnCut.length === 1 ? "" : "s"} (JPG). They’re hidden below.
                </p>
                <button
                  type="button"
                  className="mt-1 text-xs font-medium text-amber-900 underline disabled:opacity-50"
                  disabled={!!busy}
                  onClick={() => void onStripNonVideoFromCut()}
                >
                  Remove stills from cut
                </button>
              </div>
            ) : null}

            {visibleClips.length ? (
              <ul className="space-y-2">
                {visibleClips.map((c) => {
                  const asset = media.find((m) => m.id === c.mediaAssetId);
                  const canPlay = Boolean(asset && playbackPathForAsset(asset));
                  return (
                    <li
                      key={c.id}
                      className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2 text-sm"
                    >
                      <button
                        type="button"
                        className="relative shrink-0 disabled:opacity-50"
                        disabled={!canPlay || !agent.connected || !!busy}
                        onClick={() => previewTimelineClip(c.id)}
                        title={canPlay ? "Watch clip" : "No local path"}
                      >
                        {asset?.thumbnailDataUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={asset.thumbnailDataUrl}
                            alt=""
                            className="h-14 w-24 rounded-lg object-cover bg-slate-200"
                          />
                        ) : (
                          <div className="flex h-14 w-24 items-center justify-center rounded-lg bg-slate-200 text-[10px] text-slate-500">
                            No still
                          </div>
                        )}
                        {canPlay ? (
                          <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/30 text-white">
                            <Play className="h-4 w-4 fill-current" />
                          </span>
                        ) : null}
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium text-slate-900">
                          {c.label || asset?.filename || c.mediaAssetId}
                        </div>
                        <div className="text-xs text-slate-500">
                          {framesToTimecode(c.timelineStartFrame, timeline!.frameRate)} -{" "}
                          {framesToTimecode(c.durationFrames, timeline!.frameRate)} dur
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <button
                          type="button"
                          className="text-xs text-sky-800 underline disabled:opacity-50"
                          disabled={!!busy || !agent.connected || !canPlay}
                          onClick={() => previewTimelineClip(c.id)}
                        >
                          Watch
                        </button>
                        <button
                          type="button"
                          className="text-xs text-rose-700 underline disabled:opacity-50"
                          disabled={!!busy}
                          onClick={() => void onRippleDeleteClip(c.id)}
                        >
                          Remove
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : videoTrack?.clips?.length ? (
              <p className="text-sm text-slate-500">
                {stillClipsOnCut.length
                  ? "Only camera stills were on this reel — remove them or rebuild the first cut."
                  : "No clips in this reel yet - pick another act/reel."}
              </p>
            ) : null}

            {timelineVersions.length > 1 ? (
              <details className="rounded-xl border border-slate-200 bg-slate-50/40 px-3 py-2">
                <summary className="cursor-pointer text-xs font-medium uppercase tracking-wide text-slate-500">
                  Versions ({timelineVersions.length}) — show / hide
                </summary>
                <ul className="mt-2 space-y-1.5 border-t border-slate-200 pt-2">
                  {timelineVersions.slice(0, 6).map((v) => (
                    <li
                      key={v.id}
                      className="flex items-center justify-between gap-2 text-xs text-slate-600"
                    >
                      <span>
                        v{v.version}
                        {v.note ? ` - ${v.note}` : ""}
                      </span>
                      {v.version !== timeline?.version ? (
                        <button
                          type="button"
                          className="text-sky-800 underline disabled:opacity-50"
                          disabled={!!busy}
                          onClick={() => void onRestoreVersion(v.id)}
                        >
                          Restore
                        </button>
                      ) : (
                        <span className="text-emerald-700">Current</span>
                      )}
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </div>
        </CardBody>
      </Card>

      {/* Edit notes - brief for Edit by chat */}
      <Card>
        <CardBody className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Edit notes</h2>
            <p className="mt-1 text-sm text-slate-600">
              Capture ideas from set, client calls, or look direction. Edit by chat uses these as a
              creative brief when you propose an edit.
            </p>
          </div>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {EDIT_NOTE_SOURCES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setEditNoteSource(s.id)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                    editNoteSource === s.id
                      ? "border-sky-300 bg-sky-50 text-sky-900"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                  title={s.blurb}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <textarea
              className="min-h-[72px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder={
                editNoteSource === "client"
                  ? "e.g. Client wants a punchier open, keep the hero product shot longer..."
                  : editNoteSource === "shooting"
                    ? "e.g. Take 3 of the interview felt strongest; wide of lobby is weak..."
                    : editNoteSource === "look"
                      ? "e.g. Faster cuts after the logo; warmer, less dissolve-heavy..."
                      : "Anything the edit should follow..."
              }
              value={editNoteDraft}
              disabled={!!busy}
              onChange={(e) => setEditNoteDraft(e.target.value)}
            />
            <Button
              onClick={() => void onAddEditNote()}
              disabled={!!busy || !editNoteDraft.trim()}
            >
              {busy === "edit_notes" ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : null}
              Save note
            </Button>
            {editNotes.length ? (
              <ul className="space-y-2">
                {editNotes.map((n) => (
                  <li
                    key={n.id}
                    className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        {sourceLabel(n.source)}
                      </div>
                      <p className="mt-0.5 text-sm text-slate-800 whitespace-pre-wrap">{n.text}</p>
                    </div>
                    <button
                      type="button"
                      className="shrink-0 text-xs font-medium text-slate-500 underline hover:text-rose-700 disabled:opacity-50"
                      disabled={!!busy}
                      onClick={() => void onRemoveEditNote(n.id)}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">
                No notes yet - add one anytime (even before the first cut).
              </p>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Step 8 — V1F */}
      <Card id="ai-step-8">
        <CardBody className="space-y-5">
          <div className="flex items-start gap-3">
            <StepBadge n={stepNo.chat} done={step8Done} />
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Edit by chat</h2>
              <p className="mt-1 text-sm text-slate-600">
                Describe an edit in plain language. ShootSpine proposes clear edit steps -
                you review, then apply. Saved edit notes are included as the creative brief.
                {activeReelName
                  ? ` Focused on -${activeReelName}- (switch acts/reels under the first cut).`
                  : ""}
              </p>
            </div>
          </div>
          <div className="space-y-4 pl-10">
            {activeReelName ? (
              <p className="rounded-xl border border-violet-100 bg-violet-50/60 px-3 py-2 text-sm text-violet-950">
                Chat scope: <span className="font-medium">{activeReelName}</span> - long features stay
                manageable reel-by-reel.
              </p>
            ) : null}
            {editNotes.length ? (
              <p className="rounded-xl border border-sky-100 bg-sky-50/70 px-3 py-2 text-sm text-sky-950">
                {editNotes.length} edit note{editNotes.length === 1 ? "" : "s"} will guide
                proposals. Or press <span className="font-medium">Propose from notes</span>.
              </p>
            ) : null}
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-slate-700">What should change?</span>
              <textarea
                className="min-h-[88px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder='e.g. "remove the first clip", "trim first to 2 seconds", "use my notes"'
                value={chatMessage}
                disabled={!!busy || !timeline}
                onChange={(e) => setChatMessage(e.target.value)}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => void onChatPropose()}
                disabled={!!busy || !timeline || !chatMessage.trim()}
              >
                {busy === "chat_edit" ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-1.5 h-4 w-4" />
                )}
                Propose edit
              </Button>
              <Button
                variant="secondary"
                onClick={() => void onChatPropose(PROPOSE_FROM_NOTES_MESSAGE)}
                disabled={!!busy || !timeline || editNotes.length === 0}
              >
                Propose from notes
              </Button>
              <Button
                variant="secondary"
                onClick={() => void onChatApply()}
                disabled={
                  !!busy ||
                  !chatProposal ||
                  (!chatProposal.proposal.ops.length && chatProposal.proposal.action !== "undo") ||
                  (!chatProposal.validationOk && chatProposal.proposal.action !== "undo")
                }
              >
                Apply
              </Button>
              <Button
                variant="ghost"
                onClick={() => void onChatUndo()}
                disabled={!!busy || !timeline || timelineVersions.length < 2}
              >
                Undo last
              </Button>
            </div>

            {chatProposal ? (
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3 text-sm">
                <div className="font-medium text-slate-900">{chatProposal.proposal.summary}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {chatProposal.proposal.source === "gemini"
                    ? "Suggested with AI"
                    : "Suggested from your wording"}
                  {typeof chatProposal.proposal.confidence === "number"
                    ? ` - ${Math.round(chatProposal.proposal.confidence * 100)}% confidence`
                    : ""}
                  {chatProposal.proposal.warnings?.includes("reel_truncated")
                    ? " - long reel - only the first part was considered"
                    : ""}
                </div>
                {chatProposal.descriptions.length ? (
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-700">
                    {chatProposal.descriptions.map((d, i) => (
                      <li key={`${d}_${i}`}>{d}</li>
                    ))}
                  </ul>
                ) : null}
                {chatProposal.validationErrors.length ? (
                  <p className="mt-2 text-xs text-rose-700">
                    {chatProposal.validationErrors.join(" - ")}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                Common: remove first/last, trim to N seconds, reverse order, swap first two, undo.
                Harder requests use Gemini when configured (timeline metadata only - never camera
                files).
              </p>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Step 9 — look & transitions */}
      <Card id="ai-step-9">
        <CardBody className="space-y-5">
          <div className="flex items-start gap-3">
            <StepBadge n={stepNo.look} done={step9Done} />
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Look &amp; transitions</h2>
              <p className="mt-1 text-sm text-slate-600">
                Soft blends go into the Resolve timeline (EDL + markers). Mood notes guide Color —
                we never bake a grade into your footage.
              </p>
            </div>
          </div>
          <div className="space-y-5 pl-10">
            {feedbackHint ? (
              <p className="rounded-xl border border-sky-100 bg-sky-50/70 px-3 py-2 text-sm text-sky-950">
                {feedbackHint}
              </p>
            ) : null}
            <div>
              <p className="text-sm font-medium text-slate-800">How should it feel?</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {MOOD_PRESETS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMoodId(m.id)}
                    className={`rounded-2xl border px-3 py-3 text-left transition ${
                      moodId === m.id
                        ? "border-sky-300 bg-sky-50 shadow-sm"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="font-semibold text-slate-900">{m.label}</div>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">{m.blurb}</p>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-800">Between clips</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {TRANSITION_PRESETS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTransitionStyle(t.id)}
                    className={`rounded-2xl border px-3 py-3 text-left transition ${
                      transitionStyle === t.id
                        ? "border-sky-300 bg-sky-50 shadow-sm"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="font-semibold text-slate-900">{t.label}</div>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">{t.blurb}</p>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                onClick={() => void onApplyFinishing()}
                disabled={!!busy || !timeline}
              >
                {busy === "finishing" ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-1.5 h-4 w-4" />
                )}
                Save look
              </Button>
              {finishingSummary ? (
                <span className="text-sm text-slate-600">
                  Saved: <span className="font-medium text-slate-800">{finishingSummary}</span>
                </span>
              ) : (
                <span className="text-sm text-slate-500">Optional - you can skip and go to Resolve.</span>
              )}
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Step 10 — finish in Resolve */}
      <Card id="ai-step-10">
        <CardBody className="space-y-5">
          <div className="flex items-start gap-3">
            <StepBadge n={stepNo.resolve} done={step10Done} />
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Finish in DaVinci Resolve</h2>
              <p className="mt-1 text-sm text-slate-600">
                Color and polish happen in Resolve. Pick where you'll finish - we'll keep the steps
                simple.
              </p>
            </div>
          </div>

          <div className="space-y-5 pl-10">
            {resolvePreflight.length && timeline ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                <p className="text-sm font-semibold text-slate-900">Before you finish</p>
                <ul className="mt-2 space-y-1.5">
                  {resolvePreflight.map((tip) => (
                    <li
                      key={tip.id}
                      className={`text-sm ${
                        tip.level === "action"
                          ? "text-amber-900"
                          : tip.level === "ready"
                            ? "text-emerald-900"
                            : "text-slate-700"
                      }`}
                    >
                      {tip.level === "ready" ? "? " : tip.level === "action" ? "- " : "- "}
                      {tip.text}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setFinishWhere("here")}
                className={`rounded-2xl border px-4 py-4 text-left transition ${
                  finishWhere === "here"
                    ? "border-sky-300 bg-sky-50 shadow-sm shadow-sky-100"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-2 text-slate-900">
                  <Monitor className="h-5 w-5 text-sky-600" />
                  <span className="font-semibold">On this computer</span>
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  Resolve is installed here. We'll save your edit and open it.
                </p>
              </button>
              <button
                type="button"
                onClick={() => setFinishWhere("mac")}
                className={`rounded-2xl border px-4 py-4 text-left transition ${
                  finishWhere === "mac"
                    ? "border-sky-300 bg-sky-50 shadow-sm shadow-sky-100"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-2 text-slate-900">
                  <HardDrive className="h-5 w-5 text-sky-600" />
                  <span className="font-semibold">On a Mac</span>
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  You'll move the project over, then open Resolve on the Mac.
                </p>
              </button>
            </div>

            {finishWhere === "here" ? (
              <div className="space-y-4">
                {resolveWorkflow ? (
                  <div
                    className={`rounded-2xl border px-4 py-3 ${
                      resolveWorkflow.level === "ready"
                        ? "border-emerald-200 bg-emerald-50/70"
                        : resolveWorkflow.level === "almost"
                          ? "border-amber-200 bg-amber-50/60"
                          : resolveWorkflow.level === "missing"
                            ? "border-slate-200 bg-slate-50"
                            : "border-sky-100 bg-sky-50/50"
                    }`}
                  >
                    <p className="font-semibold text-slate-900">{resolveWorkflow.title}</p>
                    <p className="mt-1 text-sm text-slate-600">{resolveWorkflow.detail}</p>
                    <button
                      type="button"
                      className="mt-2 text-xs font-medium text-sky-800 underline disabled:opacity-50"
                      disabled={!!busy || !agent.connected}
                      onClick={() => void refreshResolveWorkflow()}
                    >
                      Check again
                    </button>
                  </div>
                ) : agent.connected ? (
                  <button
                    type="button"
                    className="text-sm text-sky-800 underline"
                    disabled={!!busy}
                    onClick={() => void refreshResolveWorkflow()}
                  >
                    Check if Resolve is ready
                  </button>
                ) : (
                  <p className="text-sm text-slate-500">Connect this computer (step 1) first.</p>
                )}

                <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-xs text-slate-500">Resolve project name</span>
                    <code className="min-w-0 flex-1 truncate font-mono text-slate-900">
                      {context?.projectName?.trim() || "Name this project at the top"}
                    </code>
                    <Button
                      variant="secondary"
                      size="sm"
                      type="button"
                      disabled={
                        !!busy ||
                        !context?.projectName?.trim() ||
                        isPlaceholderProjectName(context?.projectName)
                      }
                      onClick={() => {
                        const name = (context?.projectName || "").trim();
                        if (!name) return;
                        void navigator.clipboard.writeText(name).then(
                          () => {
                            setCopiedProjectName(true);
                            window.setTimeout(() => setCopiedProjectName(false), 2000);
                            setStatusNote(
                              `Copied “${name}” — paste that when you create the Resolve project.`
                            );
                          },
                          () => {
                            setError(
                              "Couldn’t copy project name — select and copy it manually."
                            );
                          }
                        );
                      }}
                    >
                      <Copy className="mr-1.5 h-3.5 w-3.5" />
                      {copiedProjectName ? "Copied" : "Copy name"}
                    </Button>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Change the name in the Project name box at the top of this page.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => void onBringIntoResolve()}
                    disabled={
                      !!busy ||
                      !timeline ||
                      !agent.connected ||
                      !settings?.projectRootPath ||
                      !diskGates.editDiskReady
                    }
                  >
                    {busy === "import-resolve" ? (
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    ) : (
                      <Clapperboard className="mr-1.5 h-4 w-4" />
                    )}
                    Bring edit into Resolve
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => void onOpenInResolve()}
                    disabled={
                      !!busy ||
                      !agent.connected ||
                      !settings?.projectRootPath ||
                      !diskGates.editDiskReady
                    }
                  >
                    {busy === "open-resolve" ? (
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    ) : null}
                    Open Resolve app
                  </Button>
                </div>
                <p className="text-xs text-slate-500">
                  Copy the ShootSpine name → create/open that project in Resolve → then{" "}
                  <span className="font-medium text-slate-700">Bring edit into Resolve</span>.
                </p>

                {!timeline ? (
                  <p className="text-sm text-slate-500">
                    Build a first cut above before “Bring edit into Resolve”.
                  </p>
                ) : null}

                {resolvePackageStale && (resolveHandoffDir || resolveImported) ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3">
                    <p className="font-semibold text-amber-950">
                      Cut changed since last Resolve save
                      {timeline ? ` (now v${timeline.version})` : ""}
                    </p>
                    <p className="mt-1 text-sm text-amber-900/90">
                      Drop/edit updated the first cut. Use{" "}
                      <span className="font-medium">Bring edit into Resolve</span> again (or Show
                      me the folder) so Resolve gets the latest version — the old package is stale.
                    </p>
                  </div>
                ) : null}

                {resolveImported && !resolvePackageStale ? (
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3">
                    <p className="font-semibold text-emerald-950">Your first cut is in Resolve</p>
                    <p className="mt-1 text-sm text-emerald-900/80">
                      Clips are linked in the ShootSpine media bin when possible. Finish color and
                      sound in Resolve - look tips are saved with your project folder.
                    </p>
                  </div>
                ) : resolveHandoffDir && !resolvePackageStale ? (
                  <div className="rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-white px-4 py-4 shadow-sm shadow-sky-100/50">
                    <div className="flex items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                        <CheckCircle2 className="h-5 w-5" />
                      </span>
                      <div className="space-y-3">
                        <div>
                          <p className="font-semibold text-slate-900">Edit saved - almost there</p>
                          <p className="mt-1 text-sm text-slate-600">
                            Open a project in Resolve, then press{" "}
                            <span className="font-medium">Bring edit into Resolve</span>. Or import
                            by hand:
                          </p>
                        </div>
                        <ol className="space-y-2 text-sm text-slate-700">
                          <li className="flex gap-2">
                            <span className="font-semibold text-sky-700">1.</span>
                            <span>
                              Media Pool → import the{" "}
                              <span className="font-mono text-xs">C00xx.MP4</span> files from{" "}
                              <span className="font-mono text-xs">
                                01_ORIGINAL_MEDIA\CAMERA_A
                              </span>{" "}
                              (skip any{" "}
                              <span className="font-mono text-xs">.shootspine-proxies</span> folder
                              — that’s only for ShootSpine preview)
                            </span>
                          </li>
                          <li className="flex gap-2">
                            <span className="font-semibold text-sky-700">2.</span>
                            <span>
                              File → Import → Timeline → on the{" "}
                              <span className="font-medium">H:</span> drive pick{" "}
                              <span className="font-mono text-xs">
                                shootspine_rough_cut.xml
                              </span>{" "}
                              (free Resolve — easier than EDL). Same folder as the .edl.
                            </span>
                          </li>
                          <li className="flex gap-2">
                            <span className="font-semibold text-sky-700">3.</span>
                            <span>
                              Studio only:{" "}
                              <span className="font-medium">Bring edit into Resolve</span>
                            </span>
                          </li>
                        </ol>
                        <div className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2">
                          <p className="text-xs font-medium text-slate-500">Saved folder</p>
                          <p className="mt-0.5 break-all font-mono text-xs text-slate-800">
                            {resolveHandoffDir}
                          </p>
                          <p className="mt-1 break-all font-mono text-xs text-sky-800">
                            {`${resolveHandoffDir.replace(/[/\\]+$/, "")}${
                              resolveHandoffDir.includes("\\") ? "\\" : "/"
                            }${RESOLVE_HANDOFF_FILES.edl}`}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={!!busy}
                            onClick={() => void onShowHandoffFolder()}
                          >
                            {busy === "reveal-handoff" ? (
                              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <FolderOpen className="mr-1.5 h-3.5 w-3.5" />
                            )}
                            Show me the folder
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={!!busy}
                            onClick={() => {
                              const sep = resolveHandoffDir.includes("\\") ? "\\" : "/";
                              const full = `${resolveHandoffDir.replace(/[/\\]+$/, "")}${sep}${RESOLVE_HANDOFF_FILES.edl}`;
                              void navigator.clipboard.writeText(full).then(
                                () => setStatusNote(`Copied path: ${full}`),
                                () => setError("Could not copy path")
                              );
                            }}
                          >
                            <Copy className="mr-1.5 h-3.5 w-3.5" />
                            Copy EDL path
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="space-y-4">
                <ol className="space-y-3 text-sm text-slate-700">
                  <li className="flex gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-500 text-xs font-bold text-white">
                      1
                    </span>
                    <div>
                      <p className="font-medium text-slate-900">Prepare the edit on this PC</p>
                      <p className="mt-0.5 text-slate-600">
                        Saves your first cut into the project folder (with your footage).
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-500 text-xs font-bold text-white">
                      2
                    </span>
                    <div>
                      <p className="font-medium text-slate-900">Copy the project to the Mac</p>
                      <p className="mt-0.5 text-slate-600">
                        Use a drive, NAS, or your usual sync. Move the whole project folder - footage
                        and edit travel together.
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-500 text-xs font-bold text-white">
                      3
                    </span>
                    <div>
                      <p className="font-medium text-slate-900">Open Resolve on the Mac</p>
                      <p className="mt-0.5 text-slate-600">
                        Start a project, then{" "}
                        <span className="font-medium">File → Import → Timeline</span> and pick the
                        first-cut file from the folder we prepared.
                      </p>
                    </div>
                  </li>
                </ol>

                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => void onWriteResolveHandoff()}
                    disabled={
                      !!busy ||
                      !timeline ||
                      !agent.connected ||
                      !settings?.projectRootPath ||
                      !diskGates.editDiskReady
                    }
                  >
                    {busy === "write-handoff" ? (
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    ) : (
                      <FolderOpen className="mr-1.5 h-4 w-4" />
                    )}
                    Prepare for Mac
                  </Button>
                  {resolveHandoffDir ? (
                    <Button
                      variant="secondary"
                      disabled={!!busy}
                      onClick={() => void onShowHandoffFolder()}
                    >
                      {busy === "reveal-handoff" ? (
                        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                      ) : (
                        <FolderOpen className="mr-1.5 h-4 w-4" />
                      )}
                      Show project folder
                    </Button>
                  ) : null}
                </div>

                {resolveHandoffDir ? (
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 px-4 py-3">
                    <p className="font-medium text-emerald-950">Ready to move</p>
                    <p className="mt-1 text-sm text-emerald-900/80">
                      Copy your full project folder to the Mac, then follow step 3 in Resolve there.
                      You don't need to download anything from the browser.
                    </p>
                  </div>
                ) : !timeline ? (
                  <p className="text-sm text-slate-500">Build a first cut above first.</p>
                ) : null}
              </div>
            )}

            <ResolveCoachPanel />

            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-4">
                <p className="font-semibold text-slate-900">After you finish in Resolve</p>
                <p className="mt-1 text-sm text-slate-600">
                  {finishWhere === "mac"
                    ? "When this project folder is back on this computer with Resolve open, read the timeline for notes or import that cut as a new ShootSpine version (your previous first cut stays in Versions / Restore)."
                    : "Read the open timeline back for notes, or import that cut into ShootSpine as a new version (your previous first cut stays in Versions / Restore)."}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <Button
                    variant="secondary"
                    onClick={() => void onSyncFromResolve()}
                    disabled={!!busy || !agent.connected || !settings?.projectRootPath}
                  >
                    {busy === "resolve-sync" ? (
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-1.5 h-4 w-4" />
                    )}
                    Check what's in Resolve
                  </Button>
                  <Button
                    onClick={() => void onImportResolveCut()}
                    disabled={!!busy || !agent.connected || !settings?.projectRootPath}
                  >
                    {busy === "resolve-import-cut" ? (
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    ) : (
                      <Clapperboard className="mr-1.5 h-4 w-4" />
                    )}
                    Import Resolve cut here
                  </Button>
                  {resolveSyncSummary ? (
                    <span className="text-sm text-slate-600">
                      Last sync:{" "}
                      <span className="font-medium text-slate-800">{resolveSyncSummary}</span>
                    </span>
                  ) : null}
                </div>
                {resolveSyncCompare ? (
                  <div className="mt-3 rounded-xl border border-emerald-100 bg-white px-3 py-2.5">
                    <p className="text-sm font-medium text-slate-900">{resolveSyncCompare.title}</p>
                    <p className="mt-0.5 text-sm text-slate-600">{resolveSyncCompare.detail}</p>
                  </div>
                ) : null}
                {checklist?.items?.length ? (
                  <div className="mt-3 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium text-slate-800">
                        Next shoot checklist
                        {checklistStats.total
                          ? ` - ${checklistStats.remaining} remaining`
                          : ""}
                      </p>
                      <div className="flex flex-wrap gap-3">
                        {!context?.aiEditorOnly ? (
                          <button
                            type="button"
                            className="text-xs font-medium text-sky-800 underline disabled:opacity-50"
                            disabled={!!busy || checklistStats.remaining === 0}
                            onClick={() => void onSendChecklistToBoard()}
                          >
                            {busy === "board_handoff" ? "Sending..." : "Send to production board"}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="text-xs font-medium text-sky-800 underline disabled:opacity-50"
                          disabled={!!busy}
                          onClick={() => void onRebuildNextShootChecklist()}
                        >
                          Refresh list
                        </button>
                      </div>
                    </div>
                    {settings?.lastBoardHandoffAt ? (
                      <p className="text-xs text-slate-500">
                        Last sent to board{" "}
                        {new Date(settings.lastBoardHandoffAt).toLocaleString()}
                      </p>
                    ) : null}
                    <ul className="space-y-1.5">
                      {checklist.items.map((item) => (
                        <li
                          key={item.id}
                          className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                        >
                          <input
                            type="checkbox"
                            className="mt-0.5 h-4 w-4 rounded border-slate-300"
                            checked={item.done}
                            disabled={!!busy}
                            onChange={(e) =>
                              void onToggleNextShootItem(item.id, e.target.checked)
                            }
                          />
                          <span
                            className={
                              item.done
                                ? "text-slate-400 line-through"
                                : "text-slate-700"
                            }
                          >
                            {item.label}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : planningSummary ? (
                  <p className="mt-3 text-sm text-slate-600">{planningSummary}</p>
                ) : null}
              </div>
          </div>
        </CardBody>
      </Card>

      {/* Step 11 — backup & free space */}
      <Card id="ai-step-11">
        <CardBody className="space-y-5">
          <div className="flex items-start gap-3">
            <StepBadge n={stepNo.archive} done={step11Done} />
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Backup &amp; free space</h2>
              <p className="mt-1 text-sm text-slate-600">
                Copy footage to a backup drive, bring it back if you need it, then free space on this
                PC. We never erase camera cards.
              </p>
            </div>
          </div>

          <div className="space-y-5 pl-10">
            <div
              className={`rounded-2xl border px-4 py-3 ${
                archiveSummary.archived > 0
                  ? "border-emerald-200 bg-emerald-50/60"
                  : "border-slate-200 bg-slate-50/80"
              }`}
            >
              {media.length === 0 ? (
                <p className="text-sm text-slate-600">Add clips first, then you can back them up.</p>
              ) : archiveSummary.archived === 0 ? (
                <p className="text-sm text-slate-700">
                  <span className="font-semibold text-slate-900">No backup yet</span>
                  <span className="text-slate-600">
                    {" "}
                    - {media.length} clip{media.length === 1 ? "" : "s"} in the project.
                  </span>
                </p>
              ) : (
                <p className="text-sm text-slate-700">
                  <span className="font-semibold text-emerald-950">
                    {archiveSummary.archived} of {archiveSummary.total} backed up
                  </span>
                  {archiveSummary.reclaimable > 0 ? (
                    <span className="text-slate-600">
                      {" "}
                      - you can free space on this PC for {archiveSummary.reclaimable}
                    </span>
                  ) : null}
                </p>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-slate-800">1. Choose your backup drive</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  External hard drive or NAS folder - not your camera card.
                </p>
              </div>
              <FolderPicker
                label="Backup folder"
                hint="Pick a folder on your backup drive (external HDD preferred)."
                purpose="archive"
                value={archivePath}
                onChange={setArchivePath}
                onDrivesLoaded={setKnownDrives}
                getAgentToken={ensureAgentSession}
                agentConnected={agent.connected}
                disabled={!!busy}
                placeholder="e.g. F:\\ShootSpine_Backup"
              />
              <Button
                variant="secondary"
                onClick={() => void onSaveArchiveRoot()}
                disabled={!!busy || !archivePath.trim()}
              >
                {busy === "archive-root" ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <HardDrive className="mr-1.5 h-4 w-4" />
                )}
                Remember this folder
              </Button>
              {settings?.archiveRootPath ? (
                <p className="text-xs text-slate-500">
                  Using: <span className="font-medium text-slate-700">{settings.archiveRootPath}</span>
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-800">2. Back up or bring back</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => void onArchiveMedia()}
                  disabled={
                    !!busy ||
                    !agent.connected ||
                    media.length === 0 ||
                    !(archivePath.trim() || settings?.archiveRootPath) ||
                    !diskGates.editDiskReady ||
                    !diskGates.archiveDiskReady
                  }
                >
                  {busy === "archive" ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <HardDrive className="mr-1.5 h-4 w-4" />
                  )}
                  Back up clips
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => void onRestoreMedia()}
                  disabled={
                    !!busy ||
                    !agent.connected ||
                    archiveSummary.restorable === 0 ||
                    !diskGates.editDiskReady ||
                    !diskGates.archiveDiskReady
                  }
                >
                  {busy === "restore" ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <FolderOpen className="mr-1.5 h-4 w-4" />
                  )}
                  Bring back to this PC
                </Button>
              </div>
              <p className="text-xs text-slate-500">
                Backup makes a checked copy on your drive. Bring back copies files into the project
                again if you removed them.
              </p>
            </div>

            {archiveSummary.archived > 0 ? (
              <details className="rounded-2xl border border-amber-100 bg-amber-50/50 px-4 py-3">
                <summary className="cursor-pointer text-sm font-semibold text-amber-950">
                  3. Free space on this PC (optional)
                </summary>
                <div className="mt-3 space-y-3">
                  <p className="text-sm text-amber-950/90">
                    Only deletes project copies that are already backed up. Your backup stays safe.
                    Camera cards are never touched.
                  </p>
                  {archiveSummary.reclaimable === 0 ? (
                    <p className="text-xs text-amber-900/70">
                      Nothing to free right now - either everything is already only on backup, or
                      backup isn't finished.
                    </p>
                  ) : (
                    <>
                      <p className="text-xs text-amber-900/80">
                        Type{" "}
                        <span className="font-mono font-medium">
                          {SAFE_DELETE_CONFIRM_PHRASE}
                        </span>{" "}
                        to confirm ({archiveSummary.reclaimable} clip
                        {archiveSummary.reclaimable === 1 ? "" : "s"}).
                      </p>
                      <input
                        className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm"
                        value={reclaimConfirm}
                        onChange={(e) => setReclaimConfirm(e.target.value)}
                        placeholder={SAFE_DELETE_CONFIRM_PHRASE}
                        disabled={!!busy}
                      />
                      <Button
                        variant="secondary"
                        onClick={() => void onReclaimActive()}
                        disabled={
                          !!busy ||
                          !agent.connected ||
                          reclaimConfirm.trim() !== SAFE_DELETE_CONFIRM_PHRASE ||
                          !diskGates.editDiskReady
                        }
                      >
                        {busy === "reclaim" ? (
                          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                        ) : null}
                        Free space on this PC
                      </Button>
                    </>
                  )}
                </div>
              </details>
            ) : null}
          </div>
        </CardBody>
      </Card>

      {/* Step 12 — V3 feedback */}
      <Card id="ai-step-12">
        <CardBody className="space-y-5">
          <div className="flex items-start gap-3">
            <StepBadge n={stepNo.wrap_up} done={step12Done} />
            <div>
              <h2 className="text-lg font-semibold text-slate-900">How did finishing go?</h2>
              <p className="mt-1 text-sm text-slate-600">
                Tell us what happened in Resolve so the next edit starts closer to what you like.
              </p>
            </div>
          </div>
          <div className="space-y-5 pl-10">
            <div className="grid gap-2 sm:grid-cols-3">
              {FEEDBACK_OUTCOMES.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setFeedbackOutcome(o.id)}
                  className={`rounded-2xl border px-3 py-3 text-left transition ${
                    feedbackOutcome === o.id
                      ? "border-sky-300 bg-sky-50 shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="font-semibold text-slate-900">{o.label}</div>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">{o.blurb}</p>
                </button>
              ))}
            </div>
            <p className="text-sm text-slate-600">
              We'll remember the look selected above:{" "}
              <span className="font-medium text-slate-800">
                {MOOD_PRESETS.find((m) => m.id === moodId)?.label} -{" "}
                {TRANSITION_PRESETS.find((t) => t.id === transitionStyle)?.label}
              </span>
            </p>
            <div>
              <label className="text-sm font-medium text-slate-800" htmlFor="feedback-note">
                Anything to remember? (optional)
              </label>
              <textarea
                id="feedback-note"
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
                rows={2}
                value={feedbackNote}
                onChange={(e) => setFeedbackNote(e.target.value)}
                placeholder="e.g. Keep it warmer next time, fewer dissolves..."
                disabled={!!busy}
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={() => void onSaveFeedback()} disabled={!!busy}>
                {busy === "feedback" ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-1.5 h-4 w-4" />
                )}
                Save for next time
              </Button>
              {feedbackSummary ? (
                <span className="text-sm text-slate-600">
                  Last saved: <span className="font-medium text-slate-800">{feedbackSummary}</span>
                </span>
              ) : (
                <span className="text-sm text-slate-500">Optional - skip if you're not done yet.</span>
              )}
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Clips */}
      <Card>
        <CardBody className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-slate-900">Your clips</h2>
            <Button variant="ghost" size="sm" onClick={() => void load()} disabled={!!busy}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Refresh
            </Button>
          </div>
          <p className="text-xs text-slate-500">
            FX3 originals in{" "}
            <span className="font-mono">01_ORIGINAL_MEDIA</span> often won’t play in Windows Media
            Player. Use <span className="font-medium text-slate-700">Watch</span> here (builds a
            light preview) or open them in Resolve / VLC.
          </p>

          {(() => {
            const clips = media.filter((m) => {
              const mt = (m.mediaType || "").toLowerCase();
              if (mt === "image" || mt === "still") return false;
              if (/\.jpe?g$/i.test(m.filename)) return false;
              return isIngestableMediaExtension(m.filename) || mt === "video" || mt === "audio";
            });
            if (clips.length === 0) {
              return (
                <p className="text-sm text-slate-500">
                  Nothing here yet - finish steps 1-3 to bring clips in.
                </p>
              );
            }
            return (
            <ul className="divide-y divide-slate-100">
              {clips.map((m) => {
                const needsPrep = assetNeedsBrowserProxy(m);
                const ready = !needsPrep;
                const canPlay = Boolean(playbackPathForAsset(m));
                return (
                  <li key={m.id} className="flex items-center gap-3 py-3">
                    <button
                      type="button"
                      className="relative shrink-0 disabled:opacity-50"
                      disabled={!canPlay || !agent.connected || !!busy}
                      onClick={() => previewClipAsset(m)}
                      title={
                        !canPlay
                          ? "No local path"
                          : needsPrep
                            ? "Watch may fail until you Prepare clips (Step 4)"
                            : "Watch clip"
                      }
                    >
                      {m.thumbnailDataUrl ? (
                        <img
                          src={m.thumbnailDataUrl}
                          alt=""
                          className="h-12 w-20 rounded-lg object-cover bg-slate-100"
                        />
                      ) : (
                        <div className="flex h-12 w-20 items-center justify-center rounded-lg bg-slate-100 text-[10px] text-slate-400">
                          No still
                        </div>
                      )}
                      {canPlay ? (
                        <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/25 text-white">
                          <Play className="h-4 w-4 fill-current" />
                        </span>
                      ) : null}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-slate-900">{m.filename}</div>
                      <div className="truncate text-xs text-slate-500">
                        {[
                          m.cameraAssignment?.replace(/_/g, " "),
                          m.codecLabel || m.codec,
                          m.resolution,
                          m.ingestStatus === "verified" ? "verified copy" : null,
                          m.archivePath ? "archived" : null,
                          m.frameRate ? `${Math.round(m.frameRate)} fps` : null,
                        ]
                          .filter(Boolean)
                          .join(" - ") || m.mediaType}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <Badge variant={ready ? "success" : "warning"}>
                        {ready ? "Ready" : "Needs prep"}
                      </Badge>
                      {canPlay ? (
                        <button
                          type="button"
                          className="text-xs text-sky-800 underline disabled:opacity-50"
                          disabled={!agent.connected || !!busy}
                          onClick={() => previewClipAsset(m)}
                        >
                          Watch
                        </button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
            );
          })()}
        </CardBody>
      </Card>

      {jobs.length > 0 ? (
        <details className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-600">
          <summary className="cursor-pointer font-medium text-slate-800">
            Recent activity ({jobs.length})
          </summary>
          <ul className="mt-3 space-y-2">
            {jobs.slice(0, 8).map((j) => (
              <li key={j.id} className="flex flex-wrap gap-2 text-xs">
                <Badge variant="default">{j.status}</Badge>
                <span>{j.message || j.type}</span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      <p className="text-center text-xs text-slate-400">
        <Link href={`/projects/${projectId}`} className="underline">
          Back to project
        </Link>
        {storage[0] ? ` - Workspace on this PC` : null}
      </p>
    </div>
  );
}
