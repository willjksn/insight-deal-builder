import { authHeaders } from "@/lib/scriptWriter/apiClient";
import type { ClipAnalysisBundle } from "@/lib/aiEditor/analysis";
import type {
  AgentSession,
  AiEditorJob,
  AiEditorProjectSettings,
  CoverageReport,
  FinishingFeedback,
  FinishingFeedbackOutcome,
  FinishingMoodId,
  ManagedIngestSummary,
  MediaAsset,
  EditNote,
  NextShootChecklist,
  PlanningFeedback,
  ResolveSyncSnapshot,
  PreferredTakeOverride,
  ProductionContext,
  StorageLocation,
  StoragePurpose,
  StorageType,
  Timeline,
  TimelineEditOp,
  TimelineVersion,
  TransitionStyleId,
} from "@/lib/aiEditor/types";

type GetToken = () => Promise<string | null>;

async function parseJson<T>(res: Response): Promise<T> {
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? res.statusText);
  return data;
}

export type AiEditorSessionListItem = {
  id: string;
  projectName: string;
  status: string;
  updatedAt?: unknown;
  createdAt?: unknown;
};

export async function aiEditorListSessions(getToken: GetToken) {
  const res = await fetch("/api/ai-editor/sessions", {
    headers: await authHeaders(getToken),
  });
  return parseJson<{ sessions: AiEditorSessionListItem[] }>(res);
}

export type AiEditorRecommendation = {
  id: string;
  priority: "high" | "medium" | "low";
  category: string;
  title: string;
  detail: string;
  href?: string;
  projectId?: string;
  projectName?: string;
};

export type AiEditorOrgInsights = {
  enabled: boolean;
  optedIn: boolean;
  company: string | null;
  contributorCount: number;
  projectCount: number;
  withDataCount: number;
  insights: Array<{ id: string; text: string; weight: number }>;
};

export async function aiEditorCrossProjectInsights(getToken: GetToken) {
  const res = await fetch("/api/ai-editor/insights", {
    headers: await authHeaders(getToken),
  });
  return parseJson<{
    ok: true;
    projectCount: number;
    withDataCount: number;
    insights: Array<{ id: string; text: string; weight: number }>;
    recommendations: AiEditorRecommendation[];
    lookDefaults: {
      moodId: FinishingMoodId;
      transitionStyle: TransitionStyleId;
      weight: number;
      hint: string;
    } | null;
    org: AiEditorOrgInsights;
  }>(res);
}

export async function aiEditorSetOrgAnalyticsOptIn(
  getToken: GetToken,
  enabled: boolean
) {
  const res = await fetch("/api/ai-editor/org-analytics", {
    method: "PATCH",
    headers: await authHeaders(getToken),
    body: JSON.stringify({ enabled }),
  });
  return parseJson<{
    ok: true;
    enabled: boolean;
    company: string | null;
    at: string;
  }>(res);
}

export async function aiEditorCreateSession(getToken: GetToken, name: string) {
  const res = await fetch("/api/ai-editor/sessions", {
    method: "POST",
    headers: await authHeaders(getToken),
    body: JSON.stringify({ name }),
  });
  return parseJson<{ ok: true; id: string; projectId: string; projectName: string }>(res);
}

export async function aiEditorRenameSession(
  getToken: GetToken,
  projectId: string,
  name: string
) {
  const res = await fetch("/api/ai-editor/sessions", {
    method: "PATCH",
    headers: await authHeaders(getToken),
    body: JSON.stringify({ projectId, name }),
  });
  return parseJson<{ ok: true; projectId: string; projectName: string }>(res);
}

export async function aiEditorLaunchAgent(
  getToken: GetToken,
  opts?: { restart?: boolean }
) {
  const res = await fetch("/api/ai-editor/agent/launch", {
    method: "POST",
    headers: await authHeaders(getToken),
    body: JSON.stringify({ restart: Boolean(opts?.restart) }),
  });
  return parseJson<{
    ok: true;
    alreadyRunning?: boolean;
    started?: boolean;
    restarted?: boolean;
    baseUrl?: string;
  }>(res);
}

export async function aiEditorPatchMedia(
  getToken: GetToken,
  projectId: string,
  patches: Array<{ id: string } & Partial<MediaAsset>>
) {
  const res = await fetch(`/api/projects/${projectId}/ai-editor/media/patch`, {
    method: "POST",
    headers: await authHeaders(getToken),
    body: JSON.stringify({ patches }),
  });
  return parseJson<{ ok: true; count: number }>(res);
}

export async function aiEditorGetContext(getToken: GetToken, projectId: string) {
  const res = await fetch(`/api/projects/${projectId}/ai-editor/context`, {
    headers: await authHeaders(getToken),
  });
  return parseJson<{ context: ProductionContext }>(res);
}

export async function aiEditorGetDashboard(getToken: GetToken, projectId: string) {
  const res = await fetch(`/api/projects/${projectId}/ai-editor`, {
    headers: await authHeaders(getToken),
  });
  return parseJson<{
    settings: AiEditorProjectSettings | null;
    storage: StorageLocation[];
    media: MediaAsset[];
    jobs: AiEditorJob[];
    context: ProductionContext;
    analysis: ClipAnalysisBundle[];
    coverage: CoverageReport | null;
    timeline: Timeline | null;
    timelineVersions: TimelineVersion[];
    timelineSummary: {
      durationSeconds: number;
      durationTimecode: string;
      clipCount: number;
      version: number;
    } | null;
  }>(res);
}

export async function aiEditorRunMatch(
  getToken: GetToken,
  projectId: string,
  overrides?: PreferredTakeOverride[]
) {
  const res = await fetch(`/api/projects/${projectId}/ai-editor/match`, {
    method: "POST",
    headers: await authHeaders(getToken),
    body: JSON.stringify({ overrides }),
  });
  return parseJson<{ ok: true; coverage: CoverageReport; job: AiEditorJob }>(res);
}

export async function aiEditorGetTimeline(getToken: GetToken, projectId: string) {
  const res = await fetch(`/api/projects/${projectId}/ai-editor/timeline`, {
    headers: await authHeaders(getToken),
  });
  return parseJson<{
    timeline: Timeline | null;
    versions: TimelineVersion[];
    summary: {
      durationSeconds: number;
      durationTimecode: string;
      clipCount: number;
      version: number;
    } | null;
  }>(res);
}

export async function aiEditorTimelineAction(
  getToken: GetToken,
  projectId: string,
  body: {
    action:
      | "build_rough_cut"
      | "apply_ops"
      | "restore_version"
      | "apply_finishing"
      | "setup_feature_reels"
      | "set_active_reel"
      | "import_resolve_cut"
      | "strip_non_video";
    ops?: TimelineEditOp[];
    versionId?: string;
    note?: string;
    name?: string;
    moodId?: FinishingMoodId;
    transitionStyle?: TransitionStyleId;
    reelId?: string;
    reelMode?: "acts" | "reels";
    runtimeSeconds?: number;
    reelCount?: number;
    resolveSnapshot?: ResolveSyncSnapshot;
  }
) {
  const res = await fetch(`/api/projects/${projectId}/ai-editor/timeline`, {
    method: "POST",
    headers: await authHeaders(getToken),
    body: JSON.stringify(body),
  });
  return parseJson<{
    ok: true;
    timeline: Timeline;
    versions: TimelineVersion[];
    summary: {
      durationSeconds: number;
      durationTimecode: string;
      clipCount: number;
      version: number;
    };
    job: AiEditorJob;
    importMeta?: {
      matched: number;
      unmatchedNames: string[];
      summary: string;
    };
  }>(res);
}

export type ChatEditProposalClient = {
  summary: string;
  ops: TimelineEditOp[];
  confidence: number;
  source: "rules" | "gemini";
  warnings: string[];
  action?: "undo";
};

export async function aiEditorChatEdit(
  getToken: GetToken,
  projectId: string,
  body: {
    message?: string;
    apply?: boolean;
    reelId?: string | null;
    /** Approved proposal — apply these ops without re-proposing. */
    proposal?: ChatEditProposalClient;
  }
) {
  const res = await fetch(`/api/projects/${projectId}/ai-editor/chat-edit`, {
    method: "POST",
    headers: await authHeaders(getToken),
    body: JSON.stringify(body),
  });
  return parseJson<{
    ok: true;
    applied?: boolean;
    proposal: ChatEditProposalClient;
    descriptions?: string[];
    validation?: { ok: boolean; errors: string[]; warnings: string[] };
    scope?: {
      reelName?: string | null;
      truncated?: boolean;
      totalInReel?: number;
    };
    timeline?: Timeline;
    versions?: TimelineVersion[];
    job?: AiEditorJob;
  }>(res);
}

export async function aiEditorExportResolve(getToken: GetToken, projectId: string) {
  const res = await fetch(`/api/projects/${projectId}/ai-editor/export-resolve`, {
    method: "POST",
    headers: await authHeaders(getToken),
    body: JSON.stringify({}),
  });
  return parseJson<{
    ok: true;
    job: AiEditorJob;
    summary: {
      clipCount: number;
      durationTimecode: string;
      durationSeconds: number;
      mediaCount: number;
    };
    files: Record<string, string>;
    projectRootPath?: string | null;
    handoffRelativeDir?: string;
  }>(res);
}

export async function aiEditorSaveFeedback(
  getToken: GetToken,
  projectId: string,
  body: {
    moodId: FinishingMoodId;
    transitionStyle: TransitionStyleId;
    outcome: FinishingFeedbackOutcome;
    note?: string;
  }
) {
  const res = await fetch(`/api/projects/${projectId}/ai-editor/feedback`, {
    method: "POST",
    headers: await authHeaders(getToken),
    body: JSON.stringify(body),
  });
  return parseJson<{
    ok: true;
    feedback: FinishingFeedback;
    settings: AiEditorProjectSettings;
    job: AiEditorJob;
  }>(res);
}

export async function aiEditorSaveEditNotes(
  getToken: GetToken,
  projectId: string,
  body: { notes: EditNote[] }
) {
  const res = await fetch(`/api/projects/${projectId}/ai-editor/edit-notes`, {
    method: "POST",
    headers: await authHeaders(getToken),
    body: JSON.stringify(body),
  });
  return parseJson<{
    ok: true;
    notes: EditNote[];
    settings: AiEditorProjectSettings;
    job: AiEditorJob;
  }>(res);
}

export async function aiEditorSaveResolveSync(
  getToken: GetToken,
  projectId: string,
  body: { snapshot: ResolveSyncSnapshot }
) {
  const res = await fetch(`/api/projects/${projectId}/ai-editor/resolve-sync`, {
    method: "POST",
    headers: await authHeaders(getToken),
    body: JSON.stringify(body),
  });
  return parseJson<{
    ok: true;
    sync: ResolveSyncSnapshot;
    planning: PlanningFeedback;
    checklist: NextShootChecklist;
    settings: AiEditorProjectSettings;
    job: AiEditorJob;
  }>(res);
}

export async function aiEditorNextShootChecklist(
  getToken: GetToken,
  projectId: string,
  body: { itemId?: string; done?: boolean; rebuild?: boolean }
) {
  const res = await fetch(
    `/api/projects/${projectId}/ai-editor/next-shoot-checklist`,
    {
      method: "POST",
      headers: await authHeaders(getToken),
      body: JSON.stringify(body),
    }
  );
  return parseJson<{
    ok: true;
    checklist: NextShootChecklist;
    settings: AiEditorProjectSettings;
    job: AiEditorJob;
  }>(res);
}

export async function aiEditorBoardHandoff(
  getToken: GetToken,
  projectId: string,
  body?: { includeDone?: boolean }
) {
  const res = await fetch(`/api/projects/${projectId}/ai-editor/board-handoff`, {
    method: "POST",
    headers: await authHeaders(getToken),
    body: JSON.stringify(body ?? {}),
  });
  return parseJson<{
    ok: true;
    boardId: string;
    openCount: number;
    filmingNotes: string;
    settings: AiEditorProjectSettings;
    job: AiEditorJob;
  }>(res);
}

export async function aiEditorLogResolveOpen(
  getToken: GetToken,
  projectId: string,
  body: {
    message: string;
    launched?: boolean;
    handoffDir?: string;
    type?: "resolve_open" | "resolve_import";
  }
) {
  const res = await fetch(`/api/projects/${projectId}/ai-editor/jobs`, {
    method: "POST",
    headers: await authHeaders(getToken),
    body: JSON.stringify({
      type: body.type || "resolve_open",
      message: body.message,
      launched: body.launched,
      handoffDir: body.handoffDir,
    }),
  });
  return parseJson<{ ok: true; job: AiEditorJob }>(res);
}

/** Thin IngestSession stub — log one managed ingest + persist lastManagedIngest. */
export async function aiEditorLogManagedIngest(
  getToken: GetToken,
  projectId: string,
  body: {
    ingestSummary: ManagedIngestSummary;
    message?: string;
  }
) {
  const res = await fetch(`/api/projects/${projectId}/ai-editor/jobs`, {
    method: "POST",
    headers: await authHeaders(getToken),
    body: JSON.stringify({
      type: "ingest_copy",
      ingestSummary: body.ingestSummary,
      message: body.message,
    }),
  });
  return parseJson<{
    ok: true;
    job: AiEditorJob;
    settings: AiEditorProjectSettings;
  }>(res);
}

export async function aiEditorArchiveAction(
  getToken: GetToken,
  projectId: string,
  body:
    | { action: "plan"; archiveRootPath?: string }
    | { action: "set_root"; archiveRootPath: string }
    | {
        action: "log";
        type: "archive" | "restore" | "reclaim";
        message?: string;
        count?: number;
        mediaIds?: string[];
      }
) {
  const res = await fetch(`/api/projects/${projectId}/ai-editor/archive`, {
    method: "POST",
    headers: await authHeaders(getToken),
    body: JSON.stringify(body),
  });
  return parseJson<{
    ok: true;
    settings?: AiEditorProjectSettings;
    job?: AiEditorJob;
    summary?: {
      total: number;
      withLocalSource: number;
      archived: number;
      reclaimable: number;
      restorable: number;
    };
    archiveRootPath?: string | null;
    projectRootPath?: string | null;
    archive?: {
      items: Array<{
        mediaAssetId: string;
        filename: string;
        sourcePath: string;
        destPath: string;
        relativeArchivePath: string;
      }>;
      skipped: Array<{ mediaAssetId: string; filename: string; reason: string }>;
    };
    restore?: {
      items: Array<{
        mediaAssetId: string;
        filename: string;
        sourcePath: string;
        destPath: string;
        relativeArchivePath: string;
      }>;
      skipped: Array<{ mediaAssetId: string; filename: string; reason: string }>;
    };
  }>(res);
}

export async function aiEditorSaveAnalysis(
  getToken: GetToken,
  projectId: string,
  results: Array<{
    mediaAssetId: string;
    technical?: ClipAnalysisBundle["technical"];
    shots?: ClipAnalysisBundle["shots"];
    transcript?: ClipAnalysisBundle["transcript"];
    error?: string;
  }>
) {
  const res = await fetch(`/api/projects/${projectId}/ai-editor/analyze`, {
    method: "POST",
    headers: await authHeaders(getToken),
    body: JSON.stringify({ results }),
  });
  return parseJson<{ ok: true; analysis: ClipAnalysisBundle[]; job: AiEditorJob }>(res);
}

export async function aiEditorSaveStorage(
  getToken: GetToken,
  projectId: string,
  body: {
    name: string;
    path: string;
    purpose: StoragePurpose;
    type?: StorageType;
    setAsActive?: boolean;
    projectRootName?: string;
    volumeIdentifier?: string;
    capacityBytes?: number;
    availableBytes?: number;
  }
) {
  const res = await fetch(`/api/projects/${projectId}/ai-editor/storage`, {
    method: "POST",
    headers: await authHeaders(getToken),
    body: JSON.stringify(body),
  });
  return parseJson<{
    storage: StorageLocation;
    settings: AiEditorProjectSettings;
  }>(res);
}

export async function aiEditorMintAgentSession(getToken: GetToken, projectId: string) {
  const res = await fetch(`/api/projects/${projectId}/ai-editor/agent/session`, {
    method: "POST",
    headers: await authHeaders(getToken),
    body: JSON.stringify({}),
  });
  return parseJson<{ session: AgentSession }>(res);
}

export async function aiEditorIndexMedia(
  getToken: GetToken,
  projectId: string,
  body: {
    files: Array<{
      path: string;
      filename: string;
      sizeBytes?: number;
      relativeProjectPath?: string;
      probe?: Partial<MediaAsset>;
    }>;
    ingestMode?: "managed" | "existing_folder" | "in_place";
  }
) {
  const res = await fetch(`/api/projects/${projectId}/ai-editor/media`, {
    method: "POST",
    headers: await authHeaders(getToken),
    body: JSON.stringify(body),
  });
  return parseJson<{ media: MediaAsset[]; job: AiEditorJob }>(res);
}

export async function aiEditorCreateFoldersJob(
  getToken: GetToken,
  projectId: string,
  body: { cameraLabels?: string[] }
) {
  const res = await fetch(`/api/projects/${projectId}/ai-editor/jobs`, {
    method: "POST",
    headers: await authHeaders(getToken),
    body: JSON.stringify({ type: "create_folders", ...body }),
  });
  return parseJson<{
    job: AiEditorJob;
    folderPlan: string[];
    projectRootPath: string;
  }>(res);
}

export type ResolveAssistantStatus = {
  ready: boolean;
  manifest: {
    sourceName: string;
    pageCount: number;
    chunkCount: number;
    manualLabel: string;
  } | null;
  /** Local-dev only: show the py index command in the status banner. */
  showLocalIndexCommand?: boolean;
  indexHint: string;
};

export type ResolveAssistantChatResult = {
  answer: string;
  steps: string[];
  tips?: string[];
  citations: Array<{ page: number; excerpt: string; chunkId: string }>;
  mode: "manual_grounded" | "excerpts_only" | "index_missing";
  manualLabel: string | null;
  pageCount: number | null;
};

export async function aiEditorResolveAssistantStatus(getToken: GetToken) {
  const res = await fetch("/api/ai-editor/resolve-assistant", {
    headers: await authHeaders(getToken),
  });
  return parseJson<ResolveAssistantStatus>(res);
}

export async function aiEditorResolveAssistantChat(
  getToken: GetToken,
  body: {
    message: string;
    history?: Array<{ role: "user" | "assistant"; content: string }>;
    localOnly?: boolean;
  }
) {
  const res = await fetch("/api/ai-editor/resolve-assistant", {
    method: "POST",
    headers: await authHeaders(getToken),
    body: JSON.stringify(body),
  });
  return parseJson<{ result: ResolveAssistantChatResult }>(res);
}
