"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  contentIdeasCreateProjectFromIdea,
  contentIdeasGenerate,
  contentIdeasGetSession,
} from "@/lib/contentIdeas/apiClient";
import { ContentIdea, IdeaGenerationSession } from "@/lib/contentIdeas/types";
import { IdeaCard } from "@/components/contentIdeas/IdeaCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export default function IdeaSessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { user } = useAuth();
  const [session, setSession] = useState<IdeaGenerationSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [creatingId, setCreatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    if (!user || !sessionId) return;
    contentIdeasGetSession(() => user.getIdToken(), sessionId)
      .then(({ session: s }) => setSession(s))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  };

  useEffect(load, [user, sessionId]);

  const regenerate = async () => {
    if (!user || !sessionId) return;
    setRegenerating(true);
    setError(null);
    try {
      const { session: s } = await contentIdeasGenerate(() => user.getIdToken(), sessionId);
      setSession(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Regenerate failed");
    } finally {
      setRegenerating(false);
    }
  };

  const createProject = async (ideaId: string) => {
    if (!user || !sessionId) return;
    setCreatingId(ideaId);
    setError(null);
    try {
      const res = await contentIdeasCreateProjectFromIdea(() => user.getIdToken(), sessionId, { ideaId });
      setSession((prev) => {
        if (!prev) return prev;
        const ideas = prev.ideas.map((i: ContentIdea) =>
          i.id === ideaId
            ? { ...i, projectId: res.projectId, scriptSessionId: res.scriptSessionId, status: "converted_to_project" }
            : i
        );
        return { ...prev, ideas };
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create project failed");
    } finally {
      setCreatingId(null);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!session) return <p className="p-8 text-slate-600">Session not found.</p>;

  const trends = session.trendsResearch;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
      <Link
        href="/content"
        className="mb-4 inline-flex items-center text-sm text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to Content development
      </Link>
      <PageHeader
        title={session.title ?? "Weekly ideas"}
        subtitle={session.campaignSummary ?? session.inputs.roughIdea}
        action={
          <Button variant="secondary" onClick={regenerate} disabled={regenerating}>
            {regenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Regenerate
          </Button>
        }
      />

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {trends && (
        <Card className="mb-6">
          <CardBody>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Weekly trend baseline</p>
            <p className="mt-1 text-sm text-slate-700">
              {trends.source === "cache" ? "Cached weekly snapshot" : trends.source}
              {trends.searchedAt ? ` · ${new Date(trends.searchedAt).toLocaleDateString()}` : ""}
              {session.trendsContentType ? ` · ${session.trendsContentType}` : ""}
            </p>
            {!trends.searchedAt && (
              <p className="mt-2 text-sm text-amber-700">
                No weekly snapshot yet for this format. Ideas rely on profile and inputs until admin cron refreshes trends.
              </p>
            )}
          </CardBody>
        </Card>
      )}

      {session.recommendedStrategy && (
        <p className="mb-6 text-sm text-slate-600">{session.recommendedStrategy}</p>
      )}

      {session.weeklySchedule && session.weeklySchedule.length > 0 && (
        <Card className="mb-8">
          <CardBody>
            <h2 className="mb-3 font-semibold text-slate-900">Suggested week</h2>
            <ol className="space-y-2 text-sm">
              {session.weeklySchedule.map((day) => (
                <li key={day.day + day.title} className="flex gap-3">
                  <span className="w-16 shrink-0 font-medium text-sky-700">{day.day}</span>
                  <span>{day.title} — {day.hook ?? day.summary}</span>
                </li>
              ))}
            </ol>
          </CardBody>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {session.ideas.map((idea) => (
          <IdeaCard
            key={idea.id}
            idea={idea}
            sessionId={session.id}
            creating={creatingId === idea.id}
            onCreateProject={createProject}
          />
        ))}
      </div>
    </div>
  );
}
