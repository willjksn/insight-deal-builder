"use client";

import { useCallback, useEffect, useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Building2,
  Clapperboard,
  FolderKanban,
  HardDrive,
  ListChecks,
  Loader2,
  Plus,
  MessageSquare,
  Sparkles,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAuth } from "@/contexts/AuthContext";
import {
  aiEditorCreateSession,
  aiEditorCrossProjectInsights,
  aiEditorListSessions,
  type AiEditorOrgInsights,
  type AiEditorRecommendation,
  type AiEditorSessionListItem,
} from "@/lib/aiEditor/apiClient";
import { isAiEditorEnabled } from "@/lib/aiEditor/featureFlag";
import {
  readResumeBookmark,
  type AiEditorResumeBookmark,
} from "@/lib/aiEditor/workflowNextStep";

function priorityBadge(priority: AiEditorRecommendation["priority"]) {
  if (priority === "high") return <Badge variant="warning">Do next</Badge>;
  if (priority === "medium") return <Badge variant="info">Soon</Badge>;
  return <Badge variant="default">Tip</Badge>;
}

function HowItWorksGuideContent() {
  return (
    <div className="space-y-6 text-sm leading-relaxed text-slate-700">
      <section className="space-y-2">
        <h3 className="font-semibold text-slate-900">What AI Editor is</h3>
        <p>
          AI Editor helps you turn camera footage into a strong first cut on this Windows
          workstation, then hand off to DaVinci Resolve (here or on a Mac) for finishing. Footage
          stays on <span className="font-medium">your drives</span> — ShootSpine does not upload
          camera originals to the cloud.
        </p>
        <p>
          You can open it from a full ShootSpine production (script, coverage, board) or start a{" "}
          <span className="font-medium">footage-only</span> edit with no prep board.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="font-semibold text-slate-900">What you need on this PC</h3>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <span className="font-medium">Desktop Agent</span> — a small local helper that reads
            folders, copies files, builds proxies, and talks to Resolve. Connect it in Step 1 of any
            edit (restart after updates; current drive features need{" "}
            <span className="font-medium">0.15+</span>).
          </li>
          <li>
            <span className="font-medium">FFmpeg</span> — for probe, proxies, and analysis.
          </li>
          <li>
            Optional: <span className="font-medium">Whisper</span> for local speech-to-text.
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="font-semibold text-slate-900">Recommended drive setup</h3>
        <p>Best production layout (guidance — not a hard requirement):</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <span className="font-medium">Edit folder on an external SSD</span> — working project,
            copies, proxies, and preview live here.
          </li>
          <li>
            <span className="font-medium">Backup folder on an external HDD</span> — verified archive
            you can restore from and reclaim space against later.
          </li>
          <li>
            <span className="font-medium">Internal SSD (This PC)</span> — Windows and apps only. Fine
            for tests; not ideal as the main media drive.
          </li>
        </ul>
        <p>
          Step 2 shows <span className="font-medium">Workspace health</span> (SSD/HDD detection,
          same-drive risk, free space). If Windows remounts a drive under a new letter, use{" "}
          <span className="font-medium">Relink paths</span>. If a drive is unplugged, disk actions
          pause until you Recheck or Relink.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="font-semibold text-slate-900">The edit flow (steps)</h3>
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            <span className="font-medium">Connect this computer</span> — start/reconnect the Desktop
            Agent.
          </li>
          <li>
            <span className="font-medium">Choose where this edit lives</span> — set edit + optional
            backup folders; optionally create organized project folders.
          </li>
          <li>
            <span className="font-medium">Add footage</span> — catalog in place or copy into the
            project (camera cards are never auto-erased).
          </li>
          <li>
            <span className="font-medium">Prepare clips</span> — light H.264 proxies for tough formats
            so scrubbing stays smooth; originals stay for Resolve.
          </li>
          <li>
            <span className="font-medium">Understand footage</span> — local technical analysis, shot
            breaks, optional transcription + search.
          </li>
          <li>
            <span className="font-medium">Match to the plan</span> — when you have planned shots,
            score coverage and preferred takes (skipped for pure footage-only).
          </li>
          <li>
            <span className="font-medium">Build a rough cut</span> — assemble a first timeline with
            versions you can restore.
          </li>
          <li>
            <span className="font-medium">Edit by chat</span> — optional plain-language trims/moves
            (won’t block finishing).
          </li>
          <li>
            <span className="font-medium">Set the look</span> — soft blends go into the EDL; markers
            mark acts/fades. Mood notes guide Color — nothing is baked into footage.
          </li>
          <li>
            <span className="font-medium">Finish in Resolve</span> — write a handoff package, open
            Resolve here, or prepare for Mac; sync back / import the Resolve cut when useful.
          </li>
          <li>
            <span className="font-medium">Backup &amp; free space</span> — verified archive to your
            HDD, restore, then reclaim active copies with typed confirm.
          </li>
          <li>
            <span className="font-medium">How did finishing go?</span> — short wrap-up so the next
            edit can start with a better look default.
          </li>
        </ol>
        <p>
          Inside a project, use <span className="font-medium">Continue · Step N</span> to jump to
          what’s next. This hub remembers your last edit on this PC.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="font-semibold text-slate-900">Resolve &amp; next shoot</h3>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            Handoff includes EDL (with soft blends when chosen), media map, LOOKS notes, timeline
            markers, and (when scripting is ready) import into a ShootSpine bin.
          </li>
          <li>
            After finishing, check what’s in Resolve, build a{" "}
            <span className="font-medium">next-shoot checklist</span>, and optionally send open
            items to the production board filming notes.
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="font-semibold text-slate-900">Patterns &amp; privacy</h3>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <span className="font-medium">Your edits</span> — looks, Resolve sync, and checklist
            patterns from projects you own (metadata only).
          </li>
          <li>
            <span className="font-medium">Organization</span> — optional. Opt in under Settings → AI
            Editor patterns to share anonymized counts with same-company teammates. No clip files,
            paths, or project names.
          </li>
        </ul>
      </section>

      <section className="rounded-xl border border-sky-100 bg-sky-50/60 px-3 py-3 text-xs text-slate-600">
        Tip: plug in your SSD/HDD, wait until Windows shows drive letters, Connect the agent, then
        pick folders in Step 2. Save the workspace once so remount/relink can remember the volume.
      </section>
    </div>
  );
}

function HowItWorksPanel() {
  const [open, setOpen] = useState(false);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <>
      <Card>
        <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 font-semibold text-slate-900">
              <HardDrive className="h-4 w-4 text-sky-700" />
              How it works
            </div>
            <p className="mt-1 text-sm text-slate-600">
              Full guide: drives, Desktop Agent, edit steps, Resolve, and privacy.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="shrink-0"
            onClick={() => setOpen(true)}
          >
            Open guide
          </Button>
        </CardBody>
      </Card>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/45 backdrop-blur-[1px]"
            onClick={() => setOpen(false)}
            aria-label="Close how it works"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative flex max-h-[min(88vh,720px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div>
                <h2 id={titleId} className="text-lg font-semibold text-slate-900">
                  How AI Editor works
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Local footage · Windows workstation · Resolve finishing
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto px-5 py-4">
              <HowItWorksGuideContent />
            </div>
            <div className="border-t border-slate-100 px-5 py-3">
              <Button type="button" className="w-full sm:w-auto" onClick={() => setOpen(false)}>
                Got it
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function AiEditorHubClient() {
  const { user } = useAuth();
  const router = useRouter();
  const getToken = useCallback(async () => (user ? user.getIdToken() : null), [user]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<AiEditorSessionListItem[]>([]);
  const [insights, setInsights] = useState<
    Array<{ id: string; text: string; weight: number }>
  >([]);
  const [recommendations, setRecommendations] = useState<AiEditorRecommendation[]>(
    []
  );
  const [orgInsights, setOrgInsights] = useState<AiEditorOrgInsights | null>(null);
  const [insightsMeta, setInsightsMeta] = useState<{
    projectCount: number;
    withDataCount: number;
  } | null>(null);
  const [insightsStatus, setInsightsStatus] = useState<"ok" | "empty" | "error" | null>(
    null
  );
  const [name, setName] = useState("");
  const [resume, setResume] = useState<AiEditorResumeBookmark | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    setInsightsStatus(null);
    try {
      const res = await aiEditorListSessions(getToken);
      setSessions(res.sessions);
      try {
        const insightRes = await aiEditorCrossProjectInsights(getToken);
        setInsights(insightRes.insights);
        setRecommendations(insightRes.recommendations ?? []);
        setOrgInsights(insightRes.org ?? null);
        setInsightsMeta({
          projectCount: insightRes.projectCount,
          withDataCount: insightRes.withDataCount,
        });
        setInsightsStatus(
          insightRes.insights.length || (insightRes.recommendations?.length ?? 0)
            ? "ok"
            : "empty"
        );
      } catch {
        setInsights([]);
        setRecommendations([]);
        setOrgInsights(null);
        setInsightsMeta(null);
        setInsightsStatus("error");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load edit sessions");
    } finally {
      setLoading(false);
    }
  }, [getToken, user]);

  useEffect(() => {
    if (!isAiEditorEnabled()) return;
    void load();
  }, [load]);

  useEffect(() => {
    setResume(readResumeBookmark());
  }, [loading]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const projectName = name.trim();
    if (!projectName || /^untitled/i.test(projectName)) {
      setError("Give this edit a name first (e.g. Monopoly Night).");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const res = await aiEditorCreateSession(getToken, projectName);
      router.push(`/projects/${res.projectId}/ai-editor`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create edit");
      setCreating(false);
    }
  }

  if (!isAiEditorEnabled()) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-sm text-zinc-600">
        AI Editor is disabled for this environment.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <PageHeader
        title="AI Editor"
        subtitle="Edit footage from a ShootSpine production — or start a footage-only edit with no script or prep board."
      />

      <HowItWorksPanel />

      <Card>
        <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 font-semibold text-slate-900">
              <MessageSquare className="h-4 w-4 text-sky-700" />
              Resolve assistant
            </div>
            <p className="mt-1 text-sm text-slate-600">
              Chat coach grounded in your DaVinci Resolve Reference Manual — steps plus PDF page
              citations.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="shrink-0"
            onClick={() => router.push("/ai-editor/resolve-assistant")}
          >
            Open chat
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        </CardBody>
      </Card>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {!loading && resume ? (
        <Card>
          <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-sky-800">
                Continue where you left off
              </p>
              <p className="truncate font-semibold text-slate-900">
                {sessions.find((s) => s.id === resume.projectId)?.projectName ||
                  resume.projectName}
              </p>
              <p className="text-sm text-slate-600">
                Step {resume.stepN}: {resume.stepTitle}
              </p>
              <p className="text-xs text-slate-500">{resume.stepDetail}</p>
            </div>
            <Link
              href={`/projects/${resume.projectId}/ai-editor#${resume.anchor}`}
              className="shrink-0"
            >
              <Button>
                Continue
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardBody>
        </Card>
      ) : null}

      {!loading && insightsStatus === "error" ? (
        <Card>
          <CardBody className="space-y-2">
            <div className="flex items-center gap-2 font-semibold text-slate-900">
              <Sparkles className="h-4 w-4 text-sky-700" />
              Insights
            </div>
            <p className="text-sm text-slate-600">
              Couldn’t load suggestions right now.{" "}
              <button
                type="button"
                className="font-medium text-sky-800 underline"
                onClick={() => void load()}
              >
                Try again
              </button>
            </p>
          </CardBody>
        </Card>
      ) : null}

      {!loading && insightsStatus === "ok" && recommendations.length > 0 ? (
        <Card>
          <CardBody className="space-y-3">
            <div className="flex items-center gap-2 font-semibold text-slate-900">
              <ListChecks className="h-4 w-4 text-sky-700" />
              Suggested next steps
            </div>
            <p className="text-sm text-slate-600">
              Ranked from your checklists, Resolve sync, and workspace setup. No footage leaves
              your drives.
            </p>
            <ul className="space-y-2">
              {recommendations.map((rec) => (
                <li
                  key={rec.id}
                  className="flex flex-col gap-2 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {priorityBadge(rec.priority)}
                      <span className="text-sm font-medium text-slate-900">{rec.title}</span>
                    </div>
                    <p className="text-xs text-slate-600">{rec.detail}</p>
                  </div>
                  {rec.href ? (
                    <Link href={rec.href} className="shrink-0">
                      <Button size="sm" variant="secondary">
                        Open
                        <ArrowRight className="ml-1 h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  ) : null}
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      ) : null}

      {!loading && insightsStatus && insightsStatus !== "error" ? (
        <Card>
          <CardBody className="space-y-3">
            <div className="flex items-center gap-2 font-semibold text-slate-900">
              <Sparkles className="h-4 w-4 text-sky-700" />
              Patterns across your edits
            </div>
            {insightsStatus === "empty" ? (
              <p className="text-sm text-slate-600">
                As you finish edits, sync Resolve, and build next-shoot checklists, suggestions
                and patterns will show up here. No footage leaves your drives.
              </p>
            ) : insights.length === 0 ? (
              <p className="text-sm text-slate-600">
                Patterns will appear once a few projects share the same look or coverage gaps.
              </p>
            ) : (
              <>
                <p className="text-sm text-slate-600">
                  From looks, Resolve sync, and next-shoot checklists
                  {insightsMeta
                    ? ` · ${insightsMeta.withDataCount} of ${insightsMeta.projectCount} projects with data`
                    : ""}
                  . No footage leaves your drives.
                </p>
                <ul className="space-y-2">
                  {insights.map((insight) => (
                    <li
                      key={insight.id}
                      className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5 text-sm text-slate-800"
                    >
                      {insight.text}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </CardBody>
        </Card>
      ) : null}

      {!loading && orgInsights ? (
        <Card>
          <CardBody className="space-y-3">
            <div className="flex items-center gap-2 font-semibold text-slate-900">
              <Building2 className="h-4 w-4 text-sky-700" />
              Patterns across your organization
            </div>
            {!orgInsights.optedIn ? (
              <p className="text-sm text-slate-600">
                Opt in under Settings → AI Editor patterns to see anonymized studio trends (looks,
                Resolve wrap-ups, coverage gaps). Footage never leaves your drives.
                {orgInsights.company ? null : " An organization must be assigned on your account first."}
              </p>
            ) : orgInsights.insights.length === 0 ? (
              <p className="text-sm text-slate-600">
                You’re opted in. Patterns appear once opted-in teammates finish a few edits.
              </p>
            ) : (
              <>
                <p className="text-sm text-slate-600">
                  From opted-in teammates
                  {orgInsights.company ? ` at ${orgInsights.company}` : ""}
                  {` · ${orgInsights.contributorCount} contributor${orgInsights.contributorCount === 1 ? "" : "s"} · ${orgInsights.withDataCount} of ${orgInsights.projectCount} projects with data`}
                  . Counts only — no project names or footage.
                </p>
                <ul className="space-y-2">
                  {orgInsights.insights.map((insight) => (
                    <li
                      key={`org-${insight.id}`}
                      className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5 text-sm text-slate-800"
                    >
                      {insight.text}
                    </li>
                  ))}
                </ul>
              </>
            )}
            {!orgInsights.optedIn ? (
              <Link href="/settings">
                <Button size="sm" variant="secondary">
                  Open settings
                </Button>
              </Link>
            ) : null}
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardBody className="space-y-4">
          <div className="flex items-center gap-2 font-semibold">
            <Plus className="h-4 w-4" />
            New footage-only edit
          </div>
          <p className="text-sm text-zinc-600">
            Use this when you already have clips and do not need a full ShootSpine project (no
            client, script, or coverage required). You can still export to Resolve later.
          </p>
          <form onSubmit={(e) => void onCreate(e)} className="flex flex-col gap-3 sm:flex-row">
            <input
              className="min-w-0 flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
              placeholder="Project name (e.g. Monopoly Night)"
              value={name}
              required
              maxLength={120}
              onChange={(e) => setName(e.target.value)}
            />
            <Button type="submit" disabled={creating || !name.trim()}>
              {creating ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
              Start editing
            </Button>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-3">
          <div className="flex items-center gap-2 font-semibold">
            <Clapperboard className="h-4 w-4" />
            Your footage-only edits
          </div>
          {loading ? (
            <LoadingSpinner className="py-8" />
          ) : sessions.length === 0 ? (
            <p className="text-sm text-zinc-500">No footage-only edits yet.</p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {sessions.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <div className="truncate font-medium text-zinc-900">{s.projectName}</div>
                    <div className="text-xs text-zinc-500">Footage-only · {s.status}</div>
                  </div>
                  <Link href={`/projects/${s.id}/ai-editor`}>
                    <Button size="sm" variant="secondary">
                      Open
                    </Button>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-3">
          <div className="flex items-center gap-2 font-semibold">
            <FolderKanban className="h-4 w-4" />
            Production projects
          </div>
          <p className="text-sm text-zinc-600">
            If the shoot was planned in ShootSpine, open the project and use AI Editor on the
            project spine — it already knows your script, coverage, and cast.
          </p>
          <Link href="/projects">
            <Button variant="outline" size="sm">
              Browse projects
            </Button>
          </Link>
        </CardBody>
      </Card>
    </div>
  );
}
