"use client";

import Link from "next/link";
import { Clapperboard, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { BoardCard, BoardScrollArea } from "@/components/production/BoardCard";
import { ScoutProject } from "@/lib/scout/types";
import { ProductionBoard, ProductionDay } from "@/lib/production/types";
import {
  gearItemsFromScoutSession,
  importGearFromScoutSession,
  inspirationFromScoutPreviews,
  scoutSceneNotes,
  trackLinkedScoutIds,
} from "@/lib/production/scoutBoardImport";
import { shotsFromScoutList } from "@/lib/production/scoutImport";

interface ScoutSessionsCardProps {
  scoutSessions: ScoutProject[];
  board: ProductionBoard;
  onPatch: (partial: Partial<ProductionBoard>) => void;
}

export function ScoutSessionsCard({ scoutSessions, board, onPatch }: ScoutSessionsCardProps) {
  if (scoutSessions.length === 0) {
    return (
      <BoardCard
        title="Scout sessions"
        collapsible
        defaultOpen={false}
        summary="Link a scout to this project"
        bodyClassName="p-3"
      >
        <p className="text-sm text-slate-600">
          No scout sessions linked yet. Open a scout and link it to this project, or{" "}
          <Link href={`/scout/new?projectId=${board.projectId}`} className="font-medium text-sky-700 hover:underline">
            start a new scout
          </Link>
          .
        </p>
      </BoardCard>
    );
  }

  const importShots = (scout: ScoutProject, dayId: string) => {
    const shots = scout.latestShotList?.shots;
    if (!shots?.length) return;
    const days = board.productionDays.map((d) =>
      d.id === dayId
        ? { ...d, shots: [...d.shots, ...shotsFromScoutList(shots)] }
        : d
    );
    onPatch({
      productionDays: days,
      linkedScoutProjectIds: trackLinkedScoutIds(board.linkedScoutProjectIds ?? [], scout.id),
    });
  };

  const importGear = (scout: ScoutProject) => {
    onPatch({
      gearItems: importGearFromScoutSession(board.gearItems, scout),
      linkedScoutProjectIds: trackLinkedScoutIds(board.linkedScoutProjectIds ?? [], scout.id),
    });
  };

  const importNotes = (scout: ScoutProject) => {
    const notes = scoutSceneNotes(scout);
    if (!notes) return;
    const prefix = board.filmingNotes?.trim() ? `${board.filmingNotes.trim()}\n\n` : "";
    onPatch({
      filmingNotes: `${prefix}— ${scout.projectName || "Scout"}\n${notes}`,
      linkedScoutProjectIds: trackLinkedScoutIds(board.linkedScoutProjectIds ?? [], scout.id),
    });
  };

  const importPrevis = (scout: ScoutProject) => {
    const previews = scout.latestPreviews ?? [];
    if (!previews.length) return;
    onPatch({
      inspirationImages: inspirationFromScoutPreviews(board.inspirationImages, previews),
      linkedScoutProjectIds: trackLinkedScoutIds(board.linkedScoutProjectIds ?? [], scout.id),
    });
  };

  return (
    <BoardCard
      title="Scout sessions"
      collapsible
      defaultOpen={false}
      summary={`${scoutSessions.length} linked`}
      bodyClassName="p-0"
    >
      <BoardScrollArea className="max-h-72">
        <ul className="divide-y divide-slate-100">
          {scoutSessions.map((scout) => (
            <ScoutSessionRow
              key={scout.id}
              scout={scout}
              days={board.productionDays}
              onImportShots={importShots}
              onImportGear={importGear}
              onImportNotes={importNotes}
              onImportPrevis={importPrevis}
            />
          ))}
        </ul>
      </BoardScrollArea>
    </BoardCard>
  );
}

function ScoutSessionRow({
  scout,
  days,
  onImportShots,
  onImportGear,
  onImportNotes,
  onImportPrevis,
}: {
  scout: ScoutProject;
  days: ProductionDay[];
  onImportShots: (scout: ScoutProject, dayId: string) => void;
  onImportGear: (scout: ScoutProject) => void;
  onImportNotes: (scout: ScoutProject) => void;
  onImportPrevis: (scout: ScoutProject) => void;
}) {
  const shotCount = scout.latestShotList?.shots?.length ?? 0;
  const previsCount = scout.latestPreviews?.filter((p) => p.imageUrl).length ?? 0;
  const gearCount = gearItemsFromScoutSession(scout).length;

  return (
    <li className="space-y-2 px-3 py-3">
      <div className="flex items-start gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-800">
          <Clapperboard className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <Link
            href={`/scout/${scout.id}`}
            className="block truncate text-sm font-medium text-sky-700 hover:underline"
          >
            {scout.projectName || scout.sceneIdea || scout.id}
          </Link>
          <p className="text-xs text-slate-500">
            {shotCount} shots · {gearCount} gear hints · {previsCount} previs
          </p>
        </div>
        <Link href={`/scout/${scout.id}`} className="shrink-0 text-slate-400 hover:text-sky-700">
          <ExternalLink className="h-4 w-4" />
        </Link>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {shotCount > 0 && days.length > 0 ? (
          days.map((day) => (
            <Button
              key={day.id}
              type="button"
              size="sm"
              variant="outline"
              className="h-7 px-2 text-[11px]"
              onClick={() => onImportShots(scout, day.id)}
            >
              Shots → Day {day.dayNumber}
            </Button>
          ))
        ) : null}
        {gearCount > 0 ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 px-2 text-[11px]"
            onClick={() => onImportGear(scout)}
          >
            Import gear
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 px-2 text-[11px]"
          onClick={() => onImportNotes(scout)}
        >
          Import notes
        </Button>
        {previsCount > 0 ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 px-2 text-[11px]"
            onClick={() => onImportPrevis(scout)}
          >
            Previs → inspiration
          </Button>
        ) : null}
      </div>
    </li>
  );
}
