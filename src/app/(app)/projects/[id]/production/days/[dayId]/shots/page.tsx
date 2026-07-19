"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useRef, useState } from "react";
import { ArrowLeft, CalendarRange, FileStack, LayoutGrid, List, Printer, RefreshCw, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ProductionDayNav } from "@/components/production/ProductionDayNav";
import { ProductionShotListEditor } from "@/components/production/ProductionShotListEditor";
import { CoverageBoardView } from "@/components/production/CoverageBoardView";
import { ShotListPrintView } from "@/components/production/ShotListPrintView";
import { StoryboardPrintView } from "@/components/production/StoryboardPrintView";
import { CrewPacketPrintView, scrollToCrewPacketSection } from "@/components/production/CrewPacketPrintView";
import { useProductionDayPage } from "@/hooks/useProductionDayPage";
import { useAuth } from "@/contexts/AuthContext";
import { generateCrewPacketForDay } from "@/lib/production/crewPacketClient";
import { CREW_PACKET_ROLE_LABELS } from "@/lib/production/crewPacketTypes";
import { scriptWriterGetSession } from "@/lib/scriptWriter/apiClient";
import { ScriptDocument, ScriptWriterSession } from "@/lib/scriptWriter/types";
import {
  mergeProductionSceneFramesFromScript,
  productionSceneFramesFromScript,
} from "@/lib/scriptWriter/scriptMappers";
import { mergeDayShotsFromScript } from "@/lib/production/coverageSync";
import {
  applyAutoSplitToBoard,
  buildAutoSplitPlan,
  collectAllBoardShots,
  sceneLocationMap,
  summarizeSplitPlan,
} from "@/lib/production/splitShotsAcrossDays";
import { cn } from "@/lib/utils/cn";

type ViewMode = "list" | "grid" | "packet";

function printLabel(viewMode: ViewMode): string {
  if (viewMode === "grid") return "Print storyboard";
  if (viewMode === "packet") return "Print crew packet";
  return "Print shot list";
}

export default function ShotListDayPage() {
  const params = useParams();
  const projectId = params.id as string;
  const dayId = params.dayId as string;
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [refreshing, setRefreshing] = useState(false);
  const [generatingPacket, setGeneratingPacket] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [draggingShotId, setDraggingShotId] = useState<string | null>(null);
  const [dragOverDayId, setDragOverDayId] = useState<string | null>(null);
  const [splitting, setSplitting] = useState(false);
  const packetPreviewRef = useRef<HTMLDivElement>(null);

  const {
    project,
    board,
    day,
    sortedDays,
    loading,
    saving,
    allowed,
    canEditShots,
    patchDay,
    moveShotToDay,
    applyProductionDays,
    addProductionDay,
    removeProductionDay,
  } = useProductionDayPage(projectId, dayId);

  if (loading) return <LoadingSpinner className="py-20" />;

  if (!allowed) {
    return (
      <div className="py-20 text-center text-slate-500">
        <p>Access denied.</p>
        <Link href={`/projects/${projectId}`}>
          <Button className="mt-4" variant="outline">
            Back
          </Button>
        </Link>
      </div>
    );
  }

  if (!project || !board || !day) {
    return (
      <div className="py-20 text-center text-slate-500">
        <p>Shot list not found.</p>
        <Link href={`/projects/${projectId}/production`}>
          <Button className="mt-4" variant="outline">
            Pre-production board
          </Button>
        </Link>
      </div>
    );
  }

  const doneCount = day.shots.filter((s) => s.done).length;
  const scriptSessionId = board.scriptSessionId;
  const sceneFrames = day.sceneFrames ?? [];
  const dayCoverageShots = (day.shots ?? []).map((shot) => ({
    ...shot,
    dayId: day.id,
    dayNumber: day.dayNumber,
    dayTitle: day.title,
  }));
  const crewPacket = day.crewPacket;
  const otherDays = sortedDays
    .filter((d) => d.id !== dayId)
    .map((d) => ({ id: d.id, dayNumber: d.dayNumber, title: d.title }));

  const refreshFromScript = async () => {
    if (!user || !scriptSessionId) return;
    if (
      (day.shots.length > 0 || sceneFrames.length > 0) &&
      !window.confirm(
        "Replace the shot list and storyboard from the linked script? Shot checkmarks and uploaded storyboard images are kept where possible."
      )
    ) {
      return;
    }
    setRefreshing(true);
    setRefreshError(null);
    try {
      const { session: loaded } = await scriptWriterGetSession(
        () => user.getIdToken(),
        scriptSessionId
      );
      const session = loaded as ScriptWriterSession;
      const script = session.script as ScriptDocument | null;
      if (!script?.suggestedShots?.length) {
        setRefreshError(
          "Linked script has no suggested shots. Regenerate with Storyboard or detailed shot list enabled."
        );
        return;
      }
      const sessionImages = session.inspirationImages ?? [];
      patchDay({
        shots: mergeDayShotsFromScript(
          day.shots,
          script,
          sessionImages,
          board.inspirationImages
        ),
        sceneFrames: script.scenes?.length
          ? mergeProductionSceneFramesFromScript(
              sceneFrames,
              script,
              sessionImages,
              board.inspirationImages
            )
          : sceneFrames,
      });
    } catch (e) {
      setRefreshError(e instanceof Error ? e.message : "Could not refresh from script");
    } finally {
      setRefreshing(false);
    }
  };

  const buildSceneFramesFromScript = async () => {
    if (!user || !scriptSessionId) return;
    setRefreshing(true);
    setRefreshError(null);
    try {
      const { session: loaded } = await scriptWriterGetSession(
        () => user.getIdToken(),
        scriptSessionId
      );
      const session = loaded as ScriptWriterSession;
      const script = session.script as ScriptDocument | null;
      if (!script) {
        setRefreshError("No script on linked session.");
        return;
      }
      patchDay({
        sceneFrames: productionSceneFramesFromScript(
          script,
          session.inspirationImages ?? [],
          board.inspirationImages
        ),
      });
      setViewMode("grid");
    } catch (e) {
      setRefreshError(e instanceof Error ? e.message : "Could not build storyboard");
    } finally {
      setRefreshing(false);
    }
  };

  const autoSplitAcrossDays = async () => {
    if (!user || !board) return;
    const allShots = collectAllBoardShots(board);
    if (allShots.length === 0) {
      setRefreshError("Add shots before auto-splitting across days.");
      return;
    }

    setSplitting(true);
    setRefreshError(null);
    try {
      let script: ScriptDocument | null = null;
      if (scriptSessionId) {
        const { session: loaded } = await scriptWriterGetSession(
          () => user.getIdToken(),
          scriptSessionId
        );
        script = (loaded as ScriptWriterSession).script as ScriptDocument | null;
      }

      const targetInput = window.prompt(
        `Auto-split ${allShots.length} shots across shoot days.\n\nEnter number of days (leave blank for automatic by location):`,
        String(buildAutoSplitPlan({ shots: allShots, script }).suggestedDays)
      );
      if (targetInput === null) return;

      const trimmed = targetInput.trim();
      const targetDays = trimmed ? Math.max(1, parseInt(trimmed, 10) || 1) : undefined;

      const plan = buildAutoSplitPlan({ shots: allShots, script, targetDays });
      const sceneLocations = sceneLocationMap(script);
      const summary = summarizeSplitPlan(plan.dayShots, sceneLocations).join("\n");

      const ok = window.confirm(
        `Split into ${plan.suggestedDays} shoot day(s)?\n\n${summary}\n\nExisting day assignments will be replaced. You can still drag shots between days after.`
      );
      if (!ok) return;

      const nextDays = applyAutoSplitToBoard(board, plan.dayShots, sceneLocations);
      applyProductionDays(nextDays);
    } catch (e) {
      setRefreshError(e instanceof Error ? e.message : "Auto-split failed");
    } finally {
      setSplitting(false);
    }
  };

  const generateCrewPacket = async () => {
    if (!user) return;
    if (day.shots.length === 0) {
      setRefreshError("Add shots to the list before generating a crew packet.");
      return;
    }
    setGeneratingPacket(true);
    setRefreshError(null);
    try {
      const packet = await generateCrewPacketForDay(
        () => user.getIdToken(),
        projectId,
        dayId,
        scriptSessionId
      );
      patchDay({ crewPacket: packet });
      setViewMode("packet");
    } catch (e) {
      setRefreshError(e instanceof Error ? e.message : "Could not generate crew packet");
    } finally {
      setGeneratingPacket(false);
    }
  };

  return (
    <div className="pb-24">
      <PageHeader
        title={`Shot list — Day ${day.dayNumber}`}
        subtitle={`${project.projectName} · ${doneCount}/${day.shots.length} shots captured`}
        action={
          <div className="flex flex-wrap gap-2">
            {saving && <span className="text-sm text-slate-400">Saving…</span>}
            {scriptSessionId && canEditShots && (
              <Button
                size="touch"
                variant="outline"
                disabled={refreshing || generatingPacket}
                onClick={() => void refreshFromScript()}
              >
                <RefreshCw className={`mr-2 h-5 w-5 ${refreshing ? "animate-spin" : ""}`} />
                Refresh from script
              </Button>
            )}
            {canEditShots && (
              <Button
                size="touch"
                variant="outline"
                disabled={splitting || refreshing}
                onClick={() => void autoSplitAcrossDays()}
              >
                <CalendarRange className={`mr-2 h-5 w-5 ${splitting ? "animate-pulse" : ""}`} />
                {splitting ? "Splitting…" : "Auto-split days"}
              </Button>
            )}
            {canEditShots && (
              <Button
                size="touch"
                variant="outline"
                disabled={generatingPacket || day.shots.length === 0}
                onClick={() => void generateCrewPacket()}
              >
                <Sparkles className={`mr-2 h-5 w-5 ${generatingPacket ? "animate-pulse" : ""}`} />
                {generatingPacket ? "Generating…" : "Crew packet"}
              </Button>
            )}
            <Button size="touch" variant="outline" onClick={() => window.print()}>
              <Printer className="mr-2 h-5 w-5" />
              {printLabel(viewMode)}
            </Button>
            <Link href={`/projects/${projectId}/coverage`}>
              <Button size="touch" variant="outline">
                Coverage desk
              </Button>
            </Link>
            <Link href={`/projects/${projectId}/production/days/${dayId}`}>
              <Button size="touch" variant="outline">
                Call sheet
              </Button>
            </Link>
            <Link href={`/projects/${projectId}/production`}>
              <Button size="touch" variant="outline">
                <ArrowLeft className="mr-2 h-5 w-5" />
                Board
              </Button>
            </Link>
          </div>
        }
      />

      <ProductionDayNav
        projectId={projectId}
        dayId={dayId}
        sortedDays={sortedDays}
        activeView="shots"
        onAddDay={() => void addProductionDay()}
        onRemoveDay={(id) => void removeProductionDay(id)}
        shotDragActive={Boolean(draggingShotId)}
        dragOverDayId={dragOverDayId}
        onDayDragEnter={setDragOverDayId}
        onDayDragLeave={() => setDragOverDayId(null)}
        onDropShotOnDay={(targetDayId, shotId) => {
          moveShotToDay(shotId, targetDayId);
          setDraggingShotId(null);
          setDragOverDayId(null);
        }}
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <p className="max-w-xl rounded-xl border border-violet-100 bg-violet-50/60 px-4 py-3 text-sm text-violet-950">
          {viewMode === "grid" ? (
            <>
              <strong>Storyboard</strong> — one frame per shot (same as Coverage desk). Upload
              references, mark captured, expand for DP details. Prefer the project{" "}
              <Link href={`/projects/${projectId}/coverage`} className="font-medium underline">
                Coverage
              </Link>{" "}
              desk for all days.
            </>
          ) : viewMode === "packet" ? (
            <>
              <strong>Crew packet</strong> — master shot list plus Director, DP, Gaffer, Sound,
              Talent, and Art/Props sections. Tap a role to jump, or scroll the full preview below.
              {sortedDays.length === 1 && (
                <>
                  {" "}
                  All script shots start on Day 1 unless you add more shoot days and split them
                  manually.
                </>
              )}
            </>
          ) : (
            <>
              <strong>Shot list</strong> — drag shots to another day tab, or use Move to… for
              schedule changes. <strong>Auto-split days</strong> groups by location.
            </>
          )}
        </p>
        <div className="flex rounded-xl border border-slate-200 bg-white p-1">
          <button
            type="button"
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium",
              viewMode === "list" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"
            )}
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4" />
            List
          </button>
          <button
            type="button"
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium",
              viewMode === "grid" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"
            )}
            onClick={() => setViewMode("grid")}
          >
            <LayoutGrid className="h-4 w-4" />
            Storyboard
          </button>
          <button
            type="button"
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium",
              viewMode === "packet" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"
            )}
            onClick={() => setViewMode("packet")}
          >
            <FileStack className="h-4 w-4" />
            Crew packet
          </button>
        </div>
      </div>

      {refreshError && (
        <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 print:hidden">
          {refreshError}
        </p>
      )}

      {!scriptSessionId && viewMode !== "packet" && (
        <p className="mb-4 text-sm text-slate-500 print:hidden">
          Link a script via Script writer → Apply to project to enable{" "}
          <strong>Refresh from script</strong> and richer crew packets.
        </p>
      )}

      {viewMode === "list" && sortedDays.length === 1 && canEditShots && (
        <p className="mb-4 text-sm text-slate-500 print:hidden">
          Use <strong>Add day</strong> above, then <strong>Auto-split days</strong> or drag shots
          between day tabs when the schedule changes.
        </p>
      )}

      {viewMode === "list" ? (
        <ProductionShotListEditor
          shots={day.shots}
          onChange={(shots) => patchDay({ shots })}
          readOnly={!canEditShots}
          className="print:hidden"
          currentDayId={dayId}
          otherDays={otherDays}
          onMoveToDay={moveShotToDay}
          draggingShotId={draggingShotId}
          onDragStateChange={setDraggingShotId}
        />
      ) : viewMode === "grid" ? (
        <>
          {dayCoverageShots.length === 0 && scriptSessionId && canEditShots && (
            <p className="mb-4 text-sm text-slate-600 print:hidden">
              No shots on this day yet. Use <strong>Refresh from script</strong> in List view, or{" "}
              <button
                type="button"
                className="font-medium text-amber-700 underline"
                onClick={() => void buildSceneFramesFromScript()}
              >
                seed legacy scene frames
              </button>{" "}
              (optional).
            </p>
          )}
          <CoverageBoardView
            projectId={projectId}
            shots={dayCoverageShots}
            inspirationImages={board.inspirationImages}
            layout="grid"
            readOnly={!canEditShots}
            onPatchShot={(_dayId, shotId, patch) =>
              patchDay({
                shots: day.shots.map((s) => (s.id === shotId ? { ...s, ...patch } : s)),
              })
            }
            className="print:hidden"
          />
        </>
      ) : (
        <section className="print:hidden rounded-2xl border border-slate-200 bg-white p-6">
          {!crewPacket ? (
            <div className="text-center py-8">
              <FileStack className="mx-auto h-10 w-10 text-slate-300" />
              <h2 className="mt-3 font-semibold text-slate-900">Crew printout packet</h2>
              <p className="mt-2 max-w-md mx-auto text-sm text-slate-600">
                Generates a full on-set packet: master shot list, lighting targets, and separate
                sections for Director, DP, Gaffer, Sound, Talent, and Art/Props — like a professional
                shoot day printout.
              </p>
              {day.shots.length === 0 ? (
                <p className="mt-4 text-sm text-amber-800">
                  Add shots in <strong>List</strong> view or refresh from script first.
                </p>
              ) : (
                canEditShots && (
                  <Button
                    className="mt-4"
                    size="touch"
                    disabled={generatingPacket}
                    onClick={() => void generateCrewPacket()}
                  >
                    <Sparkles className="mr-2 h-5 w-5" />
                    {generatingPacket ? "Generating…" : "Generate crew packet"}
                  </Button>
                )
              )}
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div>
                  <h2 className="font-semibold text-slate-900">{crewPacket.title}</h2>
                  <p className="text-sm text-slate-600">{crewPacket.subtitle}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {crewPacket.masterShots.length} master shots ·{" "}
                    {crewPacket.roleSections.length} crew sections · Updated{" "}
                    {new Date(crewPacket.generatedAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      packetPreviewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                  >
                    View full packet
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => window.print()}>
                    <Printer className="mr-1 h-4 w-4" />
                    Print
                  </Button>
                  {canEditShots && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={generatingPacket}
                      onClick={() => void generateCrewPacket()}
                    >
                      <RefreshCw
                        className={`mr-1 h-4 w-4 ${generatingPacket ? "animate-spin" : ""}`}
                      />
                      Regenerate
                    </Button>
                  )}
                </div>
              </div>

              <p className="mb-3 text-xs text-slate-500">
                Jump to a section — tap a role below, or scroll the full packet.
              </p>
              <div className="mb-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 hover:border-sky-300 hover:bg-sky-50"
                  onClick={() => scrollToCrewPacketSection("crew-packet-cover")}
                >
                  Cover & beats
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 hover:border-sky-300 hover:bg-sky-50"
                  onClick={() => scrollToCrewPacketSection("crew-packet-master")}
                >
                  Master shot list
                </button>
                {crewPacket.lightingTargets.length > 0 && (
                  <button
                    type="button"
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 hover:border-sky-300 hover:bg-sky-50"
                    onClick={() => scrollToCrewPacketSection("crew-packet-lighting")}
                  >
                    Lighting
                  </button>
                )}
                {crewPacket.roleSections.map((section) => (
                  <button
                    key={section.roleId}
                    type="button"
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-xs hover:border-sky-400 hover:bg-sky-50 hover:shadow-sm transition-colors"
                    onClick={() => scrollToCrewPacketSection(`crew-packet-role-${section.roleId}`)}
                  >
                    <span className="font-semibold text-slate-900">
                      {CREW_PACKET_ROLE_LABELS[section.roleId]}
                    </span>
                    <span className="mt-0.5 block text-slate-500">
                      {section.shotPriorities.length} shots
                    </span>
                  </button>
                ))}
              </div>

              {sortedDays.length > 1 && (
                <p className="mb-4 rounded-xl border border-amber-100 bg-amber-50/80 px-4 py-3 text-xs text-amber-950">
                  <strong>Multi-day shoots:</strong> Each day has its own shot list and crew packet.
                  Gemini does not auto-split shots across days — use{" "}
                  <strong>Add day</strong> above, move or copy shots per day in{" "}
                  <strong>List</strong> view, then generate a separate packet for each shoot day.
                </p>
              )}

              <div
                ref={packetPreviewRef}
                className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 md:p-8 overflow-x-auto"
              >
                <CrewPacketPrintView packet={crewPacket} mode="screen" />
              </div>
            </>
          )}
        </section>
      )}

      <div className="hidden print:block">
        {viewMode === "grid" ? (
          <StoryboardPrintView
            projectName={project.projectName}
            day={day}
            boardTitle={board.filmTitle}
          />
        ) : viewMode === "packet" && crewPacket ? (
          <CrewPacketPrintView packet={crewPacket} />
        ) : viewMode === "packet" ? (
          <p className="text-sm text-slate-500">Generate a crew packet before printing.</p>
        ) : (
          <ShotListPrintView
            projectName={project.projectName}
            day={day}
            boardTitle={board.filmTitle}
          />
        )}
      </div>
    </div>
  );
}
