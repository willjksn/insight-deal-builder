"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Clapperboard, LayoutGrid, ListOrdered, RefreshCw, Sparkles } from "lucide-react";
import {
  getProductionBoardByProject,
  saveProductionBoard,
  subscribeProductionBoardByProject,
} from "@/lib/firebase/productionFirestore";
import {
  countCoverageShots,
  countCoverageWithImages,
  migrateBoardCoverageDays,
} from "@/lib/production/coverageMigrate";
import { generateCoverageFramesBatch } from "@/lib/production/coverageApiClient";
import { mergeBoardCoverageFromScript } from "@/lib/production/coverageSync";
import type { ProductionBoard, ProductionDayShot } from "@/lib/production/types";
import { scriptWriterGetSession } from "@/lib/scriptWriter/apiClient";
import type { ScriptDocument, ScriptWriterSession } from "@/lib/scriptWriter/types";
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
  const { user, appUser } = useAuth();
  const searchParams = useSearchParams();
  const dayFromUrl = searchParams.get("day")?.trim() || "";
  const { data: project, loading: projectLoading } = useDocument<Project>("projects", projectId);
  const projectAccess = useProjectAccess(projectId, project?.ownerUserId);
  const [board, setBoard] = useState<ProductionBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [fillingFrames, setFillingFrames] = useState(false);
  const [view, setView] = useState<CoverageView>("board");
  const [dayFilter, setDayFilter] = useState<string>(dayFromUrl || "all");
  const [migrateNote, setMigrateNote] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
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

  useEffect(() => {
    if (dayFromUrl) setDayFilter(dayFromUrl);
  }, [dayFromUrl]);

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

  const refreshFromScript = async () => {
    if (!user || !board?.scriptSessionId || !canEdit) return;
    setRefreshing(true);
    setRefreshError(null);
    try {
      const { session: loaded } = await scriptWriterGetSession(
        () => user.getIdToken(),
        board.scriptSessionId
      );
      const session = loaded as ScriptWriterSession;
      const script = session.script as ScriptDocument | null;
      if (!script?.suggestedShots?.length) {
        setRefreshError(
          "Linked script has no suggested shots. Enable shot list / storyboard and regenerate."
        );
        return;
      }
      const days = mergeBoardCoverageFromScript(
        board.productionDays,
        script,
        session.inspirationImages ?? [],
        board.inspirationImages ?? []
      );
      persistBoard({ ...board, productionDays: days }, true);
      setMigrateNote(
        "Synced from script — uploaded frames, day placement, and filled-in DP fields were kept."
      );
    } catch (e) {
      setRefreshError(e instanceof Error ? e.message : "Could not refresh from script");
    } finally {
      setRefreshing(false);
    }
  };

  const fillEmptyFrames = async () => {
    if (!user || !board || !canEdit) return;
    setFillingFrames(true);
    setRefreshError(null);
    try {
      const result = await generateCoverageFramesBatch(() => user.getIdToken(), projectId, {
        onlyMissing: true,
        limit: 12,
        ...(dayFilter !== "all" ? { dayId: dayFilter } : {}),
      });
      const reloaded = await getProductionBoardByProject(projectId);
      if (reloaded) setBoard(reloaded);
      const n = result.generated.length;
      if (n === 0 && result.message) {
        setMigrateNote(result.message);
      } else {
        setMigrateNote(
          `Generated ${n} AI frame${n === 1 ? "" : "s"}${
            result.remaining > 0 ? ` — ${result.remaining} still empty (run again)` : ""
          }.`
        );
      }
      if (result.errors.length) {
        setRefreshError(result.errors.map((e) => e.error).slice(0, 2).join(" · "));
      }
    } catch (e) {
      setRefreshError(e instanceof Error ? e.message : "Could not generate AI frames");
    } finally {
      setFillingFrames(false);
    }
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
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-4 text-sm text-amber-950">
          <p className="font-semibold">Coverage needs a Prep board first</p>
          <p className="mt-1 text-amber-900/90">
            Open Prep, link your Script writer session, and{" "}
            <strong>Apply</strong> so shots land here. Coverage is the shot bible — one shot = one
            frame.
          </p>
          <Link
            href={`/projects/${projectId}/production`}
            className="mt-3 inline-flex font-medium text-sky-800 underline"
          >
            Open Prep →
          </Link>
        </div>
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
            ? `${project.projectName} — shot bible (edit frames & DP fields here). Day shots = on-set checkoff · Call sheet = logistics print.`
            : "Shot bible — one shot = one frame. Edit stills and DP fields here."
        }
        action={
          <div className="flex flex-wrap gap-2">
            {canEdit && totalShots > withImages && (
              <Button
                size="touch"
                variant="outline"
                disabled={fillingFrames || saving || refreshing}
                onClick={() => void fillEmptyFrames()}
              >
                <Sparkles className={`mr-2 h-4 w-4 ${fillingFrames ? "animate-pulse" : ""}`} />
                {fillingFrames ? "Generating…" : "Fill empty frames"}
              </Button>
            )}
            {board.scriptSessionId && canEdit && (
              <Button
                size="touch"
                variant="outline"
                disabled={refreshing || saving || fillingFrames}
                onClick={() => void refreshFromScript()}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                {refreshing ? "Syncing…" : "Sync from script"}
              </Button>
            )}
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

      {refreshError && (
        <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {refreshError}
        </p>
      )}
      {migrateNote && (
        <p className="mb-4 rounded-xl border border-sky-100 bg-sky-50 px-3 py-2 text-sm text-sky-900">
          {migrateNote}
        </p>
      )}
      {!board.scriptSessionId && (
        <p className="mb-4 text-sm text-slate-500">
          Link a script via Script writer → Apply to enable <strong>Sync from script</strong> (keeps
          your uploaded frames and day assignments).
        </p>
      )}

      {totalShots === 0 && (
        <div className="mb-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-4 text-sm text-sky-950">
          <p className="font-semibold">No coverage shots yet</p>
          <p className="mt-1 text-sky-900/90">
            From Script writer, use <strong>Apply to Prep + Coverage</strong>, or open Prep and apply
            the linked script. Then fill frames here (upload, library, or AI).
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link href="/script-writer" className="font-medium text-sky-800 underline">
              Script writer
            </Link>
            <Link
              href={`/projects/${projectId}/production`}
              className="font-medium text-sky-800 underline"
            >
              Prep board
            </Link>
          </div>
        </div>
      )}

      {(view === "board" || view === "linear") && (
        <CoverageBoardView
          projectId={projectId}
          shots={coverageShots}
          inspirationImages={board.inspirationImages ?? []}
          layout={view === "linear" ? "linear" : "grid"}
          readOnly={!canEdit}
          getIdToken={user ? () => user.getIdToken() : undefined}
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
