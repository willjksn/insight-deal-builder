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
import { syncShootProgressFromBoard } from "@/lib/contentPlan/apiClient";
import { canManageProjects, canUseProductionTools } from "@/lib/utils/permissions";
import type { Project } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { CoverageBoardView, type CoverageShotRow } from "@/components/production/CoverageBoardView";
import { CoverageListView } from "@/components/production/CoverageListView";
import { SceneCoverageChecklistPanel } from "@/components/production/SceneCoverageChecklistPanel";
import {
  coverageChecklistProgress,
  seedBoardCoverageChecklists,
  syncCoverageChecklistWithShots,
  type SceneCoverageChecklist,
} from "@/lib/production/sceneCoverageChecklist";
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
  const [statusNote, setStatusNote] = useState<string | null>(null);
  const [syncingShootMode, setSyncingShootMode] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shootSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const localEditRef = useRef(false);
  const savingRef = useRef(false);
  const migratedRef = useRef(false);
  const syncingShootModeRef = useRef(false);

  const getToken = useCallback(() => {
    if (!user) return Promise.resolve(null);
    return user.getIdToken();
  }, [user]);

  const scheduleAutoSyncToShootMode = useCallback(() => {
    const planId = project?.sourceContentPlanId?.trim();
    if (!planId) return;
    if (shootSyncTimer.current) clearTimeout(shootSyncTimer.current);
    shootSyncTimer.current = setTimeout(() => {
      shootSyncTimer.current = null;
      if (syncingShootModeRef.current) return;
      syncingShootModeRef.current = true;
      setSyncingShootMode(true);
      void syncShootProgressFromBoard(getToken, planId)
        .then((result) => {
          if (result.updatedCount > 0) {
            setStatusNote(
              `Shoot Mode updated · ${result.updatedCount} shot${
                result.updatedCount === 1 ? "" : "s"
              }.`
            );
          }
        })
        .catch(() => {
          /* quiet — manual Sync remains */
        })
        .finally(() => {
          syncingShootModeRef.current = false;
          setSyncingShootMode(false);
        });
    }, 1600);
  }, [getToken, project?.sourceContentPlanId]);

  useEffect(() => {
    return () => {
      if (shootSyncTimer.current) clearTimeout(shootSyncTimer.current);
    };
  }, []);

  async function onSyncToShootMode() {
    const planId = project?.sourceContentPlanId?.trim();
    if (!planId) return;
    if (shootSyncTimer.current) {
      clearTimeout(shootSyncTimer.current);
      shootSyncTimer.current = null;
    }
    syncingShootModeRef.current = true;
    setSyncingShootMode(true);
    setRefreshError(null);
    setStatusNote(null);
    try {
      const result = await syncShootProgressFromBoard(getToken, planId);
      setStatusNote(
        result.updatedCount
          ? `Synced ${result.updatedCount} shot${result.updatedCount === 1 ? "" : "s"} to Shoot Mode.`
          : "Shoot Mode already matched coverage — nothing to update."
      );
    } catch (e) {
      setRefreshError(e instanceof Error ? e.message : "Could not sync to Shoot Mode");
    } finally {
      syncingShootModeRef.current = false;
      setSyncingShootMode(false);
    }
  }

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
      productionDays: board.productionDays.map((day) => {
        if (day.id !== dayId) return day;
        const shots = (day.shots ?? []).map((s) =>
          s.id === shotId ? { ...s, ...patch } : s
        );
        const next = { ...day, shots };
        if ("done" in patch || "shotType" in patch || "sceneRef" in patch) {
          next.coverageChecklists = syncCoverageChecklistWithShots(
            day.coverageChecklists,
            shots
          );
        }
        return next;
      }),
    });
    if ("done" in patch || "notes" in patch) {
      scheduleAutoSyncToShootMode();
    }
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
      productionDays: board.productionDays.map((day) => {
        if (day.id !== dayId) return day;
        const shots = (day.shots ?? [])
          .filter((s) => s.id !== shotId)
          .map((s, i) => ({ ...s, sortOrder: i }));
        return {
          ...day,
          shots,
          coverageChecklists: syncCoverageChecklistWithShots(
            day.coverageChecklists,
            shots
          ),
        };
      }),
    });
  };

  const toggleCoverageItem = (dayId: string, sceneRef: string, itemId: string) => {
    if (!board || !canEdit) return;
    persistBoard({
      ...board,
      productionDays: board.productionDays.map((day) => {
        if (day.id !== dayId || !day.coverageChecklists?.length) return day;
        return {
          ...day,
          coverageChecklists: day.coverageChecklists.map((checklist) =>
            checklist.sceneRef !== sceneRef
              ? checklist
              : {
                  ...checklist,
                  items: checklist.items.map((item) =>
                    item.id === itemId ? { ...item, done: !item.done } : item
                  ),
                }
          ),
        };
      }),
    });
  };

  const seedCoverageChecklists = async () => {
    if (!user || !board?.scriptSessionId || !canEdit) return;
    setRefreshing(true);
    setRefreshError(null);
    try {
      const { session: loaded } = await scriptWriterGetSession(
        () => user.getIdToken(),
        board.scriptSessionId
      );
      const session = loaded as ScriptWriterSession;
      const days = seedBoardCoverageChecklists({
        days: board.productionDays,
        script: session.script as ScriptDocument | null,
        detailedShotList: session.detailedShotList !== false,
        brief: session.brief ?? null,
      });
      persistBoard({ ...board, productionDays: days }, true);
      setMigrateNote("Built required coverage checklists from script-writer settings.");
    } catch (e) {
      setRefreshError(e instanceof Error ? e.message : "Could not build coverage checklists");
    } finally {
      setRefreshing(false);
    }
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
      const merged = mergeBoardCoverageFromScript(
        board.productionDays,
        script,
        session.inspirationImages ?? [],
        board.inspirationImages ?? []
      );
      const days = seedBoardCoverageChecklists({
        days: merged,
        script,
        detailedShotList: session.detailedShotList !== false,
        brief: session.brief ?? null,
      });
      persistBoard({ ...board, productionDays: days }, true);
      setMigrateNote(
        "Synced from script — uploaded frames, day placement, filled-in DP fields, and required coverage were kept/updated."
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
  const visibleDays =
    dayFilter === "all" ? sortedDays : sortedDays.filter((d) => d.id === dayFilter);
  const deskChecklists: {
    dayId: string;
    dayNumber: number;
    dayTitle?: string;
    checklists: SceneCoverageChecklist[];
  }[] = visibleDays
    .map((d) => ({
      dayId: d.id,
      dayNumber: d.dayNumber,
      dayTitle: d.title,
      checklists: d.coverageChecklists ?? [],
    }))
    .filter((d) => d.checklists.length > 0);
  const boardCoverageProgress = coverageChecklistProgress(
    visibleDays.flatMap((d) => d.coverageChecklists ?? [])
  );
  const anyChecklistsOnBoard = board.productionDays.some(
    (d) => (d.coverageChecklists?.length ?? 0) > 0
  );

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
            {project?.sourceContentPlanId && canEdit ? (
              <Button
                size="touch"
                variant="outline"
                disabled={syncingShootMode || saving || refreshing}
                onClick={() => void onSyncToShootMode()}
                title="Also runs automatically after you mark shots done or edit notes"
              >
                <Clapperboard
                  className={`mr-2 h-4 w-4 ${syncingShootMode ? "animate-pulse" : ""}`}
                />
                {syncingShootMode ? "Syncing…" : "Sync to Shoot Mode"}
              </Button>
            ) : null}
            {board.scriptSessionId && canEdit && !anyChecklistsOnBoard && (
              <Button
                size="touch"
                variant="outline"
                disabled={refreshing || saving}
                onClick={() => void seedCoverageChecklists()}
              >
                Build required coverage
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
          {boardCoverageProgress.total > 0
            ? ` · Coverage ${boardCoverageProgress.done}/${boardCoverageProgress.total}`
            : ""}
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
      {statusNote && (
        <p className="mb-4 rounded-xl border border-sky-100 bg-sky-50 px-3 py-2 text-sm text-sky-900">
          {statusNote}
        </p>
      )}
      {board.scriptSessionId ? (
        <p className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
          <strong className="font-medium text-slate-800">Apply</strong> (in Script writer) = first
          push of shots into Prep + Coverage.{" "}
          <strong className="font-medium text-slate-800">Sync from script</strong> = refresh after the
          script changes — keeps your frames, day placement, and filled DP fields.
        </p>
      ) : (
        <p className="mb-4 text-sm text-slate-500">
          From Script writer, use <strong>Apply to Prep + Coverage</strong> once to seed this desk.
          After that, use <strong>Sync from script</strong> here when the script changes.
        </p>
      )}

      {totalShots === 0 && (
        <div className="mb-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-4 text-sm text-sky-950">
          <p className="font-semibold">
            {board.scriptSessionId
              ? "Script linked — no coverage shots yet"
              : "No coverage shots yet"}
          </p>
          <p className="mt-1 text-sky-900/90">
            {board.scriptSessionId ? (
              <>
                Use <strong>Sync from script</strong> above to pull the shot list (or reopen the
                script and Apply again). Then fill frames here.
              </>
            ) : (
              <>
                From Script writer, use <strong>Apply to Prep + Coverage</strong> once. That seeds
                Prep and this Coverage desk. Later script edits → Sync here (not Apply again).
              </>
            )}
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link
              href={
                board.scriptSessionId
                  ? `/script-writer/${board.scriptSessionId}`
                  : "/script-writer"
              }
              className="font-medium text-sky-800 underline"
            >
              {board.scriptSessionId ? "Open linked script → Apply" : "Script writer"}
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

      {deskChecklists.length > 0 ? (
        <div className="mb-6 space-y-4">
          {deskChecklists.map(({ dayId, dayNumber, dayTitle, checklists }) => (
            <div key={dayId}>
              {deskChecklists.length > 1 || dayFilter === "all" ? (
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Day {dayNumber}
                  {dayTitle && dayTitle !== `Day ${dayNumber}` ? ` — ${dayTitle}` : ""}
                </p>
              ) : null}
              <SceneCoverageChecklistPanel
                checklists={checklists}
                canEdit={canEdit}
                compact
                onToggle={(sceneRef, itemId) => toggleCoverageItem(dayId, sceneRef, itemId)}
              />
            </div>
          ))}
        </div>
      ) : null}

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
