"use client";

import { useCallback, useEffect, useRef } from "react";
import { ProductionChecklistCard } from "@/components/production/ProductionChecklistCard";
import { Agreement, Project } from "@/lib/types";
import { ProductionBoard } from "@/lib/production/types";
import {
  applyChecklistAutoChecks,
  buildChecklistAutoSignals,
  buildChecklistForMode,
  defaultChecklistForProject,
  ProductionChecklistItem,
  ProductionChecklistMode,
} from "@/lib/production/checklist";

interface ProductionBoardChecklistSectionProps {
  project: Project;
  board: ProductionBoard;
  primaryAgreement: Agreement | undefined;
  onPatch: (partial: {
    checklistMode?: ProductionChecklistMode;
    checklistItems?: ProductionChecklistItem[];
  }) => void;
}

export function ProductionBoardChecklistSection({
  project,
  board,
  primaryAgreement,
  onPatch,
}: ProductionBoardChecklistSectionProps) {
  const checklistDefaults = defaultChecklistForProject(project);
  const checklistMode = board.checklistMode ?? checklistDefaults.mode;
  const checklistItems =
    board.checklistItems?.length ? board.checklistItems : buildChecklistForMode(checklistMode);

  const signedAgreement =
    primaryAgreement?.status === "signed" || primaryAgreement?.status === "completed";

  const syncChecklistFromProject = useCallback(() => {
    const signals = buildChecklistAutoSignals({
      project,
      board,
      agreement: primaryAgreement ?? null,
    });
    onPatch({
      checklistItems: applyChecklistAutoChecks(checklistItems, signals),
    });
  }, [board, project, primaryAgreement, checklistItems, onPatch]);

  const autoChecklistRef = useRef(false);
  useEffect(() => {
    if (autoChecklistRef.current) return;
    autoChecklistRef.current = true;
    const signals = buildChecklistAutoSignals({
      project,
      board,
      agreement: primaryAgreement ?? null,
    });
    const next = applyChecklistAutoChecks(checklistItems, signals);
    const changed = next.some((item, i) => item.done !== checklistItems[i]?.done);
    if (changed) {
      onPatch({ checklistItems: next });
    }
  }, [board, project, primaryAgreement, checklistItems, onPatch]);

  return (
    <ProductionChecklistCard
      project={project}
      mode={checklistMode}
      items={checklistItems}
      scriptSessionId={board.scriptSessionId}
      hasAgreement={Boolean(primaryAgreement)}
      hasSignedAgreement={signedAgreement}
      onSyncProgress={syncChecklistFromProject}
      onChange={(mode, items) => onPatch({ checklistMode: mode, checklistItems: items })}
    />
  );
}
