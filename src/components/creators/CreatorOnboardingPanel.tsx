"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, Lock } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils/cn";
import { CREATOR_AGREEMENT_ONBOARDING_TASK_ID } from "@/lib/creators/networkAgreementContent";
import {
  CREATOR_ID_ONBOARDING_TASK_ID,
  CREATOR_PAYMENT_ONBOARDING_TASK_ID,
  buildDefaultOnboarding,
  sanitizeCreatorOnboarding,
  type CreatorOnboardingTask,
} from "@/lib/creators/types";

const LOCKED_TASK_IDS = new Set([
  CREATOR_AGREEMENT_ONBOARDING_TASK_ID,
  CREATOR_ID_ONBOARDING_TASK_ID,
  CREATOR_PAYMENT_ONBOARDING_TASK_ID,
]);

type Props = {
  onboarding?: CreatorOnboardingTask[];
  canEdit: boolean;
  saving?: boolean;
  onSave: (onboarding: CreatorOnboardingTask[]) => Promise<void>;
  /** When true, show portal link instead of staff void note. */
  portalMode?: boolean;
};

export function CreatorOnboardingPanel({
  onboarding,
  canEdit,
  saving,
  onSave,
  portalMode = false,
}: Props) {
  const [items, setItems] = useState<CreatorOnboardingTask[]>(
    sanitizeCreatorOnboarding(onboarding)
  );
  const [dirty, setDirty] = useState(false);

  const { done, total, pct } = useMemo(() => {
    const total = items.length;
    const done = items.filter((i) => i.done).length;
    return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
  }, [items]);

  const seed = () => {
    setItems(buildDefaultOnboarding());
    setDirty(true);
  };

  const toggle = (id: string) => {
    if (LOCKED_TASK_IDS.has(id)) return;
    setItems((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              done: !t.done,
              doneAt: !t.done ? new Date().toISOString() : undefined,
            }
          : t
      )
    );
    setDirty(true);
  };

  const updateNotes = (id: string, notes: string) => {
    setItems((prev) => prev.map((t) => (t.id === id ? { ...t, notes } : t)));
    setDirty(true);
  };

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Onboarding checklist</h2>
        <span className="text-xs font-medium tabular-nums text-sky-700">
          {done}/{total || "—"} · {pct}%
        </span>
      </CardHeader>
      <CardBody className="space-y-3">
        {items.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-slate-500">
              No onboarding checklist yet. Seed the default tasks when this creator is approved
              or start one now.
            </p>
            {canEdit && (
              <Button type="button" size="touch" variant="outline" onClick={seed}>
                Seed default checklist
              </Button>
            )}
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map((task) => {
              const locked = LOCKED_TASK_IDS.has(task.id);
              const isAgreement = task.id === CREATOR_AGREEMENT_ONBOARDING_TASK_ID;
              const isId = task.id === CREATOR_ID_ONBOARDING_TASK_ID;
              const isPayment = task.id === CREATOR_PAYMENT_ONBOARDING_TASK_ID;
              return (
                <li
                  key={task.id}
                  className={cn(
                    "rounded-xl border px-3 py-2.5",
                    task.done
                      ? "border-emerald-200 bg-emerald-50/50"
                      : "border-slate-200 bg-slate-50/60"
                  )}
                >
                  <button
                    type="button"
                    className="flex w-full items-start gap-3 text-left"
                    disabled={!canEdit || locked}
                    onClick={() => toggle(task.id)}
                  >
                    {task.done ? (
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                    ) : locked ? (
                      <Lock className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
                    ) : (
                      <Circle className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
                    )}
                    <span
                      className={cn(
                        "text-sm font-medium",
                        task.done ? "text-emerald-900 line-through" : "text-slate-800"
                      )}
                    >
                      {task.label}
                    </span>
                  </button>
                  {locked ? (
                    <p className="mt-1.5 pl-8 text-xs text-slate-500">
                      {task.done && isAgreement ? (
                        "Completed via e-signature."
                      ) : task.done && isId ? (
                        "Verified by IMG staff."
                      ) : task.done && isPayment ? (
                        "Payment details on file."
                      ) : portalMode && isAgreement ? (
                        <>
                          Completes automatically when you{" "}
                          <Link
                            href="/creator-portal/agreement"
                            className="font-medium text-sky-700 hover:text-sky-900"
                          >
                            sign the contractor agreement
                          </Link>
                          .
                        </>
                      ) : portalMode && isId ? (
                        <>
                          Completes when IMG approves your{" "}
                          <Link
                            href="/creator-portal/identity"
                            className="font-medium text-sky-700 hover:text-sky-900"
                          >
                            ID upload
                          </Link>
                          .
                        </>
                      ) : portalMode && isPayment ? (
                        <>
                          Completes when you save{" "}
                          <Link
                            href="/creator-portal/payment"
                            className="font-medium text-sky-700 hover:text-sky-900"
                          >
                            payment details
                          </Link>
                          .
                        </>
                      ) : isAgreement ? (
                        "Completes when the creator e-signs the network contractor agreement in the portal (not toggleable here)."
                      ) : isId ? (
                        "Completes when staff approve the creator’s ID upload (not toggleable here)."
                      ) : (
                        "Completes when payment details are saved (portal or staff)."
                      )}
                    </p>
                  ) : null}
                  {canEdit && !locked && (
                    <div className="mt-2 pl-8">
                      <Input
                        label="Notes"
                        value={task.notes ?? ""}
                        onChange={(e) => updateNotes(task.id, e.target.value)}
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {canEdit && dirty && items.length > 0 && (
          <Button
            type="button"
            size="touch"
            disabled={saving}
            onClick={async () => {
              await onSave(
                items.map((t) => ({
                  ...t,
                  notes: t.notes?.trim() || undefined,
                }))
              );
              setDirty(false);
            }}
          >
            {saving ? "Saving…" : "Save checklist"}
          </Button>
        )}
      </CardBody>
    </Card>
  );
}
