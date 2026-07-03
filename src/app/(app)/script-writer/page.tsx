"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Loader2, PenLine, ScrollText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Card, CardBody } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  DEFAULT_SCRIPT_BRIEF,
  ScriptWriterIntakeForm,
} from "@/components/scriptWriter/ScriptWriterIntakeForm";
import { InspirationUploadSection } from "@/components/scriptWriter/InspirationUploadSection";
import { ShotListOptions } from "@/components/scriptWriter/StoryboardModeToggle";
import { useAuth } from "@/contexts/AuthContext";
import {
  PendingInspirationImage,
  PendingInspirationUrl,
  PendingInspirationVideo,
  scriptWriterAnalyzeInspiration,
  scriptWriterCreateSession,
  scriptWriterDeleteSession,
  scriptWriterListSessions,
  scriptWriterResearchTrends,
} from "@/lib/scriptWriter/apiClient";
import {
  isBriefComplete,
  ScriptWriterBrief,
} from "@/lib/scriptWriter/brief";
import { uploadScriptWriterFile } from "@/lib/scriptWriter/storage";
import { ScriptInspirationImage, ScriptInspirationVideo, ScriptWriterSession } from "@/lib/scriptWriter/types";
import { scriptSessionStatusLabel, sessionsForProject } from "@/lib/scriptWriter/projectScripts";
import { canUseShotScout } from "@/lib/utils/permissions";

function ScriptWriterPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, appUser } = useAuth();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [brief, setBrief] = useState<ScriptWriterBrief>(DEFAULT_SCRIPT_BRIEF);
  const [creating, setCreating] = useState(false);
  const [sessions, setSessions] = useState<ScriptWriterSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [linkedProjectId, setLinkedProjectId] = useState<string>();
  const [linkedScoutProjectId, setLinkedScoutProjectId] = useState<string>();
  const [title, setTitle] = useState<string>();
  const [pendingImages, setPendingImages] = useState<PendingInspirationImage[]>([]);
  const [pendingVideo, setPendingVideo] = useState<PendingInspirationVideo | null>(null);
  const [pendingUrls, setPendingUrls] = useState<PendingInspirationUrl[]>([]);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [researchTrends, setResearchTrends] = useState(false);
  const [detailedShotList, setDetailedShotList] = useState(true);
  const [storyboardMode, setStoryboardMode] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ScriptWriterSession | null>(null);
  const [deleting, setDeleting] = useState(false);

  const hasInspiration =
    pendingImages.length > 0 || pendingVideo !== null || pendingUrls.length > 0;

  useEffect(() => {
    const idea = searchParams.get("idea")?.trim();
    const t = searchParams.get("title")?.trim();
    if (idea) {
      setBrief((b) => ({ ...b, concept: idea }));
    }
    if (t) setTitle(t);
    const projectId = searchParams.get("projectId") ?? undefined;
    const scoutId = searchParams.get("scoutId") ?? undefined;
    if (projectId) setLinkedProjectId(projectId);
    if (scoutId) setLinkedScoutProjectId(scoutId);
  }, [searchParams]);

  useEffect(() => {
    if (!user) return;
    if (canUseShotScout(appUser)) {
      setAllowed(true);
      return;
    }
    scriptWriterListSessions(() => user.getIdToken())
      .then(() => setAllowed(true))
      .catch(() => setAllowed(false));
  }, [user, appUser]);

  useEffect(() => {
    if (!user || !allowed) return;
    setLoading(true);
    scriptWriterListSessions(() => user.getIdToken())
      .then((res) => setSessions(res.sessions as ScriptWriterSession[]))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [user, allowed]);

  const confirmDeleteScript = async () => {
    if (!user || !deleteTarget) return;
    setDeleting(true);
    setError(null);
    try {
      await scriptWriterDeleteSession(() => user.getIdToken(), deleteTarget.id);
      setSessions((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  const start = async () => {
    if (!user || !isBriefComplete(brief, hasInspiration)) return;
    setCreating(true);
    setError(null);
    setUploadProgress(null);
    try {
      const { id } = await scriptWriterCreateSession(() => user.getIdToken(), {
        brief,
        initialIdea: brief.concept.trim() || "Inspired script",
        title: title ?? (brief.concept.trim().slice(0, 60) || "Inspired script"),
        linkedProjectId,
        linkedScoutProjectId,
        workflowMode: hasInspiration ? "inspiration" : "text",
        detailedShotList,
        storyboardMode,
      });

      if (hasInspiration) {
        const images: ScriptInspirationImage[] = [];
        for (let i = 0; i < pendingImages.length; i++) {
          const img = pendingImages[i];
          setUploadProgress(`Uploading photo ${i + 1} of ${pendingImages.length}…`);
          const uploaded = await uploadScriptWriterFile(user.uid, id, img.id, img.file);
          images.push({
            id: img.id,
            storageUrl: uploaded.storageUrl,
            storagePath: uploaded.storagePath,
            tag: img.tag,
            label: img.label.trim() || undefined,
          });
        }

        let video: ScriptInspirationVideo | null = null;
        if (pendingVideo) {
          setUploadProgress("Uploading clip…");
          const uploaded = await uploadScriptWriterFile(
            user.uid,
            id,
            pendingVideo.id,
            pendingVideo.file
          );
          video = {
            id: pendingVideo.id,
            storageUrl: uploaded.storageUrl,
            storagePath: uploaded.storagePath,
            referenceMode: pendingVideo.referenceMode,
            fileName: pendingVideo.file.name,
          };
        }

        setUploadProgress("Analyzing inspiration…");
        await scriptWriterAnalyzeInspiration(() => user.getIdToken(), id, {
          images,
          video,
          urls: pendingUrls.map((u) => ({
            id: u.id,
            url: u.url,
            tag: u.tag,
            label: u.label.trim() || undefined,
            referenceMode: u.tag === "reference_clip" ? u.referenceMode : undefined,
          })),
        });
      }

      if (researchTrends) {
        setUploadProgress("Researching current trends…");
        await scriptWriterResearchTrends(() => user.getIdToken(), id);
      }

      router.push(`/script-writer/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start session");
    } finally {
      setCreating(false);
      setUploadProgress(null);
    }
  };

  if (allowed === null) return <LoadingSpinner className="py-20" />;
  if (!allowed) {
    return (
      <div className="py-20 text-center text-slate-500">
        <p>You don&apos;t have access to Script writer.</p>
      </div>
    );
  }

  const projectSessions = linkedProjectId ? sessionsForProject(sessions, linkedProjectId) : [];
  const otherSessions = linkedProjectId
    ? sessions.filter((s) => !projectSessions.some((p) => p.id === s.id))
    : sessions;

  const renderSessionRow = (s: ScriptWriterSession) => {
    const isOwner = user?.uid === s.userId;
    return (
      <li key={s.id} className="flex items-center gap-2 px-4 py-3 hover:bg-slate-50">
        <Link href={`/script-writer/${s.id}`} className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
            <ScrollText className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-slate-900">{s.title}</p>
            <p className="truncate text-xs text-slate-500">{scriptSessionStatusLabel(s)}</p>
          </div>
        </Link>
        {isOwner ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            aria-label="Delete script"
            title="Delete script"
            disabled={deleting && deleteTarget?.id === s.id}
            onClick={() => setDeleteTarget(s)}
          >
            {deleting && deleteTarget?.id === s.id ? (
              <Loader2 className="h-4 w-4 animate-spin text-red-500" />
            ) : (
              <Trash2 className="h-4 w-4 text-red-500" />
            )}
          </Button>
        ) : null}
      </li>
    );
  };

  return (
    <div className="pb-24">
      <PageHeader
        title="Script writer"
        subtitle="Start with a basic idea — get a full script, then push it to your board, shot list, and call sheets."
      />

      {error && (
        <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <Card className="mb-8">
        <CardBody className="space-y-5">
          <ScriptWriterIntakeForm
            brief={brief}
            onChange={setBrief}
            researchTrends={researchTrends}
            onResearchTrendsChange={setResearchTrends}
          />
          <InspirationUploadSection
            images={pendingImages}
            video={pendingVideo}
            urls={pendingUrls}
            onImagesChange={setPendingImages}
            onVideoChange={setPendingVideo}
            onUrlsChange={setPendingUrls}
          />
          <ShotListOptions
            storyboardMode={storyboardMode}
            onStoryboardChange={setStoryboardMode}
            detailedShotList={detailedShotList}
            onDetailedChange={setDetailedShotList}
            className="border-t border-slate-100 pt-4"
          />
          <div className="flex flex-col items-end gap-2">
            {uploadProgress ? (
              <p className="text-xs text-violet-700">{uploadProgress}</p>
            ) : null}
            <Button
              type="button"
              size="lg"
              disabled={creating || !isBriefComplete(brief, hasInspiration)}
              onClick={() => void start()}
              className="bg-gradient-to-b from-violet-500 to-violet-600 shadow-violet-500/25 hover:from-violet-600 hover:to-violet-700 focus:ring-violet-400"
            >
              <PenLine className="mr-2 h-4 w-4" />
              {creating
                ? uploadProgress || "Working…"
                : hasInspiration
                  ? "Analyze & write script"
                  : "Begin script"}
            </Button>
          </div>
        </CardBody>
      </Card>

      {linkedProjectId && projectSessions.length > 0 ? (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Scripts for this project
          </h2>
          <ul className="divide-y divide-slate-100 rounded-2xl border border-violet-200 bg-violet-50/40">
            {projectSessions.map(renderSessionRow)}
          </ul>
        </section>
      ) : null}

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          {linkedProjectId ? "All recent scripts" : "Recent scripts"}
        </h2>
        {loading ? (
          <LoadingSpinner className="py-8" />
        ) : otherSessions.length === 0 && projectSessions.length === 0 ? (
          <p className="text-sm text-slate-500">No scripts yet.</p>
        ) : otherSessions.length === 0 ? (
          <p className="text-sm text-slate-500">No other scripts yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
            {otherSessions.map(renderSessionRow)}
          </ul>
        )}
      </section>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete this script?"
        description={
          deleteTarget
            ? `"${deleteTarget.title}" and all versions, chat history, and inspiration files will be permanently removed. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete script"
        cancelLabel="Keep script"
        loading={deleting}
        onCancel={() => {
          if (!deleting) setDeleteTarget(null);
        }}
        onConfirm={() => void confirmDeleteScript()}
      />
    </div>
  );
}

export default function ScriptWriterPage() {
  return (
    <Suspense fallback={<LoadingSpinner className="py-20" />}>
      <ScriptWriterPageContent />
    </Suspense>
  );
}
