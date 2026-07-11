"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Lightbulb, Plus, Trash2, UserCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { contentIdeasDeleteSession, contentIdeasListSessions } from "@/lib/contentIdeas/apiClient";
import { IdeaGenerationSession } from "@/lib/contentIdeas/types";
import { canUseProductionTools } from "@/lib/utils/permissions";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export default function ContentDashboardPage() {
  const { user, appUser } = useAuth();
  const [sessions, setSessions] = useState<IdeaGenerationSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<IdeaGenerationSession | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user || !canUseProductionTools(appUser)) return;
    contentIdeasListSessions(() => user.getIdToken())
      .then((res) => setSessions(res.sessions))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [user, appUser]);

  const confirmDelete = async () => {
    if (!user || !deleteTarget) return;
    setDeleting(true);
    setError(null);
    try {
      await contentIdeasDeleteSession(() => user.getIdToken(), deleteTarget.id);
      setSessions((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  if (!canUseProductionTools(appUser)) {
    return (
      <div className="p-6">
        <p className="text-slate-600">Content development tools require production access.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
      <PageHeader
        title="Content development"
        subtitle="Weekly idea engine uses saved brand profiles and weekly trend snapshots."
        action={
          <Link href="/content/ideas/new">
            <Button size="touch">
              <Plus className="mr-2 h-4 w-4" />
              Generate weekly ideas
            </Button>
          </Link>
        }
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <Link href="/content/ideas/new">
          <Card className="transition hover:border-sky-300">
            <CardBody className="flex items-center gap-3">
              <Lightbulb className="h-8 w-8 text-sky-600" />
              <div>
                <p className="font-semibold text-slate-900">Weekly Idea Engine</p>
                <p className="text-sm text-slate-600">Profile + goals → filmable concepts</p>
              </div>
            </CardBody>
          </Card>
        </Link>
        <Link href="/content/profiles">
          <Card className="transition hover:border-sky-300">
            <CardBody className="flex items-center gap-3">
              <UserCircle className="h-8 w-8 text-sky-600" />
              <div>
                <p className="font-semibold text-slate-900">Brand profiles</p>
                <p className="text-sm text-slate-600">Full identity, audience, production prefs</p>
              </div>
            </CardBody>
          </Card>
        </Link>
        <Link href="/content/ideas/bank">
          <Card className="transition hover:border-sky-300">
            <CardBody>
              <p className="font-semibold text-slate-900">Saved ideas</p>
              <p className="text-sm text-slate-600">Browse ideas from past sessions</p>
            </CardBody>
          </Card>
        </Link>
      </div>

      <h2 className="mb-4 text-lg font-semibold text-slate-900">Recent sessions</h2>
      {loading && <LoadingSpinner />}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!loading && sessions.length === 0 && (
        <p className="text-sm text-slate-600">No idea sessions yet. Start with a brand profile or jump straight into generation.</p>
      )}
      <div className="space-y-3">
        {sessions.map((s) => (
          <Card key={s.id} className="transition hover:border-sky-200">
            <CardBody className="flex items-center justify-between gap-4">
              <Link href={`/content/ideas/${s.id}`} className="min-w-0 flex-1">
                <p className="font-medium text-slate-900">{s.title ?? "Weekly ideas"}</p>
                <p className="text-sm text-slate-600 line-clamp-1">{s.inputs.roughIdea}</p>
              </Link>
              <div className="flex shrink-0 items-center gap-3">
                <span className="text-xs text-slate-500">{s.ideas?.length ?? 0} ideas</span>
                <button
                  type="button"
                  className="text-slate-400 hover:text-red-600"
                  aria-label={`Delete ${s.title ?? "session"}`}
                  onClick={() => setDeleteTarget(s)}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete idea session?"
        description="This removes the session and its generated ideas. Projects already created from ideas are not deleted."
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
