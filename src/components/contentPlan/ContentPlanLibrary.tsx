"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Clapperboard,
  Copy,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState, PageHeader } from "@/components/ui/PageHeader";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAuth } from "@/contexts/AuthContext";
import {
  cloneContentPlan,
  deleteContentPlan,
  listContentPlans,
} from "@/lib/contentPlan/apiClient";
import type { ContentPlan } from "@/lib/contentPlan/types";

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
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getToken = useCallback(() => {
    if (!user) return Promise.resolve(null);
    return user.getIdToken();
  }, [user]);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const { plans: next } = await listContentPlans(getToken);
      setPlans(next);
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
          <Link href="/content-plans/new">
            <Button type="button">
              <Plus className="mr-1.5 h-4 w-4" />
              New plan
            </Button>
          </Link>
        }
      />

      {error ? (
        <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </p>
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
        <ul className="mt-6 divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
          {plans.map((p) => {
            const title =
              p.creativeBrief?.workingTitle || p.title || "Untitled content plan";
            const when = formatWhen(p.updatedAt) || formatWhen(p.createdAt);
            const busy = busyId === p.id;
            return (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5"
              >
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/content-plans/${p.id}`}
                    className="block truncate text-sm font-semibold text-slate-900 hover:text-sky-800"
                  >
                    {title}
                  </Link>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {p.status}
                    {p.inputs?.contentStyle ? ` · ${p.inputs.contentStyle}` : ""}
                    {p.shots?.length ? ` · ${p.shots.length} shots` : ""}
                    {when ? ` · ${when}` : ""}
                    {p.projectId ? " · linked project" : ""}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
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
      )}
    </div>
  );
}
