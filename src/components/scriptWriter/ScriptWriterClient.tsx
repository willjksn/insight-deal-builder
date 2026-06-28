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
  scriptWriterGenerateScript,
  scriptWriterGetSession,
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

interface ScriptWriterClientProps {
  sessionId: string;
}

export function ScriptWriterClient({ sessionId }: ScriptWriterClientProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { data: projects } = useCollection<Project>("projects");
  const [session, setSession] = useState<ScriptWriterSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [applying, setApplying] = useState(false);
  const [readyToWrite, setReadyToWrite] = useState(false);
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

  return (
    <div className="pb-24">
      <PageHeader
        title={session.title || "Script writer"}
        subtitle="Refine in chat, then generate a screenplay tied to your board, shot list, and call sheets."
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

      {session.brief ? (
        <div className="mb-4 flex flex-wrap gap-2">
          <BriefChip label={SCRIPT_CONTENT_TYPE_LABELS[session.brief.contentType]} />
          <BriefChip label={resolveMoodLabel(session.brief)} />
          <BriefChip label={SCRIPT_CAST_SIZE_LABELS[session.brief.castSize]} />
          <BriefChip label={resolveRuntimeLabel(session.brief)} />
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="flex min-h-[480px] flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Sparkles className="h-4 w-4 text-violet-600" />
              Conversation
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Follow-ups only for what&apos;s still unclear — your setup answers are already locked in.
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
          {session.status !== "applied" && (
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
          )}
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
              <div className="space-y-4">
                <div>
                  <h3 className="font-serif text-lg font-bold text-slate-900">{script.title}</h3>
                  <p className="mt-1 text-sm text-slate-600">{script.logline}</p>
                </div>
                <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-slate-800">
                  {script.fountain}
                </pre>
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                Chat with the writer first, then click <strong>Write script</strong>.
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
