"use client";

import { ScriptSuggestedShot } from "@/lib/scriptWriter/types";
import { formatShotTypeLabel } from "@/lib/production/shotLabels";

export function ScriptSuggestedShotsPanel({ shots }: { shots: ScriptSuggestedShot[] }) {
  const sorted = [...shots].sort((a, b) => a.shotNumber - b.shotNumber);

  return (
    <div className="max-h-48 overflow-y-auto border-b border-slate-100 px-4 py-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Suggested shot list
      </p>
      <ul className="space-y-1.5 text-xs text-slate-700">
        {sorted.slice(0, 12).map((shot) => (
          <li key={`${shot.sceneNumber}-${shot.shotNumber}`} className="flex gap-2">
            <span className="shrink-0 tabular-nums text-slate-400">{shot.shotNumber}</span>
            <span>
              <span className="font-medium">{formatShotTypeLabel(shot.shotType)}</span>
              {shot.shotName ? ` · ${shot.shotName}` : null}
              {shot.sceneNumber ? (
                <span className="text-slate-400"> (Sc. {shot.sceneNumber})</span>
              ) : null}
            </span>
          </li>
        ))}
        {sorted.length > 12 && (
          <li className="text-slate-400">+ {sorted.length - 12} more shots…</li>
        )}
      </ul>
    </div>
  );
}
