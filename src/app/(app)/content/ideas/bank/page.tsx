"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { contentIdeasListSessions } from "@/lib/contentIdeas/apiClient";
import { ContentIdea, IdeaGenerationSession } from "@/lib/contentIdeas/types";
import { PageHeader, EmptyState } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

type BankEntry = ContentIdea & { sessionId: string; sessionTitle?: string };

export default function IdeaBankPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<IdeaGenerationSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    contentIdeasListSessions(() => user.getIdToken())
      .then((res) => setSessions(res.sessions))
      .finally(() => setLoading(false));
  }, [user]);

  const ideas = useMemo(() => {
    const out: BankEntry[] = [];
    for (const s of sessions) {
      for (const idea of s.ideas ?? []) {
        if (idea.saved !== false) {
          out.push({ ...idea, sessionId: s.id, sessionTitle: s.title });
        }
      }
    }
    return out;
  }, [sessions]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
      <PageHeader title="Saved ideas" subtitle="Ideas from past weekly generation sessions." />
      {loading && <LoadingSpinner />}
      {!loading && ideas.length === 0 && (
        <EmptyState
          title="No saved ideas yet"
          description="Generate a weekly batch to populate your idea bank."
          actionLabel="Generate ideas"
          actionHref="/content/ideas/new"
        />
      )}
      <div className="space-y-3">
        {ideas.map((idea) => (
          <Link key={`${idea.sessionId}-${idea.id}`} href={`/content/ideas/${idea.sessionId}`}>
            <Card className="transition hover:border-sky-200">
              <CardBody>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-slate-900">{idea.title}</p>
                    <p className="text-sm text-slate-600 line-clamp-2">{idea.hook}</p>
                    <p className="mt-1 text-xs text-slate-500">{idea.sessionTitle}</p>
                  </div>
                  {idea.score?.overall != null && (
                    <span className="text-xs font-medium text-sky-700">{idea.score.overall}/10</span>
                  )}
                </div>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
