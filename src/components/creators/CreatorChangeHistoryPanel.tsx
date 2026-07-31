"use client";

import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import {
  formatCreatorChangeField,
  formatCreatorChangeValue,
  sortCreatorChangeHistory,
} from "@/lib/creators/changeHistoryFormat";
import type { CreatorChangeEntry } from "@/lib/creators/types";
import { formatDate } from "@/lib/utils/format";

type Props = {
  changeHistory?: CreatorChangeEntry[];
};

export function CreatorChangeHistoryPanel({ changeHistory }: Props) {
  const entries = sortCreatorChangeHistory(changeHistory, 10);
  if (!entries.length) return null;

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold">Recent changes</h2>
        <p className="mt-0.5 text-xs font-normal text-slate-500">
          Staff audit log — not shown to creators
        </p>
      </CardHeader>
      <CardBody className="space-y-2">
        {entries.map((entry) => {
          const from = formatCreatorChangeValue(entry.field, entry.previousValue);
          const to = formatCreatorChangeValue(entry.field, entry.newValue);
          return (
            <div
              key={entry.id}
              className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 sm:grid-cols-[10rem_minmax(0,1fr)_9rem] sm:items-center"
            >
              <p className="text-sm font-semibold text-slate-900">
                {formatCreatorChangeField(entry.field)}
              </p>

              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                <span className="rounded-md bg-white px-2 py-0.5 text-slate-500 ring-1 ring-slate-200 line-through">
                  {from}
                </span>
                <span className="text-slate-300" aria-hidden>
                  →
                </span>
                <span className="rounded-md bg-white px-2 py-0.5 font-medium text-slate-900 ring-1 ring-slate-200">
                  {to}
                </span>
              </div>

              <div className="text-left text-xs leading-relaxed text-slate-500 sm:text-right">
                <p>{formatDate(entry.changedAt)}</p>
                {entry.changedByDisplayName ? (
                  <p className="truncate">{entry.changedByDisplayName}</p>
                ) : null}
              </div>
            </div>
          );
        })}
      </CardBody>
    </Card>
  );
}
