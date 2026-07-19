"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Clapperboard, LayoutGrid, ListOrdered } from "lucide-react";
import {
  getProductionBoardByProject,
  saveProductionBoard,
  subscribeProductionBoardByProject,
} from "@/lib/firebase/productionRepos";
import {
  countCoverageShots,
  countCoverageWithImages,
  migrateBoardCoverageDays,
} from "@/lib/production/coverageMigrate";
import type { ProductionBoard, ProductionDayShot } from "@/lib/production/types";
import { useDocument } from "@/hooks/useDocument";
import { useProjectAccess } from "@/hooks/useProjectAccess";
import { useAuth } from "@/contexts/AuthContext";
import { canManageProjects, canUseProductionTools } from "@/lib/utils/permissions";
import type { Project } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { CoverageBoardView, type CoverageShotRow } from "@/components/production/CoverageBoardView";
import { CoverageListView } from "@/components/production/CoverageListView";
import { cn } from "@/lib/utils/cn";

type CoverageView = "board" | "linear" | "list";

export function CoverageDeskClient({ projectId }: { projectId: string }) {
  const { appUser } = useAuth();
  const { data: project, loading: projectLoading } = useDocument<Project>("projects", projectId);
  const projectAccess = useProjectAccess(projectId, project?.ownerUserId);
  const [board, setBoard] = useState<ProductionBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<CoverageView>("board");
  const [dayFilter, setDayFilter] = useState<string>("all");
  const [migrateNote, setMigrateNote] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const localEditRef = useRef(false);
  const savingRef = useRef(false);
  const migratedRef = useRef(false);

  const allowed =
    canUseProductionTools(appUser) ||
    canManageProjects(appUser) ||
    projectAccess.canAccessProduction ||
    projectAccess.canAccessShots;
  const canEdit =
    canUseProductionTools(appUser) ||
    canManageProjects(appUser) ||
    projectAccess.canAccessProduction ||
    projectAccess.canAccessShots;

  useEffect(() => {
    savingRef.current = saving;
  }, [saving]);

  const persistBoard = useCallback((next: ProductionBoard, immediate = false) => {
    setBoard(next);
    localEditRef.current = true;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const run = async () => {
      setSaving(true);
      try {
        const { id, createdAt, updatedAt: _u, ...rest } = next;
        await saveProductionBoard(id, rest);
      } finally {
        setSaving(false);
        localEditRef.current = false;
      }
    };
    if (immediate) void run();
    else saveTimer.current = setTimeout(() => void run(), 600);
  }, []);

  useEffect(() => {
    if (!projectId || !allowed) return;
    let unsub: (() => void) | undefined;
    setLoading(true);
    getProductionBoardByProject(projectId)
      .then((loaded) => {
        if (!loaded) {
          setBoard(null);
          return;
        }
        if (!migratedRef.current) {
          const { days, migrated } = migrateBoardCoverageDays(loaded.productionDays);
          migratedRef.current = true;
          if (migrated > 0) {
            const next = { ...loaded, productionDays: days };
            setBoard(next);
            setMigrateNote(
              `Moved ${migrated} scene storyboard image${migrated === 1 ? "" : "s"} onto shot frames.`
            );
            void (async () => {
              setSaving(true);
              try {
                const { id, createdAt, updatedAt: _u, ...rest } = next;
                await saveProductionBoard(id, rest);
              } finally {
                setSaving(false);
              }
            })();
            return;
          }
        }
        setBoard(loaded);
      })
      .finally(() => setLoading(false));

    unsub = subscribeProductionBoardByProject(
      projectId,
      (remote) => {
        if (!remote || localEditRef.current || savingRef.current) return;
        setBoard(remote);
      },
      () => undefined
    );
    return () => {
      unsub?.();
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [projectId, allowed]);

  const sortedDays = useMemo(
    () =>
      board
        ? [...board.productionDays].sort((a, b) => a.dayNumber - b.dayNumber)
        : [],
    [board]
  );

  const coverageShots: CoverageShotRow[] = useMemo(() => {
    if (!board) return [];
    const rows: CoverageShotRow[] = [];
    for (const day of sortedDays) {
      if (dayFilter !== "all" && day.id !== dayFilter) continue;
      for (const shot of day.shots ?? []) {
        rows.push({
          ...shot,
          dayId: day.id,
          dayNumber: day.dayNumber,
          dayTitle: day.title,
        });
      }
    }
    return rows;
  }, [board, sortedDays, dayFilter]);

  const defaultDayId = sortedDays[0]?.id;

  const patchShot = (dayId: string, shotId: string, patch: Partial<ProductionDayShot>) => {
    if (!board || !canEdit) return;
    persistBoard({
      ...board,
      productionDays: board.productionDays.map((day) =>
        day.id !== dayId
          ? day
          : {
              ...day,
              shots: (day.shots ?? []).map((s) => (s.id === shotId ? { ...s, ...patch } : s)),
            }
      ),
    });
  };

  const addShot = (dayId: string) => {
    if (!board || !canEdit) return;
    persistBoard({
      ...board,
      productionDays: board.productionDays.map((day) => {
        if (day.id !== dayId) return day;
        const shots = day.shots ?? [];
        return {
          ...day,
          shots: [
            ...shots,
            {
              id: crypto.randomUUID(),
              label: "New shot",
              done: false,
              sortOrder: shots.length,
              shotType: "medium_shot",
            },
          ],
        };
      }),
    });
  };

  const removeShot = (dayId: string, shotId: string) => {
    if (!board || !canEdit) return;
    persistBoard({
      ...board,
      productionDays: board.productionDays.map((day) =>
        day.id !== dayId
          ? day
          : {
              ...day,
              shots: (day.shots ?? [])
                .filter((s) => s.id !== shotId)
                .map((s, i) => ({ ...s, sortOrder: i })),
            }
      ),
    });
  };

  if (projectLoading || loading) return <LoadingSpinner />;
  if (!allowed) {
    return <p className="text-sm text-red-600">You don’t have access to coverage for this project.</p>;
  }
  if (!board) {
    return (
      <div className="space-y-4">
        <Link
          href={`/projects/${projectId}`}
          className="inline-flex items-center text-sm text-sky-700 hover:underline"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Project
        </Link>
        <p className="text-sm text-slate-600">
          No pre-production board yet.{" "}
          <Link href={`/projects/${projectId}/production`} className="font-medium text-sky-700 hover:underline">
            Open Prep
          </Link>{" "}
          to create one, then apply a script to seed coverage.
        </p>
      </div>
    );
  }

  const totalShots = countCoverageShots(board.productionDays);
  const withImages = countCoverageWithImages(board.productionDays);

  return (
    <>
      <Link
        href={`/projects/${projectId}`}
        className="mb-4 inline-flex items-center text-sm text-sky-700 hover:underline"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Project
      </Link>
      <PageHeader
        title="Coverage"
        subtitle={
          project
            ? `${project.name} — storyboard frames and shot bible. One shot = one frame.`
            : "Storyboard frames and shot bible. One shot = one frame."
        }
        action={
          <div className="flex flex-wrap gap-2">
            <Link href={`/projects/${projectId}/production`}>
              <Button size="touch" variant="outline">
                Prep board
              </Button>
            </Link>
            {defaultDayId && (
              <Link href={`/projects/${projectId}/production/days/${defaultDayId}`}>
                <Button size="touch" variant="outline">
                  Call sheet
                </Button>
              </Link>
            )}
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          {totalShots} shot{totalShots === 1 ? "" : "s"}
          {withImages > 0 ? ` · ${withImages} with frames` : ""}
          {saving ? " · Saving…" : ""}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"
            value={dayFilter}
            onChange={(e) => setDayFilter(e.target.value)}
          >
            <option value="all">All days</option>
            {sortedDays.map((d) => (
              <option key={d.id} value={d.id}>
                Day {d.dayNumber}
                {d.title ? ` — ${d.title}` : ""}
              </option>
            ))}
          </select>
          <div className="inline-flex rounded-xl border border-slate-200 bg-white p-0.5">
            {(
              [
                ["board", "Board", LayoutGrid],
                ["linear", "Linear", Clapperboard],
                ["list", "List", ListOrdered],
              ] as const
            ).map(([id, label, Icon]) => (
              <button
                key={id}
                type="button"
                onClick={() => setView(id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition",
                  view === id ? "bg-sky-600 text-white" : "text-slate-600 hover:bg-slate-50"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {migrateNote && (
        <p className="mb-4 rounded-xl border border-sky-100 bg-sky-50 px-3 py-2 text-sm text-sky-900">
          {migrateNote}
        </p>
      )}

      {(view === "board" || view === "linear") && (
        <CoverageBoardView
          projectId={projectId}
          shots={coverageShots}
          inspirationImages={board.inspirationImages ?? []}
          layout={view === "linear" ? "linear" : "grid"}
          readOnly={!canEdit}
          onPatchShot={patchShot}
        />
      )}

      {view === "list" && (
        <CoverageListView
          shots={coverageShots}
          readOnly={!canEdit}
          defaultDayId={defaultDayId}
          onPatchShot={patchShot}
          onAddShot={addShot}
          onRemoveShot={removeShot}
        />
      )}
    </>
  );
}
