"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Printer, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ProductionDayNav } from "@/components/production/ProductionDayNav";
import { ProductionShotListEditor } from "@/components/production/ProductionShotListEditor";
import { ShotListPrintView } from "@/components/production/ShotListPrintView";
import { useProductionDayPage } from "@/hooks/useProductionDayPage";
import { useAuth } from "@/contexts/AuthContext";
import { scriptWriterGetSession } from "@/lib/scriptWriter/apiClient";
import { ScriptDocument, ScriptWriterSession } from "@/lib/scriptWriter/types";
import { mergeProductionShotsFromScript } from "@/lib/scriptWriter/scriptMappers";

export default function ShotListDayPage() {
  const params = useParams();
  const projectId = params.id as string;
  const dayId = params.dayId as string;
  const { user } = useAuth();
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

  const refreshFromScript = async () => {
    if (!user || !scriptSessionId) return;
    if (
      day.shots.length > 0 &&
      !window.confirm(
        "Replace the shot list from the linked script? Checkmarks are kept for matching shot numbers."
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
      const script = (loaded as ScriptWriterSession).script as ScriptDocument | null;
      if (!script?.suggestedShots?.length) {
        setRefreshError("Linked script has no suggested shots. Regenerate the script with detailed shot list enabled.");
        return;
      }
      patchDay({ shots: mergeProductionShotsFromScript(day.shots, script) });
    } catch (e) {
      setRefreshError(e instanceof Error ? e.message : "Could not refresh from script");
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
            <Button size="touch" variant="outline" onClick={() => window.print()}>
              <Printer className="mr-2 h-5 w-5" />
              Print shot list
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

      <p className="mb-4 rounded-xl border border-violet-100 bg-violet-50/60 px-4 py-3 text-sm text-violet-950 print:hidden">
        <strong>Shot list</strong> is your coverage checklist — wide, medium, close-up, inserts.
        Check each row on set. Crew times and schedule are on the{" "}
        <Link
          href={`/projects/${projectId}/production/days/${dayId}`}
          className="font-medium underline"
        >
          call sheet
        </Link>
        .
      </p>

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

      <ProductionShotListEditor
        shots={day.shots}
        onChange={(shots) => patchDay({ shots })}
        readOnly={!canEditShots}
        className="print:hidden"
      />

      <div className="hidden print:block">
        <ShotListPrintView projectName={project.projectName} day={day} boardTitle={board.filmTitle} />
      </div>
    </div>
  );
}
