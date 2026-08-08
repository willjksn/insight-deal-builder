"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clapperboard, FolderKanban, Loader2, Plus, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAuth } from "@/contexts/AuthContext";
import {
  aiEditorCreateSession,
  aiEditorCrossProjectInsights,
  aiEditorListSessions,
  type AiEditorSessionListItem,
} from "@/lib/aiEditor/apiClient";
import { isAiEditorEnabled } from "@/lib/aiEditor/featureFlag";

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
  const [insightsMeta, setInsightsMeta] = useState<{
    projectCount: number;
    withDataCount: number;
  } | null>(null);
  const [name, setName] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const [res, insightRes] = await Promise.all([
        aiEditorListSessions(getToken),
        aiEditorCrossProjectInsights(getToken).catch(() => null),
      ]);
      setSessions(res.sessions);
      if (insightRes) {
        setInsights(insightRes.insights);
        setInsightsMeta({
          projectCount: insightRes.projectCount,
          withDataCount: insightRes.withDataCount,
        });
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

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setCreating(true);
    setError(null);
    try {
      const res = await aiEditorCreateSession(
        getToken,
        name.trim() || "Untitled footage edit"
      );
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

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {!loading && insights.length ? (
        <Card>
          <CardBody className="space-y-3">
            <div className="flex items-center gap-2 font-semibold text-slate-900">
              <Sparkles className="h-4 w-4 text-sky-700" />
              Patterns across your edits
            </div>
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
              placeholder="Name (e.g. Wedding reception selects)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Button type="submit" disabled={creating}>
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
