"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ShootingKitEditor, shootingKitSummary } from "@/components/production/ShootingKitEditor";
import {
  normalizeShootingKit,
  ProductionShootingKit,
  shootingKitFromLegacy,
  shootingKitHasGear,
} from "@/lib/production/shootingKit";
import { getProductionBoardByProject } from "@/lib/firebase/productionFirestore";
import { scriptWriterUpdateShootingKit } from "@/lib/scriptWriter/apiClient";
import { cn } from "@/lib/utils/cn";

interface ScriptShootingKitPanelProps {
  sessionId: string;
  shootingKit?: ProductionShootingKit;
  linkedProjectId?: string;
  getToken: () => Promise<string | null>;
  onSaved?: (kit: ProductionShootingKit) => void;
  compact?: boolean;
  className?: string;
  readOnly?: boolean;
}

export function ScriptShootingKitPanel({
  sessionId,
  shootingKit,
  linkedProjectId,
  getToken,
  onSaved,
  compact = false,
  className,
  readOnly = false,
}: ScriptShootingKitPanelProps) {
  const [kit, setKit] = useState(() => normalizeShootingKit(shootingKit));
  const [saving, setSaving] = useState(false);
  const [loadingBoard, setLoadingBoard] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setKit(normalizeShootingKit(shootingKit));
  }, [sessionId, shootingKit]);

  const persist = useCallback(
    async (next: ProductionShootingKit) => {
      if (readOnly) return;
      setSaving(true);
      setSaveError(null);
      try {
        await scriptWriterUpdateShootingKit(getToken, sessionId, next);
        onSaved?.(next);
      } catch (e) {
        setSaveError(e instanceof Error ? e.message : "Save failed");
      } finally {
        setSaving(false);
      }
    },
    [getToken, onSaved, readOnly, sessionId]
  );

  const scheduleSave = useCallback(
    (next: ProductionShootingKit) => {
      setKit(next);
      if (readOnly) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => void persist(next), 600);
    },
    [persist, readOnly]
  );

  const loadFromBoard = async () => {
    if (!linkedProjectId || readOnly) return;
    setLoadingBoard(true);
    setSaveError(null);
    try {
      const board = await getProductionBoardByProject(linkedProjectId);
      if (!board) {
        setSaveError("No production board found for this project.");
        return;
      }
      const merged = shootingKitFromLegacy(board.shootingKit, board.gearItems ?? []);
      if (!shootingKitHasGear(merged)) {
        setSaveError("Production board has no gear yet — add kit on the board first.");
        return;
      }
      scheduleSave(merged);
      await persist(merged);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoadingBoard(false);
    }
  };

  return (
    <div className={cn("rounded-xl border border-slate-200 bg-white", className)}>
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <Camera className="h-4 w-4 text-violet-600" />
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Shooting kit</h3>
            <p className="text-xs text-slate-500">{shootingKitSummary(kit)}</p>
          </div>
        </div>
        {saving ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : null}
      </div>
      <div className="p-4">
        <ShootingKitEditor
          kit={kit}
          compact={compact}
          onChange={(next) => scheduleSave(next)}
          footerActions={
            !readOnly && linkedProjectId ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={loadingBoard}
                onClick={() => void loadFromBoard()}
                className="text-xs"
              >
                {loadingBoard ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                )}
                Load from production board
              </Button>
            ) : null
          }
        />
        {saveError ? <p className="mt-2 text-xs text-red-600">{saveError}</p> : null}
        {!readOnly ? (
          <p className="mt-2 text-[11px] text-slate-400">
            Saved automatically. Detailed shot lists assign camera, lens, dolly/gimbal, lights, and props from
            this kit.
          </p>
        ) : null}
      </div>
    </div>
  );
}
