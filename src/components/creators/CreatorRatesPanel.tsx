"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { CREATOR_RATE_KIND_OPTIONS, type CreatorRate } from "@/lib/creators/types";

type Props = {
  rates: CreatorRate[];
  canEdit: boolean;
  saving?: boolean;
  onSave: (rates: CreatorRate[]) => Promise<void>;
};

function emptyRate(): CreatorRate {
  return {
    id: crypto.randomUUID(),
    kind: "sponsored_post",
    amount: undefined,
    unit: "per post",
    negotiable: true,
  };
}

export function CreatorRatesPanel({ rates, canEdit, saving, onSave }: Props) {
  const [items, setItems] = useState<CreatorRate[]>(rates);
  const [dirty, setDirty] = useState(false);

  const update = (id: string, patch: Partial<CreatorRate>) => {
    setItems((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    setDirty(true);
  };

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Rate card</h2>
        {canEdit && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              setItems((prev) => [...prev, emptyRate()]);
              setDirty(true);
            }}
          >
            <Plus className="mr-1 h-4 w-4" /> Add rate
          </Button>
        )}
      </CardHeader>
      <CardBody className="space-y-4">
        {items.length === 0 ? (
          <p className="text-sm text-slate-500">No rates defined yet.</p>
        ) : (
          items.map((r) => (
            <div
              key={r.id}
              className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3 md:grid-cols-2"
            >
              <Select
                label="Kind"
                value={r.kind}
                options={CREATOR_RATE_KIND_OPTIONS}
                disabled={!canEdit}
                onChange={(e) => update(r.id, { kind: e.target.value })}
                touch
              />
              <Input
                label="Amount ($)"
                type="number"
                value={r.amount ?? ""}
                disabled={!canEdit}
                onChange={(e) =>
                  update(r.id, {
                    amount: e.target.value === "" ? undefined : Number(e.target.value),
                  })
                }
                touch
              />
              <Input
                label="Unit"
                value={r.unit ?? ""}
                disabled={!canEdit}
                onChange={(e) => update(r.id, { unit: e.target.value })}
                touch
              />
              <Select
                label="Negotiable"
                value={r.negotiable ? "yes" : "no"}
                options={[
                  { value: "yes", label: "Negotiable" },
                  { value: "no", label: "Fixed" },
                ]}
                disabled={!canEdit}
                onChange={(e) => update(r.id, { negotiable: e.target.value === "yes" })}
                touch
              />
              <div className="md:col-span-2">
                <Input
                  label="Notes"
                  value={r.notes ?? ""}
                  disabled={!canEdit}
                  onChange={(e) => update(r.id, { notes: e.target.value })}
                  touch
                />
              </div>
              {canEdit && (
                <div className="md:col-span-2 flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setItems((prev) => prev.filter((x) => x.id !== r.id));
                      setDirty(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              )}
            </div>
          ))
        )}
        {canEdit && dirty && (
          <Button
            type="button"
            size="touch"
            disabled={saving}
            onClick={async () => {
              await onSave(items);
              setDirty(false);
            }}
          >
            {saving ? "Saving…" : "Save rates"}
          </Button>
        )}
      </CardBody>
    </Card>
  );
}
