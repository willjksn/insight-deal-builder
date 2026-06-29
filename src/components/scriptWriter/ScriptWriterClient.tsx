"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Loader2,
  ScrollText,
  Send,
  Sparkles,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { useAuth } from "@/contexts/AuthContext";
import { useCollection } from "@/hooks/useCollection";
import { Project } from "@/lib/types";
import {
  scriptWriterApplyToProject,
  scriptWriterConfirmAnalysis,
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
import { canManageProjects, canManageUsers } from "@/lib/utils/permissions";
import { TrendsResearchPanel } from "@/components/scriptWriter/TrendsResearchPanel";

interface ScriptWriterClientProps {
  sessionId: string;
}

export function ScriptWriterClient({ sessionId }: ScriptWriterClientProps) {
  const router = useRouter();
  const { user, appUser } = useAuth();
  const { data: projects } = useCollection<Project>("projects");
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
  const chatEndRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const { session: loaded } = await scriptWriterGetSession(() => user.getIdToken(), sessionId);
      const s = loaded as ScriptWriterSession;
      setSession(s);
      setProjectId(s.linkedProjectId ?? s.appliedProjectId ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load session");
    } finally {
      setLoading(false);
    }
  }, [sessionId, user]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session?.messages.length]);

  const send = async () => {
    if (!user || !input.trim() || sending) return;
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
    if (!user || generating) return;
    setGenerating(true);
    setError(null);
    try {
      const { session: updated } = await scriptWriterGenerateScript(
        () => user.getIdToken(),
        sessionId
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
        confirmNotes.trim() || undefined
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
        refineInput.trim()
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

  const apply = async () => {
    if (!user || !projectId || applying) return;
    setApplying(true);
    setError(null);
    try {
      const result = await scriptWriterApplyToProject(() => user.getIdToken(), sessionId, {
        projectId,
        createScout: true,
        updateExistingScout: Boolean(session?.linkedScoutProjectId),
      });
      router.push(`/projects/${result.projectId}/production`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Apply failed");
    } finally {
      setApplying(false);
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

  return (
    <div className="pb-24">
      <PageHeader
        title={session.title || "Script writer"}
        subtitle={
          isInspiration
            ? "Review the analysis, confirm, then get a full production script."
            : "Refine in chat, then generate a screenplay tied to your board, shot list, and call sheets."
        }
        action={
          <Link href="/script-writer">
            <Button size="touch" variant="outline">
              <ArrowLeft className="mr-2 h-5 w-5" />
              All scripts
            </Button>
          </Link>
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

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="flex min-h-[480px] flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
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
          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
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
              <div className="mt-2 flex flex-wrap gap-2">
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
          ) : null}
          {canRefine ? (
            <div className="space-y-2 border-t border-slate-100 p-3">
              <p className="text-xs text-slate-500">One optional refinement</p>
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

        <section className="flex min-h-[480px] flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <ScrollText className="h-4 w-4 text-violet-600" />
              Script
            </h2>
            {script ? (
              <p className="mt-0.5 text-xs text-slate-500">
                {script.scenes.length} scenes · {script.suggestedShots.length} suggested shots ·{" "}
                {script.characters.length} characters
              </p>
            ) : (
              <p className="mt-0.5 text-xs text-slate-500">
                Your full screenplay appears here after generation.
              </p>
            )}
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4">
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
            <div className="space-y-3 border-t border-slate-100 p-4">
              <Select
                label="Apply to project"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                options={[
                  { value: "", label: "Select a project…" },
                  ...projects.map((p) => ({ value: p.id, label: p.projectName })),
                ]}
              />
              <Button
                type="button"
                className="w-full"
                disabled={!projectId || applying}
                onClick={() => void apply()}
              >
                {applying ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Apply to project & pre-production
              </Button>
              <p className="text-xs text-slate-500">
                Populates the production board (logline, cast, locations, Day 1 shots/scenes), creates
                or updates a Scout session with shot list, and stores the script on the board.
              </p>
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
