"use client";

import Link from "next/link";
import { Loader2, Sparkles } from "lucide-react";
import { ContentIdea } from "@/lib/contentIdeas/types";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";

export function IdeaCard({
  idea,
  sessionId,
  creating,
  onCreateProject,
}: {
  idea: ContentIdea;
  sessionId: string;
  creating?: boolean;
  onCreateProject: (ideaId: string) => void;
}) {
  const score = idea.score?.overall;

  return (
    <Card className="h-full">
      <CardBody className="flex h-full flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-slate-900">{idea.title}</h3>
          {typeof score === "number" && (
            <span className="shrink-0 rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700">
              {score}/10
            </span>
          )}
        </div>
        <p className="text-sm font-medium text-slate-700">{idea.hook}</p>
        <p className="text-sm text-slate-600">{idea.summary}</p>
        <div className="flex flex-wrap gap-2 text-xs text-slate-500">
          {idea.recommendedPlatform && <span>{idea.recommendedPlatform}</span>}
          {idea.recommendedFormat && <span>· {idea.recommendedFormat.replace(/_/g, " ")}</span>}
          {idea.estimatedShootTime && <span>· {idea.estimatedShootTime}</span>}
        </div>
        {idea.production?.recommendedLocation && (
          <p className="text-xs text-slate-500">Location: {idea.production.recommendedLocation}</p>
        )}
        <div className="mt-auto flex flex-wrap gap-2 pt-2">
          {idea.projectId ? (
            <>
              <Link href={`/projects/${idea.projectId}`}>
                <Button size="sm" variant="secondary">
                  Open project
                </Button>
              </Link>
              {idea.scriptSessionId && (
                <Link href={`/script-writer/${idea.scriptSessionId}`}>
                  <Button size="sm">Script writer</Button>
                </Link>
              )}
            </>
          ) : (
            <Button size="sm" disabled={creating} onClick={() => onCreateProject(idea.id)}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="mr-1 h-4 w-4" />}
              Create project + script
            </Button>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
