"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Aperture, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState, PageHeader } from "@/components/ui/PageHeader";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAuth } from "@/contexts/AuthContext";
import { deleteShootGuide, listShootGuides } from "@/lib/shootGuide/apiClient";
import { completedShotCount } from "@/lib/shootGuide/defaults";
import type { ShootGuide } from "@/lib/shootGuide/types";
import { canUseProductionTools } from "@/lib/utils/permissions";
import { useEnsureWorkspace } from "./useEnsureWorkspace";

function formatWhen(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString();
  }
  if (typeof value === "object" && value !== null && "toDate" in value) {
    try {
      return (value as { toDate: () => Date }).toDate().toLocaleDateString();
    } catch {
      return "";
    }
  }
  if (typeof value === "object" && value !== null && "seconds" in value) {
    const seconds = (value as { seconds: number }).seconds;
    return new Date(seconds * 1000).toLocaleDateString();
  }
  return "";
}

function sourceLabel(guide: ShootGuide): string {
  if (guide.sourceType === "script") {
    return guide.sourceSceneLabel
      ? `Script · ${guide.sourceSceneLabel}`
      : "Existing script";
  }
  if (guide.sourceType === "blank") return "Blank";
  return "Quick Scene";
}

export function ShootGuideLibrary() {
  useEnsureWorkspace("scene-builder");
  const { user, appUser, loading: authLoading } = useAuth();
  const [guides, setGuides] = useState<ShootGuide[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const getToken = useCallback(() => {
    if (!user) return Promise.resolve(null);
    return user.getIdToken();
  }, [user]);

  useEffect(() => {
    if (!user || !appUser) return;
    let cancelled = false;
    void listShootGuides(getToken)
      .then(({ guides: next }) => {
        if (cancelled) return;
        setGuides(next);
        setError(null);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load guides");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, appUser, getToken]);

  const allowed = canUseProductionTools(appUser);

  if (authLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user || !appUser) {
    return (
      <div className="p-6">
        <p className="text-sm text-slate-600">Sign in to use Scene Builder.</p>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <PageHeader title="Scene Builder" subtitle="Turn a scene idea into shots, previews, and a production handoff." />
        <p className="text-sm text-slate-600">You do not have access to production tools.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <PageHeader
        title="Scene Builder"
        subtitle="Start with an idea or a photo. Plan the shots, preview them, then send the scene to Production."
        actionLabel="New scene"
        actionHref="/scene-builder/new"
      />

      {error ? (
        <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <LoadingSpinner />
        </div>
      ) : guides.length === 0 ? (
        <EmptyState
          title="No scenes yet"
          description="Describe a scene in plain language. A full script is optional."
          actionLabel="New scene"
          actionHref="/scene-builder/new"
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {guides.map((guide) => {
            const total = guide.shots?.length ?? 0;
            const done = completedShotCount(guide.shots ?? []);
            return (
              <li key={guide.id}>
                <Link
                  href={`/scene-builder/${guide.id}`}
                  className="block rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm ring-1 ring-slate-100 transition hover:border-sky-200 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="mb-2 inline-flex items-center gap-1.5 rounded-lg bg-sky-50 px-2 py-1 text-[11px] font-semibold text-sky-800">
                        <Aperture className="h-3.5 w-3.5" />
                        {sourceLabel(guide)}
                      </div>
                      <h2 className="truncate text-base font-semibold text-slate-900">
                        {guide.title || "Untitled scene"}
                      </h2>
                      <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                        {guide.prompt || guide.overview?.sceneSummary || "No scene description yet."}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      aria-label="Delete scene"
                      disabled={busyId === guide.id}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!window.confirm("Delete this scene?")) return;
                        setBusyId(guide.id);
                        void deleteShootGuide(getToken, guide.id)
                          .then(() => setGuides((prev) => prev.filter((g) => g.id !== guide.id)))
                          .catch((err) =>
                            setError(err instanceof Error ? err.message : "Failed to delete")
                          )
                          .finally(() => setBusyId(null));
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="mt-3 text-xs font-medium text-slate-500">
                    {done}/{total} shots complete
                    {formatWhen(guide.updatedAt) ? ` · ${formatWhen(guide.updatedAt)}` : ""}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-6 sm:hidden">
        <Link href="/scene-builder/new">
          <Button size="touch" className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            New scene
          </Button>
        </Link>
      </div>
    </div>
  );
}
