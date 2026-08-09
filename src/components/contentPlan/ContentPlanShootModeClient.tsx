"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import {
  CompletionBar,
  ShootModePanel,
} from "@/components/contentPlan/ContentPlanPhase3Panels";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAuth } from "@/contexts/AuthContext";
import {
  getContentPlan,
  updateContentPlan,
} from "@/lib/contentPlan/apiClient";
import type { ContentPlan, ContentShot } from "@/lib/contentPlan/types";

export function ContentPlanShootModeClient({ planId }: { planId: string }) {
  const { user, appUser, loading: authLoading } = useAuth();
  const [plan, setPlan] = useState<ContentPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getToken = useCallback(() => {
    if (!user) return Promise.resolve(null);
    return user.getIdToken();
  }, [user]);

  useEffect(() => {
    if (!user || !appUser) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void getContentPlan(getToken, planId)
      .then(({ plan: next }) => {
        if (!cancelled) setPlan(next);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load plan");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, appUser, getToken, planId]);

  async function onUpdateShots(shots: ContentShot[]) {
    if (!plan) return;
    setPlan({ ...plan, shots });
    setSaving(true);
    try {
      const { plan: next } = await updateContentPlan(getToken, plan.id, { shots });
      setPlan(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save shot updates");
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user || !appUser) {
    return (
      <div className="p-6">
        <p className="text-sm text-slate-600">Sign in to use Shoot Mode.</p>
      </div>
    );
  }

  if (error && !plan) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8">
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </p>
        <Link
          href="/reel-prompts"
          className="mt-4 inline-flex items-center text-sm font-medium text-sky-800 hover:underline"
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back to Content plan
        </Link>
      </div>
    );
  }

  if (!plan) return null;

  const title =
    plan.creativeBrief?.workingTitle || plan.title || "Content plan";

  return (
    <div className="mx-auto max-w-lg px-4 py-4 sm:px-6 sm:py-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href="/reel-prompts"
            className="inline-flex items-center text-sm font-medium text-sky-800 hover:underline"
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Content plan
          </Link>
          <h1 className="mt-2 truncate text-xl font-semibold text-slate-900">
            {title}
          </h1>
          <p className="text-sm text-slate-600">Shoot Mode — on-set shot tracker</p>
        </div>
        {saving ? (
          <span className="inline-flex items-center gap-1 text-xs text-slate-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Saving
          </span>
        ) : null}
      </div>

      {error ? (
        <p className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </p>
      ) : null}

      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <CompletionBar plan={plan} />
        <ShootModePanel
          plan={plan}
          largeControls
          onUpdateShots={(shots) => void onUpdateShots(shots)}
        />
      </div>
    </div>
  );
}
