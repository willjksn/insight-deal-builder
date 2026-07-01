"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, LayoutGrid, List, Printer, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ProductionDayNav } from "@/components/production/ProductionDayNav";
import { ProductionShotListEditor } from "@/components/production/ProductionShotListEditor";
import { ProductionStoryboardGridView } from "@/components/production/ProductionStoryboardGridView";
import { ShotListPrintView } from "@/components/production/ShotListPrintView";
import { StoryboardPrintView } from "@/components/production/StoryboardPrintView";
import { useProductionDayPage } from "@/hooks/useProductionDayPage";
import { useAuth } from "@/contexts/AuthContext";
import { scriptWriterGetSession } from "@/lib/scriptWriter/apiClient";
import { ScriptDocument, ScriptWriterSession } from "@/lib/scriptWriter/types";
import {
  mergeProductionSceneFramesFromScript,
  mergeProductionShotsFromScript,
  productionSceneFramesFromScript,
} from "@/lib/scriptWriter/scriptMappers";
import { cn } from "@/lib/utils/cn";

type ViewMode = "list" | "grid";

export default function ShotListDayPage() {
  const params = useParams();
  const projectId = params.id as string;
  const dayId = params.dayId as string;
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

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
  const hasStoryboard = sceneFrames.length > 0;

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
        shots: mergeProductionShotsFromScript(day.shots, script),
        sceneFrames:
          session.storyboardMode || script.storyboardFrames?.length
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
                disabled={refreshing}
                onClick={() => void refreshFromScript()}
              >
                <RefreshCw className={`mr-2 h-5 w-5 ${refreshing ? "animate-spin" : ""}`} />
                Refresh from script
              </Button>
            )}
            <Button
              size="touch"
              variant="outline"
              onClick={() => window.print()}
            >
              <Printer className="mr-2 h-5 w-5" />
              {viewMode === "grid" ? "Print storyboard" : "Print shot list"}
            </Button>
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
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <p className="max-w-xl rounded-xl border border-violet-100 bg-violet-50/60 px-4 py-3 text-sm text-violet-950">
          {viewMode === "grid" ? (
            <>
              <strong>Storyboard</strong> — one reference frame per scene for clients and pre-pro.
              Coverage checkboxes stay in <strong>List</strong> view.
            </>
          ) : (
            <>
              <strong>Shot list</strong> — wide, medium, close-up coverage. Check each row on set.
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
        </div>
      </div>

      {refreshError && (
        <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 print:hidden">
          {refreshError}
        </p>
      )}

      {!scriptSessionId && (
        <p className="mb-4 text-sm text-slate-500 print:hidden">
          Link a script via Script writer → Apply to project to enable{" "}
          <strong>Refresh from script</strong>.
        </p>
      )}

      {viewMode === "list" ? (
        <ProductionShotListEditor
          shots={day.shots}
          onChange={(shots) => patchDay({ shots })}
          readOnly={!canEditShots}
          className="print:hidden"
        />
      ) : (
        <>
          {!hasStoryboard && scriptSessionId && canEditShots && (
            <p className="mb-4 text-sm text-slate-600 print:hidden">
              No storyboard frames yet.{" "}
              <button
                type="button"
                className="font-medium text-amber-700 underline"
                onClick={() => void buildSceneFramesFromScript()}
              >
                Build from linked script
              </button>
            </p>
          )}
          <ProductionStoryboardGridView
            projectId={projectId}
            projectTitle={board.filmTitle || project.projectName}
            frames={sceneFrames}
            shots={day.shots}
            inspirationImages={board.inspirationImages}
            onChange={(frames) => patchDay({ sceneFrames: frames })}
            readOnly={!canEditShots}
            className="print:hidden"
          />
        </>
      )}

      <div className="hidden print:block">
        {viewMode === "grid" ? (
          <StoryboardPrintView
            projectName={project.projectName}
            day={day}
            boardTitle={board.filmTitle}
          />
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
