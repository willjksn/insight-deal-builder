"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Clapperboard,
  FolderOpen,
  HardDrive,
  Loader2,
  Monitor,
  Play,
  RefreshCw,
  Sparkles,
  Wifi,
  WifiOff,
} from "lucide-react";
import { FolderPicker } from "@/components/aiEditor/FolderPicker";
import { MediaPreview, type PreviewItem } from "@/components/aiEditor/MediaPreview";
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
  agentIndexFolder,
  agentIngestCopy,
  agentMediaStreamUrl,
  agentOpenResolve,
  agentProbe,
  agentRevealPath,
  agentSafeDelete,
  agentStorageStat,
  agentThumbnail,
  agentWriteResolveHandoff,
  checkAgentHealth,
  playbackPathForAsset,
} from "@/lib/aiEditor/agentClient";
import { RESOLVE_HANDOFF_REL_DIR } from "@/lib/aiEditor/resolveBridge";
import {
  canReclaimActiveCopy,
  SAFE_DELETE_CONFIRM_PHRASE,
  summarizeArchiveState,
} from "@/lib/aiEditor/archive";
import {
  MOOD_PRESETS,
  TRANSITION_PRESETS,
  summarizeFinishing,
} from "@/lib/aiEditor/finishing";
import type { FinishingMoodId, TransitionStyleId } from "@/lib/aiEditor/types";
import { framesToSeconds } from "@/lib/aiEditor/frames";
import type { ClipAnalysisBundle } from "@/lib/aiEditor/analysis";
import { formatBytes } from "@/lib/aiEditor/checksum";
import {
  aiEditorArchiveAction,
  aiEditorCreateFoldersJob,
  aiEditorGetDashboard,
  aiEditorIndexMedia,
  aiEditorLaunchAgent,
  aiEditorLogResolveOpen,
  aiEditorMintAgentSession,
  aiEditorPatchMedia,
  aiEditorRunMatch,
  aiEditorSaveAnalysis,
  aiEditorSaveStorage,
  aiEditorChatEdit,
  aiEditorExportResolve,
  aiEditorTimelineAction,
  type ChatEditProposalClient,
} from "@/lib/aiEditor/apiClient";
import { isAiEditorEnabled } from "@/lib/aiEditor/featureFlag";
import { mockMediaEngine } from "@/lib/aiEditor/mediaEngine";
import { summarizeMediaSafety } from "@/lib/aiEditor/mediaSafety";
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
  const [context, setContext] = useState<ProductionContext | null>(null);
  const [settings, setSettings] = useState<AiEditorProjectSettings | null>(null);
  const [storage, setStorage] = useState<StorageLocation[]>([]);
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [jobs, setJobs] = useState<AiEditorJob[]>([]);
  const [agent, setAgent] = useState<AgentStatus>({ connected: false });
  const [storagePath, setStoragePath] = useState("");
  const [indexFolderPath, setIndexFolderPath] = useState("");
  const [agentToken, setAgentToken] = useState<string | null>(null);
  const [statusNote, setStatusNote] = useState<string | null>(null);
  const [createProjectFolders, setCreateProjectFolders] = useState(true);
  const [addMode, setAddMode] = useState<"in_place" | "copy">("in_place");
  const [cameraLabel, setCameraLabel] = useState("CAMERA_A");
  const [prepareWhileCopying, setPrepareWhileCopying] = useState(true);
  const [diskNote, setDiskNote] = useState<string | null>(null);
  const [ingestQueue, setIngestQueue] = useState<IngestQueueItem[]>([]);
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
  } | null>(null);
  const [chatMessage, setChatMessage] = useState("");
  const [chatProposal, setChatProposal] = useState<{
    proposal: ChatEditProposalClient;
    descriptions: string[];
    validationOk: boolean;
    validationErrors: string[];
  } | null>(null);
  const [exportFiles, setExportFiles] = useState<Record<string, string> | null>(null);
  const [handoffDirOnDisk, setHandoffDirOnDisk] = useState<string | null>(null);
  const [finishWhere, setFinishWhere] = useState<"here" | "mac">("here");
  const [moodId, setMoodId] = useState<FinishingMoodId>("natural");
  const [transitionStyle, setTransitionStyle] = useState<TransitionStyleId>("cuts");
  const [archivePath, setArchivePath] = useState("");
  const [reclaimConfirm, setReclaimConfirm] = useState("");

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
      if (dash.timeline?.finishing?.moodId) {
        setMoodId(dash.timeline.finishing.moodId);
      }
      if (dash.timeline?.finishing?.transitionStyle) {
        setTransitionStyle(dash.timeline.finishing.transitionStyle);
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
    if (agentToken) return agentToken;
    const { session } = await aiEditorMintAgentSession(getToken, projectId);
    setAgentToken(session.token);
    return session.token;
  }, [agentToken, getToken, projectId]);

  const needsPrepare = useMemo(
    () => media.filter((m) => m.needsProxy && !m.proxyPath && m.currentPath),
    [media]
  );
  const preparedCount = useMemo(
    () => media.filter((m) => m.proxyPath || !m.needsProxy).length,
    [media]
  );
  const safety = useMemo(() => summarizeMediaSafety(media), [media]);
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

  const step1Done = agent.connected && agent.ffmpegAvailable !== false;
  const step2Done = Boolean(settings?.projectRootPath);
  const step3Done = media.length > 0;
  const step4Done = media.length > 0 && needsPrepare.length === 0;
  const step5Done = media.length > 0 && analyzedCount > 0;
  const step6Done = Boolean(coverage && coverage.updatedAt);
  const step7Done = Boolean(timeline && timeline.tracks.some((t) => t.clips.length));
  const step8Done = Boolean(timeline && timeline.version > 1);
  const step9Done = Boolean(timeline?.finishing);
  const step10Done = Boolean(handoffDirOnDisk);
  const archiveSummary = useMemo(
    () => summarizeArchiveState(media, settings?.projectRootPath),
    [media, settings?.projectRootPath]
  );
  const step11Done = archiveSummary.archived > 0;
  const finishingSummary = summarizeFinishing(timeline?.finishing);
  const videoTrack = timeline?.tracks.find((t) => t.kind === "video");

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
        setStatusNote("Restarting connection…");
      }
      await aiEditorLaunchAgent(getToken, { restart });
      const after = await checkAgentHealth();
      setAgent(after);
      if (after.connected) {
        if (after.ffmpegAvailable === false) {
          setError("Connected, but video tools are missing. Install FFmpeg, then Restart.");
        } else {
          setStatusNote(restart ? "Reconnected and ready." : "Connected and ready.");
        }
      } else {
        throw new Error("Could not connect. Try Restart, or run desktop-agent/start-agent.cmd");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not connect this computer");
    } finally {
      setBusy(null);
    }
  }

  async function onSaveWorkspace() {
    if (!storagePath.trim()) return;
    setBusy("storage");
    setStatusNote(null);
    setError(null);
    try {
      const res = await aiEditorSaveStorage(getToken, projectId, {
        name: context?.projectName || "Edit workspace",
        path: storagePath.trim(),
        purpose: "active",
        type: "internal",
        setAsActive: true,
      });
      setSettings(res.settings);
      setStorage((prev) => {
        const others = prev.filter((s) => s.id !== res.storage.id);
        return [...others, res.storage];
      });
      const root = res.settings.projectRootPath || storagePath.trim();
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
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save workspace");
    } finally {
      setBusy(null);
    }
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

  async function onIndexFolder() {
    const folder = indexFolderPath.trim() || settings?.projectRootPath || "";
    if (!folder) return;
    setBusy("index");
    setStatusNote(null);
    setDiskNote(null);
    setError(null);
    try {
      const health = await checkAgentHealth();
      setAgent(health);
      if (!health.connected) throw new Error("Connect this computer first, then add footage.");

      const token = await ensureAgentSession();
      const indexed = await agentIndexFolder(DEFAULT_AGENT_BASE_URL, token, folder, true);
      if (!indexed.files.length) {
        setStatusNote("No video or audio files found in that folder.");
        return;
      }

      // In-place: catalog where files already are
      if (addMode === "in_place") {
        const files = await probeIndexedFiles(token, indexed.files);
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

      // Managed copy for a single camera assignment (also used by queue runner)
      await runManagedCopy({
        token,
        sourceFiles: indexed.files,
        camera: cameraLabel,
        prepare: prepareWhileCopying,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add footage");
    } finally {
      setBusy(null);
      setProgress(null);
    }
  }

  async function runManagedCopy(opts: {
    token: string;
    sourceFiles: Array<{ path: string; filename: string; sizeBytes: number }>;
    camera: string;
    prepare: boolean;
  }) {
    const projectRoot = settings?.projectRootPath?.trim();
    if (!projectRoot) {
      throw new Error("Save a project workspace folder first (step 2), then copy footage into it.");
    }

    const batch = opts.sourceFiles.slice(0, 80);
    const requiredBytes = batch.reduce((sum, f) => sum + (f.sizeBytes || 0), 0);
    try {
      const space = await agentStorageStat(DEFAULT_AGENT_BASE_URL, opts.token, projectRoot);
      if (space.availableBytes != null) {
        setDiskNote(
          `${formatBytes(requiredBytes)} to copy · ${formatBytes(space.availableBytes)} free on destination`
        );
      }
    } catch {
      /* optional */
    }

    const chunkSize = 1;
    const allResults: Array<{
      path: string;
      filename: string;
      sizeBytes?: number;
      relativeProjectPath?: string;
      probe?: Partial<MediaAsset>;
    }> = [];

    for (let i = 0; i < batch.length; i += chunkSize) {
      const slice = batch.slice(i, i + chunkSize);
      const pct = Math.round(((i + slice.length) / batch.length) * 100);
      setProgress({
        pct,
        label: `Copying & verifying ${i + 1}–${Math.min(i + slice.length, batch.length)} of ${batch.length} → ${opts.camera.replace(/_/g, " ")}`,
      });
      const copied = await agentIngestCopy(DEFAULT_AGENT_BASE_URL, opts.token, {
        projectRoot,
        cameraLabel: opts.camera,
        files: slice.map((f) => ({
          sourcePath: f.path,
          filename: f.filename,
          sizeBytes: f.sizeBytes,
        })),
        generateProxies: opts.prepare,
      });

      for (const r of copied.results) {
        let probe: Partial<MediaAsset> = {
          checksum: r.checksum,
          checksumAlgorithm: "sha256",
          cameraAssignment: r.cameraAssignment,
          relativeProjectPath: r.relativeProjectPath,
          proxyPath: r.proxyPath,
          sizeBytes: r.sizeBytes,
          needsProxy: true,
        };
        try {
          const probed = await agentProbe(DEFAULT_AGENT_BASE_URL, opts.token, r.destPath);
          probe = { ...probe, ...(probed.probe as Partial<MediaAsset>) };
          if (r.proxyPath) probe.proxyPath = r.proxyPath;
        } catch {
          probe = { ...probe, ...(await mockMediaEngine.probe(r.destPath)) };
        }
        allResults.push({
          path: r.destPath,
          filename: r.filename,
          sizeBytes: r.sizeBytes,
          relativeProjectPath: r.relativeProjectPath,
          probe,
        });
      }
    }

    setProgress({ pct: 100, label: "Saving clip records…" });
    const res = await aiEditorIndexMedia(getToken, projectId, {
      files: allResults,
      ingestMode: "managed",
    });
    setMedia((prev) => {
      const byId = new Map(prev.map((m) => [m.id, m]));
      for (const m of res.media) byId.set(m.id, m);
      return [...byId.values()].sort((a, b) => a.filename.localeCompare(b.filename));
    });
    setJobs((prev) => [res.job as AiEditorJob, ...prev]);
    setStatusNote(
      `Copied and verified ${res.media.length} clip(s) into ${opts.camera.replace(/_/g, " ")}. Camera cards are never erased by ShootSpine.`
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
    setBusy("index");
    setError(null);
    setStatusNote(null);
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
        if (!indexed.files.length) continue;
        await runManagedCopy({
          token,
          sourceFiles: indexed.files,
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

  async function onAnalyzeFootage() {
    const targets = media.filter((m) => m.currentPath).slice(0, 40);
    if (!targets.length) {
      setStatusNote("Add footage first.");
      return;
    }
    setBusy("analyze");
    setError(null);
    setStatusNote(null);
    try {
      const health = await checkAgentHealth();
      setAgent(health);
      if (!health.connected) throw new Error("Connect this computer first");
      if (runTranscription && health.whisperAvailable === false) {
        setStatusNote(
          "Transcription requested but Whisper isn’t installed — continuing with technical + shot detection only."
        );
      }
      const token = await ensureAgentSession();
      const results = [];
      for (let i = 0; i < targets.length; i++) {
        const m = targets[i];
        setProgress({
          pct: Math.round(((i + 1) / targets.length) * 100),
          label: `Understanding clip ${i + 1}/${targets.length}: ${m.filename}`,
        });
        try {
          const analyzed = await agentAnalyze(DEFAULT_AGENT_BASE_URL, token, m.currentPath!, {
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
      const saved = await aiEditorSaveAnalysis(getToken, projectId, results);
      setAnalysis(saved.analysis);
      setJobs((prev) => [saved.job, ...prev]);
      await load();
      setStatusNote(
        `Analyzed ${saved.analysis.length} clip(s): technical checks + shot breaks` +
          (runTranscription ? " + transcript where available" : "") +
          "."
      );
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
      setStatusNote(
        res.coverage.plannedShotCount
          ? `Coverage: ${res.coverage.coveredCount} covered, ${res.coverage.partialCount} partial, ${res.coverage.missingCount} missing.`
          : "No planned shots on the board yet — matching saved for when coverage exists."
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Matching failed");
    } finally {
      setBusy(null);
    }
  }

  async function onPreferTake(plannedShotId: string, mediaAssetId: string) {
    setBusy("match");
    setError(null);
    try {
      const overrides = [
        ...(coverage?.overrides ?? []).filter((o) => o.plannedShotId !== plannedShotId),
        { plannedShotId, mediaAssetId },
      ];
      const res = await aiEditorRunMatch(getToken, projectId, overrides);
      setCoverage(res.coverage);
      setJobs((prev) => [res.job, ...prev]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not set preferred take");
    } finally {
      setBusy(null);
    }
  }

  async function onBuildRoughCut() {
    setBusy("rough_cut");
    setError(null);
    setStatusNote(null);
    try {
      const res = await aiEditorTimelineAction(getToken, projectId, {
        action: "build_rough_cut",
        note: "Rough cut from preferred takes",
      });
      setTimeline(res.timeline);
      setTimelineVersions(res.versions);
      setJobs((prev) => [res.job, ...prev]);
      setStatusNote(
        `Rough cut v${res.summary.version}: ${res.summary.clipCount} clip placements · ${res.summary.durationTimecode}`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not build rough cut");
    } finally {
      setBusy(null);
    }
  }

  async function onRippleDeleteClip(clipId: string) {
    setBusy("rough_cut");
    setError(null);
    try {
      const res = await aiEditorTimelineAction(getToken, projectId, {
        action: "apply_ops",
        ops: [{ type: "rippleDelete", clipId }],
        note: "Ripple delete",
      });
      setTimeline(res.timeline);
      setTimelineVersions(res.versions);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Edit failed");
    } finally {
      setBusy(null);
    }
  }

  async function onRestoreVersion(versionId: string) {
    setBusy("rough_cut");
    setError(null);
    try {
      const res = await aiEditorTimelineAction(getToken, projectId, {
        action: "restore_version",
        versionId,
      });
      setTimeline(res.timeline);
      setTimelineVersions(res.versions);
      setStatusNote(`Restored timeline to a previous version (now v${res.summary.version}).`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Restore failed");
    } finally {
      setBusy(null);
    }
  }

  async function openPreview(title: string, items: PreviewItem[]) {
    if (!items.length) {
      setError("Nothing to play — clip has no local path on this PC.");
      return;
    }
    try {
      const health = await checkAgentHealth();
      setAgent(health);
      if (!health.connected) throw new Error("Connect this computer first to preview footage");
      const token = await ensureAgentSession();
      setPreview({ title, items, token });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open preview");
    }
  }

  function previewClipAsset(asset: MediaAsset) {
    const path = playbackPathForAsset(asset);
    if (!path) {
      setError("This clip has no path on this PC.");
      return;
    }
    void openPreview(asset.filename, [{ path, label: asset.filename }]);
  }

  function previewTimelineClip(clipId: string) {
    if (!timeline) return;
    const clip = videoTrack?.clips.find((c) => c.id === clipId);
    const asset = clip ? media.find((m) => m.id === clip.mediaAssetId) : undefined;
    const path = asset ? playbackPathForAsset(asset) : null;
    if (!clip || !path) {
      setError("Clip media isn’t available on this PC.");
      return;
    }
    const startSeconds = framesToSeconds(clip.sourceInFrame, timeline.frameRate);
    const endSeconds = startSeconds + framesToSeconds(clip.durationFrames, timeline.frameRate);
    void openPreview(clip.label || asset?.filename || "Timeline clip", [
      {
        path,
        label: clip.label || asset?.filename || clip.id,
        startSeconds,
        endSeconds,
      },
    ]);
  }

  function previewRoughCut() {
    if (!timeline || !videoTrack?.clips.length) return;
    const items: PreviewItem[] = [];
    for (const clip of videoTrack.clips) {
      const asset = media.find((m) => m.id === clip.mediaAssetId);
      const path = asset ? playbackPathForAsset(asset) : null;
      if (!path) continue;
      const startSeconds = framesToSeconds(clip.sourceInFrame, timeline.frameRate);
      const endSeconds = startSeconds + framesToSeconds(clip.durationFrames, timeline.frameRate);
      items.push({
        path,
        label: clip.label || asset?.filename || clip.id,
        startSeconds,
        endSeconds,
      });
    }
    void openPreview(`Rough cut v${timeline.version}`, items);
  }

  async function onChatPropose() {
    const message = chatMessage.trim();
    if (!message) return;
    setBusy("chat_edit");
    setError(null);
    setChatProposal(null);
    try {
      const res = await aiEditorChatEdit(getToken, projectId, { message, apply: false });
      setChatProposal({
        proposal: res.proposal,
        descriptions: res.descriptions ?? [],
        validationOk: res.validation?.ok ?? res.proposal.action === "undo",
        validationErrors: res.validation?.errors ?? [],
      });
      setStatusNote(res.proposal.summary);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not interpret edit");
    } finally {
      setBusy(null);
    }
  }

  async function onChatApply() {
    const message = chatMessage.trim();
    if (!message || !chatProposal) return;
    setBusy("chat_edit");
    setError(null);
    try {
      const res = await aiEditorChatEdit(getToken, projectId, { message, apply: true });
      if (res.timeline) setTimeline(res.timeline);
      if (res.versions) setTimelineVersions(res.versions);
      if (res.job) setJobs((prev) => [res.job!, ...prev]);
      setChatProposal(null);
      setChatMessage("");
      setStatusNote(res.proposal.summary + (res.timeline ? ` · now v${res.timeline.version}` : ""));
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
      if (res.timeline) setTimeline(res.timeline);
      if (res.versions) setTimelineVersions(res.versions);
      if (res.job) setJobs((prev) => [res.job!, ...prev]);
      setChatProposal(null);
      setStatusNote(res.proposal.summary + (res.timeline ? ` · now v${res.timeline.version}` : ""));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nothing to undo");
    } finally {
      setBusy(null);
    }
  }

  async function onApplyFinishing() {
    if (!timeline) {
      setError("Build a rough cut first");
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
      setTimelineVersions(res.versions);
      if (res.job) setJobs((prev) => [res.job, ...prev.filter((j) => j.id !== res.job.id)]);
      setStatusNote(
        `Saved: ${res.timeline.finishing?.moodLabel} look with ${res.timeline.finishing?.transitionLabel.toLowerCase()}. Resolve will use these as notes.`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save look");
    } finally {
      setBusy(null);
    }
  }

  async function ensureExportFiles(): Promise<{
    files: Record<string, string>;
    projectRootPath?: string | null;
  }> {
    if (exportFiles && Object.keys(exportFiles).length) {
      return { files: exportFiles, projectRootPath: settings?.projectRootPath };
    }
    const res = await aiEditorExportResolve(getToken, projectId);
    setExportFiles(res.files);
    setJobs((prev) => [res.job, ...prev.filter((j) => j.id !== res.job.id)]);
    return { files: res.files, projectRootPath: res.projectRootPath };
  }

  async function onWriteResolveHandoff() {
    setBusy("write-handoff");
    setError(null);
    setStatusNote(null);
    try {
      const health = await checkAgentHealth();
      setAgent(health);
      if (!health.connected) throw new Error("Desktop Agent not connected");
      const projectRoot = settings?.projectRootPath?.trim();
      if (!projectRoot) throw new Error("Set a project folder in step 2 first");
      const token = await ensureAgentSession();
      const { files } = await ensureExportFiles();
      const written = await agentWriteResolveHandoff(DEFAULT_AGENT_BASE_URL, token, {
        projectRoot,
        files,
        relativeDir: RESOLVE_HANDOFF_REL_DIR,
      });
      setHandoffDirOnDisk(written.handoffDir);
      const log = await aiEditorLogResolveOpen(getToken, projectId, {
        message: `Wrote Resolve handoff → ${written.handoffDir}`,
        launched: false,
        handoffDir: written.handoffDir,
      });
      setJobs((prev) => [log.job, ...prev.filter((j) => j.id !== log.job.id)]);
      setStatusNote(
        finishWhere === "mac"
          ? "Saved. Copy your project folder to the Mac, then open Resolve there."
          : "Saved with your project. Open Resolve when you’re ready."
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Write handoff failed");
    } finally {
      setBusy(null);
    }
  }

  async function onOpenInResolve() {
    setBusy("open-resolve");
    setError(null);
    setStatusNote(null);
    try {
      const health = await checkAgentHealth();
      setAgent(health);
      if (!health.connected) throw new Error("Desktop Agent not connected");
      const projectRoot = settings?.projectRootPath?.trim();
      if (!projectRoot) throw new Error("Set a project folder in step 2 first");
      const token = await ensureAgentSession();
      const { files } = await ensureExportFiles();
      const written = await agentWriteResolveHandoff(DEFAULT_AGENT_BASE_URL, token, {
        projectRoot,
        files,
        relativeDir: RESOLVE_HANDOFF_REL_DIR,
      });
      setHandoffDirOnDisk(written.handoffDir);
      const opened = await agentOpenResolve(DEFAULT_AGENT_BASE_URL, token, {
        projectRoot,
        handoffDir: written.handoffDir,
        launch: true,
        reveal: false,
      });
      const log = await aiEditorLogResolveOpen(getToken, projectId, {
        message: opened.message,
        launched: opened.launched,
        handoffDir: written.handoffDir,
      });
      setJobs((prev) => [log.job, ...prev.filter((j) => j.id !== log.job.id)]);
      setStatusNote(
        opened.launched
          ? opened.alreadyRunning
            ? "Resolve is already open — check your taskbar if you don’t see the window."
            : "Resolve is starting. It can take a minute — check your taskbar."
          : "Your edit is saved. Open Resolve from the Start menu if it didn’t appear."
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Open in Resolve failed");
    } finally {
      setBusy(null);
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
      const res = await aiEditorSaveStorage(getToken, projectId, {
        name: "Archive storage",
        path,
        purpose: "archive",
        setAsActive: false,
      });
      setSettings(res.settings);
      setStorage((prev) => {
        const rest = prev.filter((s) => s.id !== res.storage.id);
        return [res.storage, ...rest];
      });
      setArchivePath(res.settings.archiveRootPath || path);
      setStatusNote(`Archive root saved: ${res.settings.archiveRootPath || path}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save archive root");
    } finally {
      setBusy(null);
    }
  }

  async function onArchiveMedia() {
    setBusy("archive");
    setError(null);
    setStatusNote(null);
    setProgress({ pct: 5, label: "Planning archive…" });
    try {
      const health = await checkAgentHealth();
      setAgent(health);
      if (!health.connected) throw new Error("Desktop Agent not connected");
      const token = await ensureAgentSession();
      const plan = await aiEditorArchiveAction(getToken, projectId, {
        action: "plan",
        archiveRootPath: archivePath.trim() || undefined,
      });
      if (!plan.archive?.items.length) {
        setStatusNote(
          plan.archive?.skipped.length
            ? `Nothing to archive (${plan.archive.skipped.length} skipped).`
            : "Nothing to archive — set an archive folder and add clips first."
        );
        return;
      }
      setProgress({ pct: 20, label: `Copying ${plan.archive.items.length} file(s)…` });
      const batch = await agentCopyVerifiedBatch(
        DEFAULT_AGENT_BASE_URL,
        token,
        plan.archive.items.map((i) => ({
          id: i.mediaAssetId,
          sourcePath: i.sourcePath,
          destPath: i.destPath,
        }))
      );
      const byId = new Map(batch.results.map((r) => [r.id, r]));
      const patches = plan.archive.items
        .map((item) => {
          const r = byId.get(item.mediaAssetId);
          if (!r) return null;
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
      await aiEditorPatchMedia(getToken, projectId, patches);
      const log = await aiEditorArchiveAction(getToken, projectId, {
        action: "log",
        type: "archive",
        count: patches.length,
        mediaIds: patches.map((p) => p.id),
        message: `Archived ${patches.length} clip(s) with checksum verify`,
      });
      if (log.job) setJobs((prev) => [log.job!, ...prev]);
      setStatusNote(`Archived ${patches.length} clip(s). Camera cards were not touched.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Archive failed");
    } finally {
      setProgress(null);
      setBusy(null);
    }
  }

  async function onRestoreMedia() {
    setBusy("restore");
    setError(null);
    setStatusNote(null);
    setProgress({ pct: 5, label: "Planning restore…" });
    try {
      const health = await checkAgentHealth();
      setAgent(health);
      if (!health.connected) throw new Error("Desktop Agent not connected");
      const token = await ensureAgentSession();
      const plan = await aiEditorArchiveAction(getToken, projectId, { action: "plan" });
      if (!plan.restore?.items.length) {
        setStatusNote("Nothing to restore — active copies may already be present.");
        return;
      }
      setProgress({ pct: 20, label: `Restoring ${plan.restore.items.length} file(s)…` });
      const batch = await agentCopyVerifiedBatch(
        DEFAULT_AGENT_BASE_URL,
        token,
        plan.restore.items.map((i) => ({
          id: i.mediaAssetId,
          sourcePath: i.sourcePath,
          destPath: i.destPath,
        }))
      );
      const byId = new Map(batch.results.map((r) => [r.id, r]));
      const patches = plan.restore.items
        .map((item) => {
          const r = byId.get(item.mediaAssetId);
          if (!r) return null;
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
      await aiEditorPatchMedia(getToken, projectId, patches);
      const log = await aiEditorArchiveAction(getToken, projectId, {
        action: "log",
        type: "restore",
        count: patches.length,
        mediaIds: patches.map((p) => p.id),
        message: `Restored ${patches.length} clip(s) from archive`,
      });
      if (log.job) setJobs((prev) => [log.job!, ...prev]);
      setStatusNote(`Restored ${patches.length} clip(s) into the project folder.`);
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
    const projectRoot = settings?.projectRootPath?.trim();
    if (!projectRoot) {
      setError("Project root required for reclaim");
      return;
    }
    const eligible = media.filter((m) => canReclaimActiveCopy(m, projectRoot).ok);
    if (!eligible.length) {
      setStatusNote("No reclaimable active copies — archive first.");
      return;
    }
    setBusy("reclaim");
    setError(null);
    setStatusNote(null);
    setProgress({ pct: 10, label: `Reclaiming ${eligible.length} active copy(ies)…` });
    try {
      const health = await checkAgentHealth();
      setAgent(health);
      if (!health.connected) throw new Error("Desktop Agent not connected");
      const token = await ensureAgentSession();
      const neverDeletePaths = eligible
        .map((m) => m.archivePath?.trim())
        .filter(Boolean) as string[];
      await agentSafeDelete(DEFAULT_AGENT_BASE_URL, token, {
        projectRoot,
        confirmPhrase: SAFE_DELETE_CONFIRM_PHRASE,
        neverDeletePaths,
        files: eligible.map((m) => ({
          id: m.id,
          path: m.currentPath!.trim(),
          expectedChecksum: m.checksum,
        })),
      });
      const patches = eligible.map((m) => ({
        id: m.id,
        currentPath: "",
        onlineStatus: "online" as const,
        verifiedCopyCount: Math.max(1, (m.verifiedCopyCount ?? 2) - 1),
      }));
      await aiEditorPatchMedia(getToken, projectId, patches);
      const log = await aiEditorArchiveAction(getToken, projectId, {
        action: "log",
        type: "reclaim",
        count: patches.length,
        mediaIds: patches.map((p) => p.id),
        message: `Reclaimed ${patches.length} active copy(ies); archive kept`,
      });
      if (log.job) setJobs((prev) => [log.job!, ...prev]);
      setReclaimConfirm("");
      setStatusNote(
        `Deleted ${patches.length} active project copy(ies). Archive copies kept. Camera cards never erased.`
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reclaim failed");
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
      for (let i = 0; i < list.length; i++) {
        const m = list[i];
        setProgress({
          pct: Math.round(((i + 1) / list.length) * 100),
          label: `Preparing preview ${i + 1}/${list.length}: ${m.filename}`,
        });
        try {
          const res = await agentCreateProxy(DEFAULT_AGENT_BASE_URL, token, m.currentPath!, {
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
          (failed ? ` (${failed} couldn’t convert)` : "") +
          ". Your original camera files were not changed."
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
          context
            ? `${context.projectName}${
                context.aiEditorOnly
                  ? " — bring in footage and get a strong first edit"
                  : " — from your ShootSpine plan to a rough cut"
              }`
            : "Bring in footage and get a strong first edit"
        }
        action={
          <Link href="/ai-editor">
            <Button variant="outline" size="sm">
              All edits
            </Button>
          </Link>
        }
      />

      {context && !context.aiEditorOnly ? (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm text-slate-600">
          <Clapperboard className="h-4 w-4 text-sky-600" />
          <span>
            Linked plan: {context.scenes.length} scenes · {context.shotCount} shots
            {context.scriptTitle ? ` · ${context.scriptTitle}` : ""}
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

      {preview ? (
        <MediaPreview
          title={preview.title}
          items={preview.items}
          resolveUrl={(item) =>
            agentMediaStreamUrl(DEFAULT_AGENT_BASE_URL, preview.token, item.path, {
              startSeconds: item.startSeconds,
              endSeconds: item.endSeconds,
            })
          }
          onClose={() => setPreview(null)}
        />
      ) : null}

      {progress ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <div className="mb-1 flex justify-between text-xs text-slate-600">
            <span>{progress.label}</span>
            <span>{progress.pct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-sky-500 transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, progress.pct))}%` }}
            />
          </div>
        </div>
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
      <Card>
        <CardBody className="space-y-4">
          <div className="flex items-start gap-3">
            <StepBadge n={1} done={step1Done} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-slate-900">Connect this computer</h2>
                <Badge variant={agent.connected ? "success" : "warning"}>
                  {agent.connected ? (
                    <span className="inline-flex items-center gap-1">
                      <Wifi className="h-3 w-3" /> Ready
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      <WifiOff className="h-3 w-3" /> Not connected
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
        </CardBody>
      </Card>

      {/* Step 2 */}
      <Card>
        <CardBody className="space-y-5">
          <div className="flex items-start gap-3">
            <StepBadge n={2} done={step2Done} />
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Choose where this edit lives</h2>
              <p className="mt-1 text-sm text-slate-600">
                Pick a folder for this project’s media. ShootSpine remembers it — files never upload
                to the cloud.
              </p>
            </div>
          </div>

          <div className="pl-10 space-y-4">
            <FolderPicker
              label="Project folder"
              hint="Start from Videos, Desktop, or an external drive — not the whole C: drive."
              value={storagePath}
              onChange={setStoragePath}
              getAgentToken={ensureAgentSession}
              agentConnected={agent.connected}
              disabled={!!busy}
              placeholder="e.g. D:\\Shoots\\My_Project"
            />

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
                  Camera media, audio, exports, and cache — so you don’t have to build the structure
                  by hand.
                </span>
              </span>
            </label>

            <Button
              onClick={() => void onSaveWorkspace()}
              disabled={!!busy || !storagePath.trim() || !agent.connected}
            >
              {busy === "storage" || busy === "folders" ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <HardDrive className="mr-1.5 h-4 w-4" />
              )}
              Save workspace
            </Button>

            {settings?.projectRootPath ? (
              <p className="text-xs text-emerald-800">
                Saved: <span className="font-medium">{settings.projectRootPath}</span>
              </p>
            ) : null}
          </div>
        </CardBody>
      </Card>

      {/* Step 3 */}
      <Card>
        <CardBody className="space-y-5">
          <div className="flex items-start gap-3">
            <StepBadge n={3} done={step3Done} />
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Add your footage</h2>
              <p className="mt-1 text-sm text-slate-600">
                Point at a folder with clips (SSD, card copy, or project folder). Nothing uploads to
                the cloud, and ShootSpine never erases a camera card.
              </p>
            </div>
          </div>

          <div className="pl-10 space-y-4">
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
                  Fast catalog only — good when footage is already on your edit drive.
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
                  Safe verified copy into Camera A/B… then optional prep for editing.
                </div>
              </button>
            </div>

            <FolderPicker
              label={addMode === "copy" ? "Source footage folder" : "Footage folder"}
              hint={
                addMode === "copy"
                  ? "Camera card copy or SSD folder to copy from."
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
                <label className="block text-sm">
                  <span className="mb-1 block text-slate-600">Assign to</span>
                  <select
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                    value={cameraLabel}
                    disabled={!!busy}
                    onChange={(e) => setCameraLabel(e.target.value)}
                  >
                    {["CAMERA_A", "CAMERA_B", "CAMERA_C", "AUDIO", "DRONE", "OTHER"].map((c) => (
                      <option key={c} value={c}>
                        {c.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex cursor-pointer items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={prepareWhileCopying}
                    disabled={!!busy}
                    onChange={(e) => setPrepareWhileCopying(e.target.checked)}
                  />
                  <span>
                    <span className="font-medium text-slate-800">Prepare previews while copying</span>
                    <span className="mt-0.5 block text-xs text-slate-500">
                      Makes lighter edit copies for tough camera formats. Originals stay intact.
                    </span>
                  </span>
                </label>
                {diskNote ? <p className="text-xs text-slate-600">{diskNote}</p> : null}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => void onIndexFolder()}
                disabled={
                  !!busy ||
                  !agent.connected ||
                  !indexFolderPath.trim() ||
                  (addMode === "copy" && !settings?.projectRootPath)
                }
              >
                {busy === "index" ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <FolderOpen className="mr-1.5 h-4 w-4" />
                )}
                {addMode === "copy" ? "Copy & verify now" : "Find clips in this folder"}
              </Button>
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
                        {q.cameraLabel.replace(/_/g, " ")} ← {q.sourcePath}
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
                <Button size="sm" onClick={() => void runIngestQueue()} disabled={!!busy}>
                  {busy === "index" ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : null}
                  Run queue
                </Button>
              </div>
            ) : null}
          </div>
        </CardBody>
      </Card>

      {/* Step 4 */}
      <Card>
        <CardBody className="space-y-5">
          <div className="flex items-start gap-3">
            <StepBadge n={4} done={step4Done} />
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold text-slate-900">
                Prepare clips for smooth editing
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Some camera formats are hard for Windows to play. ShootSpine makes lighter preview
                copies for editing — your originals stay untouched for DaVinci Resolve.
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
              disabled={!!busy || !needsPrepare.length}
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

      {/* Step 5 — V1C */}
      <Card>
        <CardBody className="space-y-5">
          <div className="flex items-start gap-3">
            <StepBadge n={5} done={step5Done} />
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
              disabled={!!busy || !media.length || !agent.connected}
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
                    return (
                      <li
                        key={`${h.mediaAssetId}_${i}`}
                        className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
                      >
                        <div className="text-xs text-slate-500">
                          {clip?.filename || h.mediaAssetId} · {h.startSeconds.toFixed(1)}s
                        </div>
                        <div className="text-slate-800">{h.text}</div>
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
      <Card>
        <CardBody className="space-y-5">
          <div className="flex items-start gap-3">
            <StepBadge n={6} done={step6Done} />
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Match to your shot list</h2>
              <p className="mt-1 text-sm text-slate-600">
                Compare clips to coverage shots using filenames, camera labels, shot size, and
                dialogue when a script is linked. Pick preferred takes anytime.
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

            <Button onClick={() => void onRunMatch()} disabled={!!busy || !media.length}>
              {busy === "match" ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Clapperboard className="mr-1.5 h-4 w-4" />
              )}
              {coverage ? "Re-run matching" : "Match clips to shot list"}
            </Button>

            {coverage?.notes?.length ? (
              <p className="text-xs text-slate-500">{coverage.notes.join(" ")}</p>
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
                              .join(" · ")}
                          </div>
                          <div className="text-xs text-slate-500">
                            Preferred:{" "}
                            {preferred?.filename ||
                              (row.preferredMediaAssetId ? row.preferredMediaAssetId : "—")}
                            {row.preferredManual ? " (manual)" : ""}
                            {typeof row.preferredScore === "number"
                              ? ` · score ${(row.preferredScore * 100).toFixed(0)}%`
                              : ""}
                          </div>
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
                          {row.candidates.slice(0, 4).map((c) => (
                            <li
                              key={c.mediaAssetId}
                              className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600"
                            >
                              <span className="truncate">
                                {c.filename} · {(c.score * 100).toFixed(0)}%
                                {c.reasons[0] ? ` · ${c.reasons[0]}` : ""}
                              </span>
                              {row.preferredMediaAssetId !== c.mediaAssetId ? (
                                <button
                                  type="button"
                                  className="shrink-0 text-sky-800 underline disabled:opacity-50"
                                  disabled={!!busy}
                                  onClick={() => void onPreferTake(row.plannedShotId, c.mediaAssetId)}
                                >
                                  Prefer
                                </button>
                              ) : (
                                <span className="shrink-0 text-emerald-700">Preferred</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-xs text-slate-500">No clip candidates yet.</p>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        </CardBody>
      </Card>

      {/* Step 7 — V1E */}
      <Card>
        <CardBody className="space-y-5">
          <div className="flex items-start gap-3">
            <StepBadge n={7} done={step7Done} />
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Build a rough cut</h2>
              <p className="mt-1 text-sm text-slate-600">
                Assemble preferred takes into a ShootSpine timeline you can trim, reorder later via
                chat, and eventually hand off to Resolve.
              </p>
            </div>
          </div>
          <div className="space-y-4 pl-10">
            {timeline ? (
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-slate-50 px-3 py-3 text-center">
                  <div className="text-2xl font-semibold text-slate-900">v{timeline.version}</div>
                  <div className="text-xs text-slate-500">Version</div>
                </div>
                <div className="rounded-xl bg-slate-50 px-3 py-3 text-center">
                  <div className="text-2xl font-semibold text-slate-900">
                    {videoTrack?.clips.length ?? 0}
                  </div>
                  <div className="text-xs text-slate-500">Video clips</div>
                </div>
                <div className="rounded-xl bg-slate-50 px-3 py-3 text-center">
                  <div className="text-lg font-semibold text-slate-900">
                    {framesToTimecode(
                      (videoTrack?.clips ?? []).reduce(
                        (max, c) => Math.max(max, c.timelineStartFrame + c.durationFrames),
                        0
                      ),
                      timeline.frameRate
                    )}
                  </div>
                  <div className="text-xs text-slate-500">Duration</div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                After matching, build a first assembly from preferred takes (or all clips if there’s
                no shot list).
              </p>
            )}

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
                {timeline ? "Rebuild rough cut" : "Build rough cut"}
              </Button>
              {videoTrack?.clips?.length ? (
                <Button
                  variant="secondary"
                  onClick={() => previewRoughCut()}
                  disabled={!!busy || !agent.connected}
                >
                  <Play className="mr-1.5 h-4 w-4" />
                  Play rough cut
                </Button>
              ) : null}
            </div>

            {videoTrack?.clips?.length ? (
              <ul className="space-y-2">
                {videoTrack.clips.map((c) => {
                  const asset = media.find((m) => m.id === c.mediaAssetId);
                  return (
                    <li
                      key={c.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2 text-sm"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-medium text-slate-900">
                          {c.label || asset?.filename || c.mediaAssetId}
                        </div>
                        <div className="text-xs text-slate-500">
                          {framesToTimecode(c.timelineStartFrame, timeline!.frameRate)} ·{" "}
                          {framesToTimecode(c.durationFrames, timeline!.frameRate)} dur
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <button
                          type="button"
                          className="text-xs text-sky-800 underline disabled:opacity-50"
                          disabled={!!busy || !agent.connected}
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
            ) : null}

            {timelineVersions.length > 1 ? (
              <div className="space-y-2">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Versions
                </div>
                <ul className="space-y-1.5">
                  {timelineVersions.slice(0, 6).map((v) => (
                    <li
                      key={v.id}
                      className="flex items-center justify-between gap-2 text-xs text-slate-600"
                    >
                      <span>
                        v{v.version}
                        {v.note ? ` — ${v.note}` : ""}
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
              </div>
            ) : null}
          </div>
        </CardBody>
      </Card>

      {/* Step 8 — V1F */}
      <Card>
        <CardBody className="space-y-5">
          <div className="flex items-start gap-3">
            <StepBadge n={8} done={step8Done} />
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Edit by chat</h2>
              <p className="mt-1 text-sm text-slate-600">
                Describe an edit in plain language. ShootSpine proposes structured timeline ops —
                you review, then apply. Undo restores the previous version.
              </p>
            </div>
          </div>
          <div className="space-y-4 pl-10">
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-slate-700">What should change?</span>
              <textarea
                className="min-h-[88px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder='e.g. "remove the first clip", "trim first to 2 seconds", "reverse the order"'
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
                  via {chatProposal.proposal.source}
                  {typeof chatProposal.proposal.confidence === "number"
                    ? ` · ${Math.round(chatProposal.proposal.confidence * 100)}% confidence`
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
                    {chatProposal.validationErrors.join(" · ")}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                Common: remove first/last, trim to N seconds, reverse order, swap first two, undo.
                Harder requests use Gemini when configured (timeline metadata only — never camera
                files).
              </p>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Step 9 — look & transitions */}
      <Card>
        <CardBody className="space-y-5">
          <div className="flex items-start gap-3">
            <StepBadge n={9} done={step9Done} />
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Look &amp; transitions</h2>
              <p className="mt-1 text-sm text-slate-600">
                Choose a feel and how clips connect. Resolve does the real color — we save clear
                notes with your edit.
              </p>
            </div>
          </div>
          <div className="space-y-5 pl-10">
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
                <span className="text-sm text-slate-500">Optional — you can skip and go to Resolve.</span>
              )}
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Step 10 — finish in Resolve */}
      <Card>
        <CardBody className="space-y-5">
          <div className="flex items-start gap-3">
            <StepBadge n={10} done={step10Done} />
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Finish in DaVinci Resolve</h2>
              <p className="mt-1 text-sm text-slate-600">
                Color and polish happen in Resolve. Pick where you’ll finish — we’ll keep the steps
                simple.
              </p>
            </div>
          </div>

          <div className="space-y-5 pl-10">
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
                  Resolve is installed here. We’ll save your edit and open it.
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
                  You’ll move the project over, then open Resolve on the Mac.
                </p>
              </button>
            </div>

            {finishWhere === "here" ? (
              <div className="space-y-4">
                <Button
                  onClick={() => void onOpenInResolve()}
                  disabled={!!busy || !timeline || !agent.connected || !settings?.projectRootPath}
                >
                  {busy === "open-resolve" ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <Clapperboard className="mr-1.5 h-4 w-4" />
                  )}
                  Save edit &amp; open Resolve
                </Button>

                {!timeline ? (
                  <p className="text-sm text-slate-500">Build a rough cut above first.</p>
                ) : null}

                {handoffDirOnDisk ? (
                  <div className="rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-white px-4 py-4 shadow-sm shadow-sky-100/50">
                    <div className="flex items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                        <CheckCircle2 className="h-5 w-5" />
                      </span>
                      <div className="space-y-3">
                        <div>
                          <p className="font-semibold text-slate-900">You’re set — next in Resolve</p>
                          <p className="mt-1 text-sm text-slate-600">
                            Give Resolve a minute to open. If you don’t see it, check the taskbar.
                          </p>
                        </div>
                        <ol className="space-y-2 text-sm text-slate-700">
                          <li className="flex gap-2">
                            <span className="font-semibold text-sky-700">1.</span>
                            <span>Start or open a project in Resolve.</span>
                          </li>
                          <li className="flex gap-2">
                            <span className="font-semibold text-sky-700">2.</span>
                            <span>
                              Bring in your rough cut:{" "}
                              <span className="font-medium">File → Import → Timeline</span>, then
                              choose the timeline file in the folder we saved.
                            </span>
                          </li>
                          <li className="flex gap-2">
                            <span className="font-semibold text-sky-700">3.</span>
                            <span>
                              If clips look blank or missing, point Resolve at your project’s media
                              folder.
                            </span>
                          </li>
                        </ol>
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={!!busy || !agent.connected}
                          onClick={() => {
                            void (async () => {
                              try {
                                const token = await ensureAgentSession();
                                await agentRevealPath(
                                  DEFAULT_AGENT_BASE_URL,
                                  token,
                                  handoffDirOnDisk
                                );
                              } catch (e) {
                                setError(
                                  e instanceof Error ? e.message : "Could not open the folder"
                                );
                              }
                            })();
                          }}
                        >
                          <FolderOpen className="mr-1.5 h-3.5 w-3.5" />
                          Show me the folder
                        </Button>
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
                        Saves your rough cut into the project folder (with your footage).
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
                        Use a drive, NAS, or your usual sync. Move the whole project folder — footage
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
                        rough-cut file from the folder we prepared.
                      </p>
                    </div>
                  </li>
                </ol>

                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => void onWriteResolveHandoff()}
                    disabled={!!busy || !timeline || !agent.connected || !settings?.projectRootPath}
                  >
                    {busy === "write-handoff" ? (
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    ) : (
                      <FolderOpen className="mr-1.5 h-4 w-4" />
                    )}
                    Prepare for Mac
                  </Button>
                  {handoffDirOnDisk ? (
                    <Button
                      variant="secondary"
                      disabled={!!busy || !agent.connected}
                      onClick={() => {
                        void (async () => {
                          try {
                            const token = await ensureAgentSession();
                            await agentRevealPath(
                              DEFAULT_AGENT_BASE_URL,
                              token,
                              handoffDirOnDisk
                            );
                          } catch (e) {
                            setError(
                              e instanceof Error ? e.message : "Could not open the folder"
                            );
                          }
                        })();
                      }}
                    >
                      <FolderOpen className="mr-1.5 h-4 w-4" />
                      Show project folder
                    </Button>
                  ) : null}
                </div>

                {handoffDirOnDisk ? (
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 px-4 py-3">
                    <p className="font-medium text-emerald-950">Ready to move</p>
                    <p className="mt-1 text-sm text-emerald-900/80">
                      Copy your full project folder to the Mac, then follow step 3 in Resolve there.
                      You don’t need to download anything from the browser.
                    </p>
                  </div>
                ) : !timeline ? (
                  <p className="text-sm text-slate-500">Build a rough cut above first.</p>
                ) : null}
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Step 11 — V1H */}
      <Card>
        <CardBody className="space-y-5">
          <div className="flex items-start gap-3">
            <StepBadge n={11} done={step11Done} />
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Archive, restore & reclaim</h2>
              <p className="mt-1 text-sm text-slate-600">
                Verified copy to your archive drive, restore when needed, then reclaim active disk.
                Camera cards are never erased automatically.
              </p>
            </div>
          </div>
          <div className="space-y-4 pl-10">
            <p className="text-xs text-slate-500">
              {archiveSummary.archived}/{archiveSummary.total} archived ·{" "}
              {archiveSummary.reclaimable} reclaimable · {archiveSummary.restorable} restorable
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800">Archive folder</label>
              <FolderPicker
                label="Archive folder"
                hint="External HDD or NAS folder for verified long-term copies."
                value={archivePath}
                onChange={setArchivePath}
                getAgentToken={ensureAgentSession}
                agentConnected={agent.connected}
                disabled={!!busy}
                placeholder="e.g. E:\\ARCHIVE"
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
                Save archive root
              </Button>
              {settings?.archiveRootPath ? (
                <p className="text-xs text-slate-500">
                  Saved: <span className="font-medium">{settings.archiveRootPath}</span>
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => void onArchiveMedia()}
                disabled={!!busy || !agent.connected || media.length === 0}
              >
                {busy === "archive" ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : null}
                Archive verified copy
              </Button>
              <Button
                variant="secondary"
                onClick={() => void onRestoreMedia()}
                disabled={!!busy || !agent.connected || archiveSummary.archived === 0}
              >
                {busy === "restore" ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : null}
                Restore to project
              </Button>
            </div>
            <div className="space-y-2 rounded-xl border border-amber-100 bg-amber-50/60 px-3 py-3">
              <p className="text-sm font-medium text-amber-950">Reclaim active disk</p>
              <p className="text-xs text-amber-900/80">
                Deletes only verified active copies under the project folder after archive. Type{" "}
                <code className="rounded bg-white/80 px-1">{SAFE_DELETE_CONFIRM_PHRASE}</code> to
                confirm.
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
                  archiveSummary.reclaimable === 0
                }
              >
                {busy === "reclaim" ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : null}
                Reclaim active copies ({archiveSummary.reclaimable})
              </Button>
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

          {media.length === 0 ? (
            <p className="text-sm text-slate-500">
              Nothing here yet — finish steps 1–3 to bring clips in.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {media.map((m) => {
                const ready = !m.needsProxy || Boolean(m.proxyPath);
                const canPlay = Boolean(playbackPathForAsset(m));
                return (
                  <li key={m.id} className="flex items-center gap-3 py-3">
                    <button
                      type="button"
                      className="relative shrink-0 disabled:opacity-50"
                      disabled={!canPlay || !agent.connected || !!busy}
                      onClick={() => previewClipAsset(m)}
                      title={canPlay ? "Watch clip" : "No local path"}
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
                          .join(" · ") || m.mediaType}
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
          )}
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
        {storage[0] ? ` · Workspace on this PC` : null}
      </p>
    </div>
  );
}
