"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { getCreatorPortalMe, updateCreatorPortalMe } from "@/lib/creators/apiClient";
import { CREATOR_AGREEMENT_ONBOARDING_TASK_ID } from "@/lib/creators/networkAgreementContent";
import {
  CREATOR_ID_ONBOARDING_TASK_ID,
  sanitizeCreatorOnboarding,
  type CreatorOnboardingTask,
} from "@/lib/creators/types";

const LOCKED_TASK_IDS = new Set([
  CREATOR_AGREEMENT_ONBOARDING_TASK_ID,
  CREATOR_ID_ONBOARDING_TASK_ID,
]);

export default function CreatorPortalOnboardingPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<CreatorOnboardingTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getToken = useCallback(async () => {
    if (!user) return null;
    return user.getIdToken();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const creator = await getCreatorPortalMe(getToken);
        if (!cancelled) setTasks(sanitizeCreatorOnboarding(creator.onboarding));
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load onboarding");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, getToken]);

  const toggle = async (id: string) => {
    if (LOCKED_TASK_IDS.has(id)) return;
    const next = tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t));
    setTasks(next);
    setSaving(true);
    setError(null);
    try {
      await updateCreatorPortalMe(getToken, { onboarding: next });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update checklist");
      setTasks(tasks);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner />
      </div>
    );
  }

  const doneCount = tasks.filter((t) => t.done).length;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Onboarding</h1>
        <p className="mt-1 text-sm text-slate-600">
          Track what IMG needs from you to go live on campaigns.
          {tasks.length > 0 ? ` ${doneCount}/${tasks.length} complete.` : ""}
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Checklist</h2>
        </CardHeader>
        <CardBody className="space-y-2">
          {tasks.length === 0 ? (
            <p className="text-sm text-slate-600">
              No checklist yet. IMG will seed onboarding steps when your invite is accepted or
              when they start your setup.
            </p>
          ) : (
            tasks.map((task) => {
              const locked = LOCKED_TASK_IDS.has(task.id);
              const isAgreement = task.id === CREATOR_AGREEMENT_ONBOARDING_TASK_ID;
              const isId = task.id === CREATOR_ID_ONBOARDING_TASK_ID;
              return (
                <div
                  key={task.id}
                  className="rounded-xl border border-slate-200 px-4 py-3 hover:bg-slate-50"
                >
                  <label className="flex cursor-pointer items-start gap-3">
                    {locked ? (
                      <Lock className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    ) : (
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 rounded border-slate-300"
                        checked={task.done}
                        disabled={saving}
                        onChange={() => void toggle(task.id)}
                      />
                    )}
                    <span
                      className={
                        task.done
                          ? "text-sm text-slate-500 line-through"
                          : "text-sm text-slate-800"
                      }
                    >
                      {task.label}
                    </span>
                  </label>
                  {locked ? (
                    <p className="mt-1.5 pl-7 text-xs text-slate-500">
                      {task.done && isAgreement ? (
                        "Completed via e-signature."
                      ) : task.done && isId ? (
                        "Verified by IMG staff."
                      ) : isAgreement ? (
                        <>
                          Sign in{" "}
                          <Link
                            href="/creator-portal/agreement"
                            className="font-medium text-sky-700 hover:text-sky-900"
                          >
                            Agreement
                          </Link>{" "}
                          to complete this step.
                        </>
                      ) : (
                        <>
                          Upload ID in{" "}
                          <Link
                            href="/creator-portal/identity"
                            className="font-medium text-sky-700 hover:text-sky-900"
                          >
                            ID verification
                          </Link>{" "}
                          for IMG to review.
                        </>
                      )}
                    </p>
                  ) : null}
                </div>
              );
            })
          )}
          {saving && <p className="pt-2 text-xs text-slate-500">Saving…</p>}
        </CardBody>
      </Card>
    </div>
  );
}
