"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Clapperboard,
  Copy,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { EmptyState, PageHeader } from "@/components/ui/PageHeader";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAuth } from "@/contexts/AuthContext";
import {
  cloneContentPlan,
  deleteContentPlan,
  listContentPlans,
  updateContentPlan,
} from "@/lib/contentPlan/apiClient";
import { listContentPlanPitchSessions } from "@/lib/contentPlan/pitchApiClient";
import type { ContentPlanPitchSession } from "@/lib/contentPlan/pitchTypes";
import {
  countCompletedShots,
  normalizeProductionStage,
  productionStageLabel,
} from "@/lib/contentPlan/productionStage";
import {
  CONTENT_PLAN_PRODUCTION_STAGES,
  type ContentPlan,
  type ContentPlanProductionStage,
} from "@/lib/contentPlan/types";
import { cn } from "@/lib/utils/cn";

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

export function ContentPlanLibrary() {
  const router = useRouter();
  const { user, appUser, loading: authLoading } = useAuth();
  const [plans, setPlans] = useState<ContentPlan[]>([]);
  const [pitchSessions, setPitchSessions] = useState<ContentPlanPitchSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stageFilter, setStageFilter] = useState<"all" | ContentPlanProductionStage>(
    "all"
  );
  const [query, setQuery] = useState("");

  const getToken = useCallback(() => {
    if (!user) return Promise.resolve(null);
    return user.getIdToken();
  }, [user]);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const [{ plans: next }, pitch] = await Promise.all([
        listContentPlans(getToken),
        listContentPlanPitchSessions(getToken).catch(() => ({ sessions: [] })),
      ]);
      setPlans(next);
      setPitchSessions(pitch.sessions.slice(0, 6));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load plans");
    } finally {
      setLoading(false);
    }
  }, [user, getToken]);

  useEffect(() => {
    if (!user || !appUser) return;
    void refresh();
  }, [user, appUser, refresh]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return plans.filter((p) => {
      const stage = normalizeProductionStage(p.productionStage);
      if (stageFilter !== "all" && stage !== stageFilter) return false;
      if (!q) return true;
      const title = (p.creativeBrief?.workingTitle || p.title || "").toLowerCase();
      const idea = (p.inputs?.idea || "").toLowerCase();
      return title.includes(q) || idea.includes(q);
    });
  }, [plans, stageFilter, query]);

  async function onSetStage(id: string, productionStage: ContentPlanProductionStage) {
    setBusyId(id);
    setError(null);
    try {
      const { plan } = await updateContentPlan(getToken, id, { productionStage });
      setPlans((prev) => prev.map((p) => (p.id === id ? plan : p)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update stage");
    } finally {
      setBusyId(null);
    }
  }

  async function onClone(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const { plan } = await cloneContentPlan(getToken, id);
      router.push(`/content-plans/${plan.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not duplicate plan");
      setBusyId(null);
    }
  }

  async function onDelete(id: string, title: string) {
    const ok = window.confirm(
      `Delete “${title || "this plan"}”? This cannot be undone.\n\nLinked projects are not deleted.`
    );
    if (!ok) return;
    setBusyId(id);
    setError(null);
    try {
      await deleteContentPlan(getToken, id);
      setPlans((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete plan");
    } finally {
      setBusyId(null);
    }
  }

  if (authLoading || (loading && !plans.length && !error)) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user || !appUser) {
    return (
      <div className="p-6">
        <p className="text-sm text-slate-600">Sign in to use Content plan director.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <PageHeader
        title="Content plans"
        subtitle="Saved production plans — brief, shots, shoot order, and AI Editor handoff."
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/content-plans/pitch">
              <Button type="button" variant="secondary">
                <Sparkles className="mr-1.5 h-4 w-4" />
                Pitch ideas for a package
              </Button>
            </Link>
            <Link href="/content-plans/new">
              <Button type="button">
                <Plus className="mr-1.5 h-4 w-4" />
                New plan
              </Button>
            </Link>
          </div>
        }
      />

      {error ? (
        <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </p>
      ) : null}

      {pitchSessions.length ? (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-900">Recent package pitches</h3>
            <Link
              href="/content-plans/pitch"
              className="text-xs font-medium text-sky-800 hover:underline"
            >
              New pitch
            </Link>
          </div>
          <ul className="mt-2 divide-y divide-slate-100">
            {pitchSessions.map((s) => {
              const ideaCount = (s.ideas || []).filter(
                (i) => i.status !== "dismissed"
              ).length;
              const developed = (s.ideas || []).filter((i) => i.contentPlanId).length;
              return (
                <li key={s.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <Link
                      href={`/content-plans/pitch/${s.id}`}
                      className="truncate text-sm font-medium text-slate-900 hover:text-sky-800"
                    >
                      {s.clientName || s.packageName}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {s.packageName}
                      {ideaCount ? ` · ${ideaCount} ideas` : ""}
                      {developed ? ` · ${developed} plans` : ""}
                    </p>
                  </div>
                  <Link href={`/content-plans/pitch/${s.id}`}>
                    <Button type="button" size="sm" variant="secondary">
                      Open
                    </Button>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {!loading && plans.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No content plans yet"
            description="Start from an idea to generate a shootable brief, shot list, and on-set checklist."
            actionLabel="Create a plan"
            actionHref="/content-plans/new"
          />
        </div>
      ) : (
        <>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search plans…"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ring-sky-200 focus:ring-2 sm:max-w-xs"
            />
            <Select
              value={stageFilter}
              onChange={(e) =>
                setStageFilter(e.target.value as "all" | ContentPlanProductionStage)
              }
              options={[
                { value: "all", label: "All stages" },
                ...CONTENT_PLAN_PRODUCTION_STAGES.map((s) => ({
                  value: s.value,
                  label: s.label,
                })),
              ]}
            />
          </div>
          {!loading && filtered.length === 0 ? (
            <p className="mt-6 text-sm text-slate-600">No plans match this filter.</p>
          ) : null}
          <ul className="mt-4 divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
          {filtered.map((p) => {
            const title =
              p.creativeBrief?.workingTitle || p.title || "Untitled content plan";
            const when = formatWhen(p.updatedAt) || formatWhen(p.createdAt);
            const busy = busyId === p.id;
            const stage = normalizeProductionStage(p.productionStage);
            const { done, total } = countCompletedShots(p.shots);
            return (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/content-plans/${p.id}`}
                      className="truncate text-sm font-semibold text-slate-900 hover:text-sky-800"
                    >
                      {title}
                    </Link>
                    <span
                      className={cn(
                        "rounded-md px-1.5 py-0.5 text-[11px] font-medium",
                        stage === "wrapped"
                          ? "bg-emerald-50 text-emerald-800"
                          : stage === "shooting"
                            ? "bg-amber-50 text-amber-900"
                            : stage === "ready_to_shoot"
                              ? "bg-sky-50 text-sky-800"
                              : "bg-slate-100 text-slate-700"
                      )}
                    >
                      {productionStageLabel(stage)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {p.inputs?.contentStyle ? `${p.inputs.contentStyle} · ` : ""}
                    {total ? `${done}/${total} shots done` : "No shots yet"}
                    {when ? ` · ${when}` : ""}
                    {p.projectId ? " · linked project" : ""}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                  <div className="min-w-[140px]">
                    <Select
                      value={stage}
                      onChange={(e) =>
                        void onSetStage(
                          p.id,
                          e.target.value as ContentPlanProductionStage
                        )
                      }
                      options={CONTENT_PLAN_PRODUCTION_STAGES.map((s) => ({
                        value: s.value,
                        label: s.label,
                      }))}
                      disabled={busy}
                    />
                  </div>
                  <Link href={`/content-plans/${p.id}`}>
                    <Button type="button" size="sm" variant="secondary" disabled={busy}>
                      Open
                    </Button>
                  </Link>
                  {p.shots?.length ? (
                    <Link href={`/content-plans/${p.id}/shoot`}>
                      <Button type="button" size="sm" variant="secondary" disabled={busy}>
                        <Clapperboard className="mr-1 h-3.5 w-3.5" />
                        Shoot
                      </Button>
                    </Link>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={busy}
                    onClick={() => void onClone(p.id)}
                    title="Duplicate plan"
                  >
                    {busy ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={busy}
                    onClick={() => void onDelete(p.id, title)}
                    title="Delete plan"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
        </>
      )}
    </div>
  );
}
