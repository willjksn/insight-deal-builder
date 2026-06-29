"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, Clapperboard, Copy, FileDown, FolderKanban, Camera, Lightbulb, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ScoutShell, ScoutCard, ScoutScoreBadge } from "@/components/scout/ScoutShell";
import { useAuth } from "@/contexts/AuthContext";
import { useConditionalCollection } from "@/hooks/useConditionalCollection";
import { useScoutProjects } from "@/hooks/useScoutProjects";
import { duplicateScoutProject } from "@/lib/firebase/scoutFirestore";
import { scoutDeleteSession } from "@/lib/scout/apiClient";
import { canLinkScoutToProject, canUseShotScout } from "@/lib/utils/permissions";
import { MOOD_LABEL, SCENE_TYPE_LABEL, SCOUT_STATUS_LABEL } from "@/lib/scout/constants";
import { formatProjectLinkLabel, projectsForScoutLinkDisplay } from "@/lib/utils/scoutProjectLink";
import { Project } from "@/lib/types";

export default function ScoutDashboardPage() {
  const router = useRouter();
  const { user, appUser } = useAuth();
  const canLinkProjects = canLinkScoutToProject(appUser);
  const { data: projects } = useConditionalCollection<Project>("projects", canLinkProjects);
  const linkableProjects = projectsForScoutLinkDisplay(projects);
  const { data, loading, error, refresh } = useScoutProjects(user?.uid, user ? () => user.getIdToken() : undefined);
  const [duplicating, setDuplicating] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDuplicateWithoutEvent = async (sessionId: string) => {
    if (!user?.uid) return;
    setDuplicating(sessionId);
    try {
      const newId = await duplicateScoutProject(user.uid, sessionId);
      router.push(`/scout/${newId}`);
    } finally {
      setDuplicating(null);
    }
  };

  const handleDeleteWithoutEvent = async (sessionId: string, name: string) => {
    if (!user?.uid) return;
    if (
      !confirm(
        `Delete "${name}"?\n\nThis removes all photos, analysis, DP plans, and previs. This cannot be undone.`
      )
    ) {
      return;
    }
    setDeleting(sessionId);
    try {
      await scoutDeleteSession(sessionId);
      await refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(null);
    }
  };

  const formatUpdated = (ts: unknown) => {
    if (!ts || typeof ts !== "object" || !("seconds" in (ts as object))) return "";
    const d = new Date((ts as { seconds: number }).seconds * 1000);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  if (loading) return <LoadingSpinner className="py-20" />;
  if (!canUseShotScout(appUser) && data.length === 0 && error) {
    return (
      <div className="py-20 text-center">
        <h2 className="text-xl font-semibold text-slate-900">Shot Scout</h2>
        <p className="mt-2 text-slate-500">
          Ask your admin for Shot Scout permission to scout locations and build DP plans.
        </p>
      </div>
    );
  }

  return (
    <ScoutShell>
      <PageHeader
        title="Shot Scout"
        subtitle="Upload location photos on set. AI ranks the best angle, builds a DP plan, shot list, and camera settings for your gear."
        action={
          <Button size="touch" onClick={() => router.push("/scout/new")}>
            <Plus className="mr-2 h-5 w-5" />
            New session
          </Button>
        }
      />

      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/scout/new">
          <ScoutCard className="flex h-full items-center gap-3 transition hover:border-sky-300 hover:shadow-lg">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-blue-500 text-white shadow-md shadow-sky-500/25">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium text-slate-900">New scout session</p>
              <p className="text-xs text-slate-500">Start from scratch</p>
            </div>
          </ScoutCard>
        </Link>
        <Link href="/settings/scout-gear">
          <ScoutCard className="flex h-full items-center gap-3 transition hover:border-sky-300 hover:shadow-lg">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-600 to-slate-800 text-white shadow-md">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium text-slate-900">My gear</p>
              <p className="text-xs text-slate-500">Gear list &amp; kits</p>
            </div>
          </ScoutCard>
        </Link>
        <Link href="/settings/lights">
          <ScoutCard className="flex h-full items-center gap-3 transition hover:border-sky-300 hover:shadow-lg">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-md">
              <Lightbulb className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium text-slate-900">Lighting fixtures</p>
              <p className="text-xs text-slate-500">Amaran, SmallRig, practicals</p>
            </div>
          </ScoutCard>
        </Link>
      </div>

      {canLinkProjects && linkableProjects.length > 0 && (
        <ScoutCard className="mb-8">
          <h2 className="text-sm font-semibold text-slate-900">Scout for a project</h2>
          <p className="mt-1 text-xs text-slate-500">
            Link a new session to a job in{" "}
            <Link href="/projects" className="text-sky-600 hover:underline">
              Projects
            </Link>
            .
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {linkableProjects.slice(0, 12).map((p) => (
              <Link
                key={p.id}
                href={`/scout/new?projectId=${p.id}`}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-sm text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-900"
              >
                <FolderKanban className="h-4 w-4 shrink-0 text-slate-400" />
                <span className="truncate">{formatProjectLinkLabel(p)}</span>
              </Link>
            ))}
          </div>
        </ScoutCard>
      )}

      {loading ? (
        <LoadingSpinner className="py-20" />
      ) : data.length === 0 ? (
        <ScoutCard className="py-16 text-center">
          <Clapperboard className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="text-slate-600">No scout sessions yet.</p>
          <Button className="mt-4" size="touch" onClick={() => router.push("/scout/new")}>
            Start your first scout
          </Button>
        </ScoutCard>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((session) => {
            const bestScore = session.latestAnalysis?.perImage.find(
              (p) => p.imageId === session.bestImageId
            )?.score;
            return (
              <ScoutCard
                key={session.id}
                className="group h-full overflow-hidden p-0 transition hover:border-sky-300 hover:shadow-lg"
              >
                <Link href={`/scout/${session.id}`} className="block">
                  <div className="aspect-video bg-slate-100">
                    {session.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={session.thumbnailUrl}
                        alt=""
                        className="h-full w-full object-cover transition group-hover:opacity-95"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-slate-300">
                        <Clapperboard className="h-10 w-10" />
                      </div>
                    )}
                  </div>
                  <div className="p-4 pb-0">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="font-semibold text-slate-900 group-hover:text-sky-800">
                        {session.projectName}
                      </h2>
                      {bestScore != null && <ScoutScoreBadge score={bestScore} />}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {SCENE_TYPE_LABEL[session.sceneType]} · {MOOD_LABEL[session.mood]}
                    </p>
                    {session.linkedProjectName && (
                      <p className="mt-1 truncate text-xs text-sky-600">{session.linkedProjectName}</p>
                    )}
                    <p className="mt-2 text-xs font-medium text-slate-500">
                      {SCOUT_STATUS_LABEL[session.status] ?? session.status}
                      {session.updatedAt ? ` · ${formatUpdated(session.updatedAt)}` : ""}
                    </p>
                  </div>
                </Link>
                <div className="mt-3 flex flex-wrap gap-2 px-4 pb-4">
                  <Link
                    href={`/scout/${session.id}/edit`}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 hover:border-sky-200 hover:text-sky-800"
                  >
                    <Pencil className="h-3 w-3" />
                    Edit
                  </Link>
                  <button
                    type="button"
                    onClick={() => void handleDuplicateWithoutEvent(session.id)}
                    disabled={duplicating === session.id || deleting === session.id}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 hover:border-sky-200 hover:text-sky-800 disabled:opacity-50"
                  >
                    <Copy className="h-3 w-3" />
                    {duplicating === session.id ? "Copying…" : "Duplicate"}
                  </button>
                  {session.latestDpPlan && (
                    <Link
                      href={`/scout/${session.id}/export`}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 hover:border-sky-200 hover:text-sky-800"
                    >
                      <FileDown className="h-3 w-3" />
                      Export
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => void handleDeleteWithoutEvent(session.id, session.projectName)}
                    disabled={deleting === session.id || duplicating === session.id}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-red-600 hover:border-red-200 hover:bg-red-50 disabled:opacity-50"
                  >
                    <Trash2 className="h-3 w-3" />
                    {deleting === session.id ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </ScoutCard>
            );
          })}
        </div>
      )}
    </ScoutShell>
  );
}
