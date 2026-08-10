"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  FolderKanban,
  Loader2,
  MonitorSmartphone,
  RefreshCw,
} from "lucide-react";
import {
  CompletionBar,
  ShootModePanel,
} from "@/components/contentPlan/ContentPlanPhase3Panels";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAuth } from "@/contexts/AuthContext";
import {
  getContentPlan,
  syncShootProgressToBoard,
  updateContentPlan,
} from "@/lib/contentPlan/apiClient";
import { downloadContentPlanOnePagerPdf } from "@/lib/contentPlan/exportPdf";
import {
  allShotsCompleted,
  countCompletedShots,
  normalizeProductionStage,
  productionStageLabel,
} from "@/lib/contentPlan/productionStage";
import type { ContentPlan, ContentShot } from "@/lib/contentPlan/types";

export function ContentPlanShootModeClient({ planId }: { planId: string }) {
  const { user, appUser, loading: authLoading } = useAuth();
  const [plan, setPlan] = useState<ContentPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncingBoard, setSyncingBoard] = useState(false);
  const [statusNote, setStatusNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const stagePromoted = useRef(false);

  const getToken = useCallback(() => {
    if (!user) return Promise.resolve(null);
    return user.getIdToken();
  }, [user]);

  useEffect(() => {
    if (!user || !appUser) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    stagePromoted.current = false;
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

  // Promote planning / ready → shooting when Shoot Mode opens.
  useEffect(() => {
    if (!plan || stagePromoted.current) return;
    const stage = normalizeProductionStage(plan.productionStage);
    if (stage === "shooting" || stage === "wrapped") {
      stagePromoted.current = true;
      return;
    }
    stagePromoted.current = true;
    void updateContentPlan(getToken, plan.id, { productionStage: "shooting" })
      .then(({ plan: next }) => setPlan(next))
      .catch(() => undefined);
  }, [plan, getToken]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("wakeLock" in navigator)) {
      return;
    }
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;

    const request = async () => {
      try {
        lock = await navigator.wakeLock.request("screen");
        if (cancelled) {
          void lock.release();
          lock = null;
          return;
        }
        setWakeLockActive(true);
        lock.addEventListener("release", () => {
          if (!cancelled) setWakeLockActive(false);
        });
      } catch {
        if (!cancelled) setWakeLockActive(false);
      }
    };

    void request();
    const onVisibility = () => {
      if (document.visibilityState === "visible") void request();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      void lock?.release();
      setWakeLockActive(false);
    };
  }, []);

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

  async function onSyncToBoard() {
    if (!plan?.projectId) return;
    setSyncingBoard(true);
    setError(null);
    setStatusNote(null);
    try {
      // Persist latest take checkoffs before overlaying the board.
      await updateContentPlan(getToken, plan.id, { shots: plan.shots });
      const result = await syncShootProgressToBoard(getToken, plan.id);
      setStatusNote(
        result.updatedCount
          ? `Synced ${result.updatedCount} shot${result.updatedCount === 1 ? "" : "s"} to the production board.`
          : "Board already matched Shoot Mode — nothing to update."
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not sync to board");
    } finally {
      setSyncingBoard(false);
    }
  }

  async function onMarkWrapped() {
    if (!plan) return;
    setSaving(true);
    setError(null);
    setStatusNote(null);
    try {
      const { plan: next } = await updateContentPlan(getToken, plan.id, {
        productionStage: "wrapped",
        shots: plan.shots,
      });
      setPlan(next);
      if (next.projectId) {
        try {
          const result = await syncShootProgressToBoard(getToken, next.id);
          setStatusNote(
            result.updatedCount
              ? `Wrapped · synced ${result.updatedCount} shot${
                  result.updatedCount === 1 ? "" : "s"
                } to the board.`
              : "Wrapped · board already up to date."
          );
        } catch {
          setStatusNote("Wrapped · board sync failed — use Sync to board.");
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not mark wrapped");
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
          href={`/content-plans/${planId}`}
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
  const stage = normalizeProductionStage(plan.productionStage);
  const { done, total } = countCompletedShots(plan.shots);
  const canWrap = allShotsCompleted(plan) && stage !== "wrapped";

  return (
    <div className="mx-auto max-w-lg px-4 py-4 sm:px-6 sm:py-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/content-plans/${plan.id}`}
            className="inline-flex items-center text-sm font-medium text-sky-800 hover:underline"
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Content plan
          </Link>
          <h1 className="mt-2 truncate text-xl font-semibold text-slate-900">
            {title}
          </h1>
          <p className="text-sm text-slate-600">
            Shoot Mode · {productionStageLabel(stage)}
            {total ? ` · ${done}/${total} done` : ""}
          </p>
          {wakeLockActive ? (
            <p className="mt-1 inline-flex items-center gap-1 text-xs text-emerald-700">
              <MonitorSmartphone className="h-3.5 w-3.5" />
              Screen stays on
            </p>
          ) : null}
        </div>
        {saving ? (
          <span className="inline-flex items-center gap-1 text-xs text-slate-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Saving
          </span>
        ) : null}
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => {
            try {
              downloadContentPlanOnePagerPdf(plan);
            } catch (e) {
              setError(e instanceof Error ? e.message : "One-pager failed");
            }
          }}
        >
          <Download className="mr-1.5 h-3.5 w-3.5" />
          One-pager
        </Button>
        {plan.projectId ? (
          <>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={saving || syncingBoard}
              onClick={() => void onSyncToBoard()}
            >
              {syncingBoard ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              )}
              Sync to board
            </Button>
            <Link href={`/projects/${plan.projectId}/production`}>
              <Button type="button" size="sm" variant="secondary">
                <FolderKanban className="mr-1.5 h-3.5 w-3.5" />
                Production board
              </Button>
            </Link>
          </>
        ) : null}
        {canWrap ? (
          <Button
            type="button"
            size="sm"
            disabled={saving || syncingBoard}
            onClick={() => void onMarkWrapped()}
          >
            Mark wrapped
          </Button>
        ) : null}
        {stage === "wrapped" ? (
          <span className="inline-flex items-center rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800">
            Wrapped
          </span>
        ) : null}
      </div>

      {statusNote ? (
        <p className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {statusNote}
        </p>
      ) : null}

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
