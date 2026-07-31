"use client";

import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  templateLabel,
  type SceneCoverageChecklist,
} from "@/lib/production/sceneCoverageChecklist";
import { cn } from "@/lib/utils/cn";

type Props = {
  checklists: SceneCoverageChecklist[];
  canEdit: boolean;
  onToggle: (sceneRef: string, itemId: string) => void;
};

export function SceneCoverageChecklistPanel({ checklists, canEdit, onToggle }: Props) {
  if (!checklists.length) return null;

  return (
    <div className="space-y-4">
      {checklists.map((checklist) => {
        const doneCount = checklist.items.filter((i) => i.done).length;
        const total = checklist.items.length;
        return (
          <Card key={checklist.sceneRef}>
            <CardHeader className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="font-semibold text-slate-900">
                  Required coverage
                  {checklist.sceneRef ? (
                    <span className="font-normal text-slate-500"> · Scene {checklist.sceneRef}</span>
                  ) : null}
                </h2>
                {checklist.sceneHeading ? (
                  <p className="mt-0.5 text-xs text-slate-500">{checklist.sceneHeading}</p>
                ) : null}
                <p className="mt-1 text-xs text-slate-500">
                  Seeded from script-writer settings ({templateLabel(checklist.templateId)}). Matching
                  shot types auto-check when marked done on the list below.
                </p>
              </div>
              <Badge variant={doneCount === total ? "success" : "warning"}>
                {doneCount}/{total}
              </Badge>
            </CardHeader>
            <CardBody>
              <ul className="grid gap-1.5 sm:grid-cols-2">
                {checklist.items.map((item) => (
                  <li key={item.id}>
                    <label
                      className={cn(
                        "flex cursor-pointer items-start gap-2 rounded-lg border border-slate-100 px-2.5 py-2 text-sm hover:bg-slate-50",
                        item.done && "border-emerald-100 bg-emerald-50/50"
                      )}
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                        checked={item.done}
                        disabled={!canEdit}
                        onChange={() => onToggle(checklist.sceneRef, item.id)}
                      />
                      <span className={cn("text-slate-700", item.done && "text-emerald-900")}>
                        {item.label}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        );
      })}
    </div>
  );
}
