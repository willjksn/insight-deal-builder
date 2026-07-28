"use client";

import { useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import {
  CREATOR_READINESS_COMPONENT_LABELS,
  CREATOR_READINESS_LABELS,
  type CreatorReadiness,
  type CreatorReadinessStatus,
} from "@/lib/creators/types";

const STATUS_OPTIONS = (Object.keys(CREATOR_READINESS_LABELS) as CreatorReadinessStatus[]).map(
  (value) => ({ value, label: CREATOR_READINESS_LABELS[value] })
);

const COMPONENT_KEYS = Object.keys(
  CREATOR_READINESS_COMPONENT_LABELS
) as (keyof Omit<CreatorReadiness, "notes">)[];

type Props = {
  readinessStatus: CreatorReadinessStatus;
  readiness?: CreatorReadiness;
  canEdit: boolean;
  saving?: boolean;
  onSave: (payload: {
    readinessStatus: CreatorReadinessStatus;
    readiness: CreatorReadiness;
  }) => Promise<void>;
};

export function CreatorReadinessPanel({
  readinessStatus,
  readiness,
  canEdit,
  saving,
  onSave,
}: Props) {
  const [status, setStatus] = useState(readinessStatus);
  const [components, setComponents] = useState<CreatorReadiness>({
    mediaKitReady: readiness?.mediaKitReady ?? false,
    ratesDefined: readiness?.ratesDefined ?? false,
    brandSafe: readiness?.brandSafe ?? false,
    availabilitySet: readiness?.availabilitySet ?? false,
    sampleContentReady: readiness?.sampleContentReady ?? false,
    agreementReady: readiness?.agreementReady ?? false,
    notes: readiness?.notes ?? "",
  });
  const [dirty, setDirty] = useState(false);

  const doneCount = COMPONENT_KEYS.filter((k) => components[k]).length;

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Commercial readiness</h2>
        <span className="text-xs font-medium text-slate-500">
          {doneCount}/{COMPONENT_KEYS.length} components
        </span>
      </CardHeader>
      <CardBody className="space-y-4">
        <Select
          label="Overall readiness"
          value={status}
          options={STATUS_OPTIONS}
          disabled={!canEdit}
          onChange={(e) => {
            setStatus(e.target.value as CreatorReadinessStatus);
            setDirty(true);
          }}
          touch
        />
        <ul className="space-y-2">
          {COMPONENT_KEYS.map((key) => (
            <li key={key}>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300"
                  checked={Boolean(components[key])}
                  disabled={!canEdit}
                  onChange={(e) => {
                    setComponents((c) => ({ ...c, [key]: e.target.checked }));
                    setDirty(true);
                  }}
                />
                <span className="font-medium text-slate-800">
                  {CREATOR_READINESS_COMPONENT_LABELS[key]}
                </span>
              </label>
            </li>
          ))}
        </ul>
        <Textarea
          label="Readiness notes"
          value={components.notes ?? ""}
          disabled={!canEdit}
          onChange={(e) => {
            setComponents((c) => ({ ...c, notes: e.target.value }));
            setDirty(true);
          }}
          touch
        />
        {canEdit && dirty && (
          <Button
            type="button"
            size="touch"
            disabled={saving}
            onClick={async () => {
              await onSave({
                readinessStatus: status,
                readiness: {
                  ...components,
                  notes: components.notes?.trim() || undefined,
                },
              });
              setDirty(false);
            }}
          >
            {saving ? "Saving…" : "Save readiness"}
          </Button>
        )}
      </CardBody>
    </Card>
  );
}
