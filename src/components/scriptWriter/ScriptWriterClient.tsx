"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  FolderPlus,
  FolderOpen,
  Loader2,
  ScrollText,
  Send,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { useAccessibleProjects } from "@/hooks/useAccessibleProjects";
import { useAuth } from "@/contexts/AuthContext";
import {
  scriptWriterApplyToProject,
  scriptWriterConfirmAnalysis,
  scriptWriterCreateAndApplyProject,
  scriptWriterDeleteSession,
  scriptWriterGenerateScript,
  scriptWriterGetSession,
  scriptWriterRefineScript,
  scriptWriterResearchTrends,
  scriptWriterSendMessage,
} from "@/lib/scriptWriter/apiClient";
import {
  SCRIPT_CAST_SIZE_LABELS,
  SCRIPT_CONTENT_TYPE_LABELS,
  resolveMoodLabel,
  resolveRuntimeLabel,
} from "@/lib/scriptWriter/brief";
import { ScriptDocument, ScriptWriterSession } from "@/lib/scriptWriter/types";
import { cn } from "@/lib/utils/cn";
import { ScriptEditorPanel } from "@/components/scriptWriter/ScriptEditorPanel";
import { ScriptSuggestedShotsPanel } from "@/components/scriptWriter/ScriptSuggestedShotsPanel";
import { ShotListOptions } from "@/components/scriptWriter/StoryboardModeToggle";
import { canManageProjects, canManageUsers } from "@/lib/utils/permissions";
import { TrendsResearchPanel } from "@/components/scriptWriter/TrendsResearchPanel";
import { SharedNotesPanel } from "@/components/sharedNotes/SharedNotesPanel";

interface ScriptWriterClientProps {
  sessionId: string;
}

export function ScriptWriterClient({ sessionId }: ScriptWriterClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const adminOpen = searchParams.get("adminOpen") === "1";
  const { user, appUser } = useAuth();
  const { projects, loading: projectsLoading, error: projectsError, refresh: refreshProjects } =
    useAccessibleProjects();
  const [session, setSession] = useState<ScriptWriterSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [applying, setApplying] = useState(false);
  const [readyToWrite, setReadyToWrite] = useState(false);
  const [confirmNotes, setConfirmNotes] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [refineInput, setRefineInput] = useState("");
  const [refining, setRefining] = useState(false);
  const [researchingTrends, setResearchingTrends] = useState(false);
  const [projectId, setProjectId] = useState("");
  const [detailedShotList, setDetailedShotList] = useState(true);
  const [storyboardMode, setStoryboardMode] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [creatingProject, setCreatingProject] = useState(false);
  const [applyMode, setApplyMode] = useState<"new" | "existing">("new");
  const createApplyLock = useRef(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const goToProductionBoard = (targetProjectId: string) => {
    window.location.assign(`/projects/${targetProjectId}/production`);
  };

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const { session: loaded } = await scriptWriterGetSession(
        () => user.getIdToken(),
        sessionId,
        { adminOpen }
      );
      const s = loaded as ScriptWriterSession;
      setSession(s);
      setProjectId(s.linkedProjectId ?? s.appliedProjectId ?? "");
      setDetailedShotList(s.detailedShotList !== false);
      setStoryboardMode(s.storyboardMode ?? false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load session");
    } finally {
      setLoading(false);
    }
  }, [sessionId, user, adminOpen]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session?.messages.length]);

  useEffect(() => {
    if (!session) return;
    const scriptDoc = session.script as ScriptDocument | null;
    setNewProjectName(scriptDoc?.title?.trim() || session.title?.trim() || "");
  }, [sessionId, session]);

  const send = async () => {
    if (!user || !input.trim() || sending || adminReadOnly) return;
    setSending(true);
    setError(null);
    try {
      const { session: updated, readyToWrite: ready } = await scriptWriterSendMessage(
        () => user.getIdToken(),
        sessionId,
        input.trim()
      );
      setSession(updated as ScriptWriterSession);
      setReadyToWrite(ready);
      setInput("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Send failed");
    } finally {
      setSending(false);
    }
  };

  const generate = async () => {
    if (!user || generating || adminReadOnly) return;
    setGenerating(true);
    setError(null);
    try {
      const { session: updated } = await scriptWriterGenerateScript(
        () => user.getIdToken(),
        sessionId,
        { detailedShotList, storyboardMode }
      );
      setSession(updated as ScriptWriterSession);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const confirmAndWrite = async () => {
    if (!user || confirming) return;
    setConfirming(true);
    setError(null);
    try {
      const { session: updated } = await scriptWriterConfirmAnalysis(
        () => user.getIdToken(),
        sessionId,
        confirmNotes.trim() || undefined,
        { detailedShotList, storyboardMode }
      );
      setSession(updated as ScriptWriterSession);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setConfirming(false);
    }
  };

  const refine = async () => {
    if (!user || !refineInput.trim() || refining) return;
    setRefining(true);
    setError(null);
    try {
      const { session: updated } = await scriptWriterRefineScript(
        () => user.getIdToken(),
        sessionId,
        refineInput.trim(),
        { detailedShotList, storyboardMode }
      );
      setSession(updated as ScriptWriterSession);
      setRefineInput("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Refinement failed");
    } finally {
      setRefining(false);
    }
  };

  const researchTrends = async () => {
    if (!user || researchingTrends) return;
    setResearchingTrends(true);
    setError(null);
    try {
      const { session: updated } = await scriptWriterResearchTrends(
        () => user.getIdToken(),
        sessionId,
        { forceRefresh: true }
      );
      setSession(updated as ScriptWriterSession);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Trend research failed");
    } finally {
      setResearchingTrends(false);
    }
  };

  const applyToProject = async (targetProjectId: string) => {
    if (!user || applying || createApplyLock.current) return;
    createApplyLock.current = true;
    setApplying(true);
    setError(null);
    try {
      const result = await scriptWriterApplyToProject(() => user.getIdToken(), sessionId, {
        projectId: targetProjectId,
        createScout: true,
        updateExistingScout: Boolean(session?.linkedScoutProjectId),
      });
      setSession((s) =>
        s
          ? {
              ...s,
              status: "applied",
              appliedProjectId: result.projectId,
              linkedProjectId: result.projectId,
            }
          : s
      );
      goToProductionBoard(result.projectId);
    } catch (e) {
      createApplyLock.current = false;
      setError(e instanceof Error ? e.message : "Apply failed");
      setApplying(false);
    }
  };

  const apply = async () => {
    if (!projectId) return;
    await applyToProject(projectId);
  };

  const canCreateProject = canManageProjects(appUser);

  const createAndApplyProject = async () => {
    if (!user || !canCreateProject || creatingProject || applying || createApplyLock.current) {
      return;
    }
    const name = newProjectName.trim();
    if (!name) {
      setError("Enter a project name.");
      return;
    }
    createApplyLock.current = true;
    setCreatingProject(true);
    setError(null);
    try {
      const result = await scriptWriterCreateAndApplyProject(
        () => user.getIdToken(),
        sessionId,
        {
          projectName: name,
          createScout: true,
          updateExistingScout: Boolean(session?.linkedScoutProjectId),
        }
      );
      setSession((s) =>
        s
          ? {
              ...s,
              status: "applied",
              appliedProjectId: result.projectId,
              linkedProjectId: result.projectId,
            }
          : s
      );
      goToProductionBoard(result.projectId);
    } catch (e) {
      createApplyLock.current = false;
      setError(e instanceof Error ? e.message : "Could not create and apply project");
      setCreatingProject(false);
    }
  };

  if (loading) return <LoadingSpinner className="py-20" />;
  if (!session) {
    return (
      <div className="py-20 text-center text-slate-500">
        <p>Session not found.</p>
        <Link href="/script-writer">
          <Button className="mt-4" variant="outline">
            Back
          </Button>
        </Link>
      </div>
    );
  }

  const script = session.script as ScriptDocument | null;
  const isInspiration = session.workflowMode === "inspiration";
  const awaitingAnalysisConfirm = session.status === "analysis_ready";
  const canRefine = Boolean(script && session.status === "script_ready" && !session.refineUsed);
  const adminReadOnly = adminOpen && !!user && session.userId !== user.uid;
  const canDelete = Boolean(user && session.userId === user.uid && !adminReadOnly);

  const deleteScript = async () => {
    if (!user) return;
    setDeleting(true);
    setError(null);
    try {
      await scriptWriterDeleteSession(() => user.getIdToken(), sessionId);
      router.push("/script-writer");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="pb-24">
      {adminReadOnly && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Viewing as admin (read-only). This access is logged. You cannot edit this private script.
        </div>
      )}
      <PageHeader
        title={session.title || "Script writer"}
        subtitle={
          isInspiration
            ? "Review the analysis, confirm, then get a full production script."
            : "Refine in chat, then generate a screenplay tied to your board, shot list, and call sheets."
        }
        action={
          <div className="flex flex-wrap gap-2">
            {canDelete ? (
              <Button
                type="button"
                size="touch"
                variant="outline"
                className="border-red-200 text-red-600 hover:bg-red-50"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="mr-2 h-5 w-5" />
                Delete script
              </Button>
            ) : null}
            <Link href="/script-writer">
              <Button size="touch" variant="outline">
                <ArrowLeft className="mr-2 h-5 w-5" />
                All scripts
              </Button>
            </Link>
          </div>
        }
      />

      {error && (
        <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {(canManageProjects(appUser) ||
        canManageUsers(appUser) ||
        (user && session.userId === user.uid)) && (
        <p className="mb-4 text-sm text-slate-500">
          {session.linkedProjectId || session.appliedProjectId ? (
            <>
              Script access for collaborators is managed via{" "}
              <Link
                href={`/admin?project=${session.linkedProjectId ?? session.appliedProjectId}`}
                className="font-medium text-sky-700 hover:underline"
              >
                Admin → Team &amp; access
              </Link>
              .
            </>
          ) : (
            <>
              Share this script from{" "}
              <Link href="/admin" className="font-medium text-sky-700 hover:underline">
                Admin → Team &amp; access
              </Link>
              .
            </>
          )}
        </p>
      )}

      {session.brief ? (
        <div className="mb-4 flex flex-wrap gap-2">
          <BriefChip label={SCRIPT_CONTENT_TYPE_LABELS[session.brief.contentType]} />
          <BriefChip label={resolveMoodLabel(session.brief)} />
          <BriefChip label={SCRIPT_CAST_SIZE_LABELS[session.brief.castSize]} />
          <BriefChip label={resolveRuntimeLabel(session.brief)} />
        </div>
      ) : null}

      {session.inspirationImages?.length || session.inspirationVideo || session.inspirationUrls?.length ? (
        <div className="mb-4 flex flex-wrap gap-2">
          {session.inspirationVideo ? (
            <BriefChip label={`Clip · ${session.inspirationVideo.referenceMode.replace(/_/g, " ")}`} />
          ) : null}
          {session.inspirationImages?.map((img) => (
            <BriefChip key={img.id} label={img.label || img.tag} />
          ))}
          {session.inspirationUrls?.map((u) => (
            <BriefChip key={u.id} label={u.label || u.pageTitle || "Link"} />
          ))}
        </div>
      ) : null}

      <TrendsResearchPanel
        trends={session.trendsResearch}
        loading={researchingTrends}
        onResearch={session.status !== "applied" ? () => void researchTrends() : undefined}
      />

      <div className="flex min-w-0 flex-col gap-6">
        <section className="flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Sparkles className="h-4 w-4 text-violet-600" />
              {awaitingAnalysisConfirm ? "Analysis" : "Conversation"}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {awaitingAnalysisConfirm
                ? "Confirm what Gemini saw, add a note if needed, then write the full script."
                : isInspiration
                  ? "Inspiration flow — one optional refinement after the script is ready."
                  : "Follow-ups only for what's still unclear."}
            </p>
          </div>
          <div className="max-h-[min(420px,45vh)] space-y-3 overflow-y-auto px-4 py-4">
            {session.messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "max-w-[95%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
                  msg.role === "user"
                    ? "ml-auto bg-sky-600 text-white"
                    : "bg-slate-100 text-slate-800"
                )}
              >
                {msg.content}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          {awaitingAnalysisConfirm && session.status !== "applied" ? (
            <div className="space-y-3 border-t border-slate-100 p-3">
              <ShotListOptions
                storyboardMode={storyboardMode}
                onStoryboardChange={setStoryboardMode}
                detailedShotList={detailedShotList}
                onDetailedChange={setDetailedShotList}
                compact
              />
              <textarea
                value={confirmNotes}
                onChange={(e) => setConfirmNotes(e.target.value)}
                placeholder="Optional: e.g. Pool only in the final beat, more whisper less gore…"
                rows={2}
                className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-300/20"
              />
              <Button
                type="button"
                className="w-full bg-gradient-to-b from-violet-500 to-violet-600 hover:from-violet-600 hover:to-violet-700"
                disabled={confirming}
                onClick={() => void confirmAndWrite()}
              >
                {confirming ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="mr-2 h-4 w-4" />
                )}
                Write full script
              </Button>
            </div>
          ) : null}
          {!awaitingAnalysisConfirm && session.status !== "applied" && !isInspiration ? (
            <div className="border-t border-slate-100 p-3">
              <div className="flex gap-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Reply to the writer…"
                  rows={2}
                  className="min-h-[44px] flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void send();
                    }
                  }}
                />
                <Button
                  type="button"
                  size="touch"
                  disabled={sending || !input.trim()}
                  onClick={() => void send()}
                >
                  {sending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </Button>
              </div>
              <div className="mt-2 space-y-2">
                <ShotListOptions
                  storyboardMode={storyboardMode}
                  onStoryboardChange={setStoryboardMode}
                  detailedShotList={detailedShotList}
                  onDetailedChange={setDetailedShotList}
                  compact
                />
                <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={generating}
                  onClick={() => void generate()}
                >
                  {generating ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <Wand2 className="mr-1.5 h-4 w-4" />
                  )}
                  Write script
                </Button>
                {readyToWrite && !script && (
                  <span className="self-center text-xs text-violet-700">
                    Ready when you are — or keep refining.
                  </span>
                )}
                </div>
              </div>
            </div>
          ) : null}
          {canRefine ? (
            <div className="space-y-2 border-t border-slate-100 p-3">
              <p className="text-xs text-slate-500">One optional refinement</p>
              <ShotListOptions
                storyboardMode={storyboardMode}
                onStoryboardChange={setStoryboardMode}
                detailedShotList={detailedShotList}
                onDetailedChange={setDetailedShotList}
                compact
              />
              <div className="flex gap-2">
                <textarea
                  value={refineInput}
                  onChange={(e) => setRefineInput(e.target.value)}
                  placeholder="e.g. Shorter dialogue, darker ending…"
                  rows={2}
                  className="min-h-[44px] flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-300/20"
                />
                <Button
                  type="button"
                  size="touch"
                  disabled={refining || !refineInput.trim()}
                  onClick={() => void refine()}
                >
                  {refining ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </div>
          ) : null}
          {session.refineUsed ? (
            <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
              Refinement used — start a new session for bigger changes.
            </p>
          ) : null}
        </section>

        <section className="flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <ScrollText className="h-4 w-4 text-violet-600" />
              Script
            </h2>
            {script ? (
              <p className="mt-0.5 text-xs text-slate-500">
                {script.scenes.length} scenes · {script.suggestedShots.length} shot
                {script.suggestedShots.length === 1 ? "" : "s"}
                {storyboardMode
                  ? ` · ${script.storyboardFrames?.length ?? script.scenes.length} storyboard frame${(script.storyboardFrames?.length ?? script.scenes.length) === 1 ? "" : "s"}`
                  : ""}
                {detailedShotList ? " · detailed coverage" : ""}{" "}
                · {script.characters.length} characters
              </p>
            ) : (
              <p className="mt-0.5 text-xs text-slate-500">
                Your full screenplay appears here after generation.
              </p>
            )}
          </div>
          {script && script.suggestedShots.length > 0 ? (
            <ScriptSuggestedShotsPanel shots={script.suggestedShots} />
          ) : null}
          <div className="min-w-0 overflow-x-auto px-4 py-4">
            {script ? (
              <ScriptEditorPanel
                sessionId={sessionId}
                script={script}
                getToken={() => user!.getIdToken()}
                onUpdated={(updated) =>
                  setSession((s) => (s ? { ...s, script: updated, title: updated.title } : s))
                }
              />
            ) : (
              <p className="text-sm text-slate-500">
                {awaitingAnalysisConfirm
                  ? "Confirm the analysis to generate your script."
                  : isInspiration
                    ? "Your production script will appear here after you confirm."
                    : (
                        <>
                          Chat with the writer first, then click <strong>Write script</strong>.
                        </>
                      )}
              </p>
            )}
          </div>
          {script && session.status !== "applied" && (
            <div className="border-t border-slate-100">
              <div className="border-b border-slate-100 px-4 py-3">
                <h3 className="text-sm font-semibold text-slate-900">Apply to pre-production</h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Push this script, shot list, and storyboard into a project production board.
                </p>
              </div>

              {canCreateProject ? (
                <div className="px-4 pt-4">
                  <div
                    className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1"
                    role="tablist"
                    aria-label="Project apply mode"
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={applyMode === "new"}
                      onClick={() => setApplyMode("new")}
                      className={cn(
                        "flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                        applyMode === "new"
                          ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80"
                          : "text-slate-600 hover:text-slate-900"
                      )}
                    >
                      <FolderPlus className="h-4 w-4 shrink-0 text-violet-600" />
                      New project
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={applyMode === "existing"}
                      onClick={() => setApplyMode("existing")}
                      className={cn(
                        "flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                        applyMode === "existing"
                          ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80"
                          : "text-slate-600 hover:text-slate-900"
                      )}
                    >
                      <FolderOpen className="h-4 w-4 shrink-0 text-violet-600" />
                      Existing project
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="p-4">
                {applyMode === "new" && canCreateProject ? (
                  <div className="space-y-4">
                    <p className="text-sm text-slate-600">
                      Creates a new project, applies this script, and opens the pre-production board.
                    </p>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                      <div className="min-w-0 flex-1">
                        <Input
                          label="Project name"
                          value={newProjectName}
                          onChange={(e) => setNewProjectName(e.target.value)}
                          placeholder="e.g. Summer brand film"
                          disabled={creatingProject || applying}
                        />
                      </div>
                      <Button
                        type="button"
                        className="w-full shrink-0 sm:w-auto"
                        disabled={creatingProject || applying || !newProjectName.trim()}
                        onClick={() => void createAndApplyProject()}
                      >
                        {creatingProject || applying ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <FolderPlus className="mr-2 h-4 w-4" />
                        )}
                        {creatingProject || applying ? "Applying…" : "Create & apply"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-slate-600">
                      Link this script to a project you already have — production board, Scout, and
                      script tab will update.
                    </p>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                      <div className="min-w-0 flex-1">
                        <Select
                          label="Project"
                          value={projectId}
                          onChange={(e) => setProjectId(e.target.value)}
                          disabled={projectsLoading || creatingProject || applying}
                          options={[
                            {
                              value: "",
                              label: projectsLoading ? "Loading projects…" : "Select a project…",
                            },
                            ...projects.map((p) => ({ value: p.id, label: p.projectName })),
                          ]}
                        />
                      </div>
                      <Button
                        type="button"
                        className="w-full shrink-0 sm:w-auto"
                        disabled={!projectId || applying || projectsLoading || creatingProject}
                        onClick={() => void apply()}
                      >
                        {applying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Apply to board
                      </Button>
                    </div>
                    {!projectsLoading && projects.length === 0 && !canCreateProject ? (
                      <p className="rounded-lg border border-amber-200/80 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                        {projectsError
                          ? `Could not load projects: ${projectsError}`
                          : (
                              <>
                                No projects available. Ask an admin for access, or create one on{" "}
                                <Link href="/projects" className="font-medium underline">
                                  Projects
                                </Link>
                                .
                              </>
                            )}
                      </p>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          )}
          {session.status === "applied" && session.appliedProjectId && (
            <div className="border-t border-slate-100 p-4">
              <Link href={`/projects/${session.appliedProjectId}/production`}>
                <Button className="w-full" variant="outline">
                  Open pre-production board
                </Button>
              </Link>
            </div>
          )}
        </section>
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete this script?"
        description={`"${session.title || "Untitled script"}" and all versions, chat history, and inspiration files will be permanently removed. This cannot be undone.${
          session.appliedProjectId
            ? " The pre-production board will keep its data, but will no longer link to this script."
            : ""
        }`}
        confirmLabel="Delete script"
        cancelLabel="Keep script"
        loading={deleting}
        onCancel={() => {
          if (!deleting) setShowDeleteConfirm(false);
        }}
        onConfirm={() => void deleteScript()}
      />

      <SharedNotesPanel
        resourceType="script"
        resourceId={sessionId}
        adminOpen={adminOpen}
        className="mt-6"
      />
    </div>
  );
}

function BriefChip({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-800">
      {label}
    </span>
  );
}
