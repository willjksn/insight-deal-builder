"use client";

import { useState } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { CreatorDevelopmentPlan } from "@/lib/creators/opsTypes";

type Props = {
  plan?: CreatorDevelopmentPlan;
  canEdit: boolean;
  saving?: boolean;
  onSeed: () => Promise<void>;
  onSave: (plan: CreatorDevelopmentPlan) => Promise<void>;
};

export function CreatorDevelopmentPanel({ plan, canEdit, saving, onSeed, onSave }: Props) {
  const [local, setLocal] = useState<CreatorDevelopmentPlan | undefined>(plan);
  const [dirty, setDirty] = useState(false);

  const items = local?.items ?? [];

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Development plan</h2>
        {canEdit && !local && (
          <Button type="button" size="sm" variant="outline" disabled={saving} onClick={onSeed}>
            Seed plan
          </Button>
        )}
      </CardHeader>
      <CardBody className="space-y-2">
        {!local ? (
          <p className="text-sm text-slate-500">
            No development plan yet. Seed one for incubator / needs-development creators.
          </p>
        ) : (
          items.map((item) => (
            <button
              key={item.id}
              type="button"
              disabled={!canEdit}
              className="flex w-full items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5 text-left"
              onClick={() => {
                if (!local) return;
                const next = {
                  ...local,
                  items: local.items.map((i) =>
                    i.id === item.id
                      ? {
                          ...i,
                          status: i.status === "done" ? ("planned" as const) : ("done" as const),
                        }
                      : i
                  ),
                  updatedAt: new Date().toISOString(),
                };
                setLocal(next);
                setDirty(true);
              }}
            >
              {item.status === "done" ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              ) : (
                <Circle className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
              )}
              <div>
                <div className="text-sm font-semibold text-slate-900">{item.area}</div>
                <div className="text-xs text-slate-600">{item.goal}</div>
              </div>
            </button>
          ))
        )}
        {canEdit && dirty && local && (
          <Button
            type="button"
            size="touch"
            disabled={saving}
            onClick={async () => {
              await onSave(local);
              setDirty(false);
            }}
          >
            {saving ? "Saving…" : "Save plan"}
          </Button>
        )}
      </CardBody>
    </Card>
  );
}
