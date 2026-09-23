"use client";

import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import {
  CHECKLIST_GROUPS,
  CHECKLIST_GROUP_LABELS,
  type ShootGuideChecklistItem,
} from "@/lib/shootGuide/types";

export function ShootGuideChecklistTab({
  items,
  saving,
  onToggle,
  onSave,
}: {
  items: ShootGuideChecklistItem[];
  saving: boolean;
  onToggle: (id: string) => void;
  onSave: () => void;
}) {
  const done = items.filter((i) => i.done).length;
  if (!items.length) {
    return (
      <Card>
        <CardBody className="text-sm text-slate-600">
          Checklist fills from this scene after generate (room, camera, lighting, audio, continuity, shot, wrap).
        </CardBody>
      </Card>
    );
  }
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        {done} of {items.length} done. Built from this scene, not a generic pad.
      </p>
      {CHECKLIST_GROUPS.map((group) => {
        const rows = items.filter((i) => i.group === group);
        if (!rows.length) return null;
        return (
          <Card key={group}>
            <CardBody className="space-y-2">
              <p className="text-sm font-semibold text-slate-900">{CHECKLIST_GROUP_LABELS[group]}</p>
              {rows.map((row) => (
                <label key={row.id} className="flex items-start gap-3 text-sm text-slate-800">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-slate-300"
                    checked={row.done}
                    onChange={() => onToggle(row.id)}
                  />
                  <span className={row.done ? "text-slate-400 line-through" : ""}>{row.label}</span>
                </label>
              ))}
            </CardBody>
          </Card>
        );
      })}
      <Button size="touch" disabled={saving} onClick={onSave}>
        {saving ? "Saving…" : "Save checklist"}
      </Button>
    </div>
  );
}
