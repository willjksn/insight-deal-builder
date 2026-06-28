"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { PenLine, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  DEFAULT_SCRIPT_BRIEF,
  ScriptWriterIntakeForm,
} from "@/components/scriptWriter/ScriptWriterIntakeForm";
import { useAuth } from "@/contexts/AuthContext";
import {
  scriptWriterCreateSession,
  scriptWriterListSessions,
} from "@/lib/scriptWriter/apiClient";
import {
  isBriefComplete,
  ScriptWriterBrief,
} from "@/lib/scriptWriter/brief";
import { ScriptWriterSession } from "@/lib/scriptWriter/types";
import { canUseShotScout } from "@/lib/utils/permissions";

function ScriptWriterPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, appUser } = useAuth();
  const allowed = canUseShotScout(appUser);
  const [brief, setBrief] = useState<ScriptWriterBrief>(DEFAULT_SCRIPT_BRIEF);
  const [creating, setCreating] = useState(false);
  const [sessions, setSessions] = useState<ScriptWriterSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [linkedProjectId, setLinkedProjectId] = useState<string>();
  const [linkedScoutProjectId, setLinkedScoutProjectId] = useState<string>();
  const [title, setTitle] = useState<string>();

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
    if (!user || !allowed) return;
    setLoading(true);
    scriptWriterListSessions(() => user.getIdToken())
      .then((res) => setSessions(res.sessions as ScriptWriterSession[]))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [user, allowed]);

  const start = async () => {
    if (!user || !isBriefComplete(brief)) return;
    setCreating(true);
    setError(null);
    try {
      const { id } = await scriptWriterCreateSession(() => user.getIdToken(), {
        brief,
        initialIdea: brief.concept.trim(),
        title: title ?? brief.concept.trim().slice(0, 60),
        linkedProjectId,
        linkedScoutProjectId,
      });
      router.push(`/script-writer/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start session");
    } finally {
      setCreating(false);
    }
  };

  if (!allowed) {
    return (
      <div className="py-20 text-center text-slate-500">
        <p>You don&apos;t have access to Script writer.</p>
      </div>
    );
  }

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
          <ScriptWriterIntakeForm brief={brief} onChange={setBrief} />
          <div className="flex justify-end border-t border-slate-100 pt-4">
            <Button
              type="button"
              size="lg"
              disabled={creating || !isBriefComplete(brief)}
              onClick={() => void start()}
              className="bg-gradient-to-b from-violet-500 to-violet-600 shadow-violet-500/25 hover:from-violet-600 hover:to-violet-700 focus:ring-violet-400"
            >
              <PenLine className="mr-2 h-4 w-4" />
              {creating ? "Opening writer…" : "Begin script"}
            </Button>
          </div>
        </CardBody>
      </Card>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Recent scripts
        </h2>
        {loading ? (
          <LoadingSpinner className="py-8" />
        ) : sessions.length === 0 ? (
          <p className="text-sm text-slate-500">No scripts yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
            {sessions.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/script-writer/${s.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
                    <ScrollText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-900">{s.title}</p>
                    <p className="truncate text-xs text-slate-500">
                      {s.status === "applied"
                        ? "Applied to project"
                        : s.status === "script_ready"
                          ? "Script ready"
                          : "In progress"}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
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
