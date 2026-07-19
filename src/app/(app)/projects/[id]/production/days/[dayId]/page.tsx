"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { CallSheetView } from "@/components/production/CallSheetView";
import { CoverageDayStrip } from "@/components/production/CoverageDayStrip";
import { ProductionDayNav } from "@/components/production/ProductionDayNav";
import {
  applyKeyContactsFromBoard,
} from "@/lib/production/callSheetContacts";
import {
  appendLocationsToSchedule,
  applyFirstBookedLocation,
} from "@/lib/production/locationSync";
import {
  ProductionDayScheduleBlock,
  ProductionLocationEntry,
} from "@/lib/production/types";
import { useProductionDayPage } from "@/hooks/useProductionDayPage";
import { Plus, Trash2 } from "lucide-react";

export default function CallSheetDayPage() {
  const params = useParams();
  const projectId = params.id as string;
  const dayId = params.dayId as string;

  const {
    project,
    board,
    day,
    sortedDays,
    boardBookedLocations,
    loading,
    saving,
    allowed,
    canEditSchedule,
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
        <p>Call sheet not found.</p>
        <Link href={`/projects/${projectId}/production`}>
          <Button className="mt-4" variant="outline">
            Pre-production board
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="pb-24">
      <PageHeader
        title={`Call sheet — Day ${day.dayNumber}`}
        subtitle={`${project.projectName} · times, crew, locations`}
        action={
          <div className="flex flex-wrap gap-2">
            {saving && <span className="text-sm text-slate-400">Saving…</span>}
            <Button size="touch" variant="outline" onClick={() => window.print()}>
              <Printer className="mr-2 h-5 w-5" />
              Print call sheet
            </Button>
            <Link href={`/projects/${projectId}/coverage`}>
              <Button size="touch" variant="outline">
                Coverage
              </Button>
            </Link>
            <Link href={`/projects/${projectId}/production/days/${dayId}/shots`}>
              <Button size="touch" variant="outline">
                Day shots
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
        activeView="call-sheet"
        onAddDay={() => void addProductionDay()}
        onRemoveDay={(id) => void removeProductionDay(id)}
      />

      <div className="grid gap-8 lg:grid-cols-2 print:block">
        <div className="space-y-4 print:hidden">
          <p className="rounded-xl border border-sky-100 bg-sky-50/60 px-4 py-3 text-sm text-sky-950">
            <strong>Call sheet</strong> is logistics for the day — crew call, schedule, locations.
            What you’re shooting is summarized below; edit frames on{" "}
            <Link href={`/projects/${projectId}/coverage`} className="font-medium underline">
              Coverage
            </Link>
            .
          </p>

          <CoverageDayStrip
            projectId={projectId}
            dayId={dayId}
            dayNumber={day.dayNumber}
            shots={day.shots ?? []}
          />

          <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
            <h2 className="font-semibold">Day details</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Title" value={day.title} onChange={(e) => patchDay({ title: e.target.value })} />
              <Input label="Shoot date" type="date" value={day.shootDate ?? ""} onChange={(e) => patchDay({ shootDate: e.target.value })} />
              <Input label="Crew call" value={day.crewCall ?? ""} onChange={(e) => patchDay({ crewCall: e.target.value })} />
              <Input label="Breakfast" value={day.breakfast ?? ""} onChange={(e) => patchDay({ breakfast: e.target.value })} />
              <Input label="Lunch" value={day.lunch ?? ""} onChange={(e) => patchDay({ lunch: e.target.value })} />
              <Input label="Est. wrap" value={day.wrapTime ?? ""} onChange={(e) => patchDay({ wrapTime: e.target.value })} />
              <Input label="Sunrise" value={day.sunrise ?? ""} onChange={(e) => patchDay({ sunrise: e.target.value })} />
              <Input label="Sunset" value={day.sunset ?? ""} onChange={(e) => patchDay({ sunset: e.target.value })} />
            </div>
            <Input
              label="Scenes"
              value={day.scenes.join(", ")}
              onChange={(e) =>
                patchDay({
                  scenes: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                })
              }
            />
            <Input label="Primary location" value={day.primaryLocation ?? ""} onChange={(e) => patchDay({ primaryLocation: e.target.value })} />
            <Input label="Primary address" value={day.primaryAddress ?? ""} onChange={(e) => patchDay({ primaryAddress: e.target.value })} />
            {boardBookedLocations.length > 0 && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => board && patchDay(applyFirstBookedLocation(day, board))}
              >
                Use board location
              </Button>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Producer" value={day.producerName ?? ""} onChange={(e) => patchDay({ producerName: e.target.value })} />
              <Input label="AD" value={day.adName ?? ""} onChange={(e) => patchDay({ adName: e.target.value })} />
              <Input label="Director" value={day.directorName ?? ""} onChange={(e) => patchDay({ directorName: e.target.value })} />
              <Input label="DP" value={day.dpName ?? ""} onChange={(e) => patchDay({ dpName: e.target.value })} />
            </div>
            <Textarea label="Weather / notes" value={day.weatherNotes ?? ""} onChange={(e) => patchDay({ weatherNotes: e.target.value })} rows={3} />
            <Button type="button" size="sm" variant="outline" onClick={() => patchDay(applyKeyContactsFromBoard(day, board))}>
              Sync key contacts from board
            </Button>
          </section>

          <ScheduleEditor
            blocks={day.schedule}
            boardLocations={boardBookedLocations}
            onChange={(schedule) => patchDay({ schedule })}
            readOnly={!canEditSchedule}
          />
        </div>

        <div className="print:w-full">
          <CallSheetView board={board} day={day} printMode />
        </div>
      </div>
    </div>
  );
}

function ScheduleEditor({
  blocks,
  boardLocations,
  onChange,
  readOnly,
}: {
  blocks: ProductionDayScheduleBlock[];
  boardLocations: ProductionLocationEntry[];
  onChange: (blocks: ProductionDayScheduleBlock[]) => void;
  readOnly?: boolean;
}) {
  const sorted = [...blocks].sort((a, b) => a.sortOrder - b.sortOrder);

  const add = () => {
    onChange([
      ...blocks,
      {
        id: crypto.randomUUID(),
        label: "Block",
        sortOrder: blocks.length,
      },
    ]);
  };

  const addFromBoard = () => {
    if (!boardLocations.length) return;
    const next = appendLocationsToSchedule(
      {
        id: "",
        title: "",
        dayNumber: 0,
        scenes: [],
        schedule: blocks,
        shots: [],
      },
      boardLocations
    );
    onChange(next.schedule);
  };

  const update = (id: string, patch: Partial<ProductionDayScheduleBlock>) => {
    onChange(blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  };

  return (
    <section id="schedule" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">Schedule</h2>
        <div className="flex flex-wrap gap-2">
          {!readOnly && boardLocations.length > 0 && (
            <Button type="button" size="sm" variant="outline" onClick={addFromBoard}>
              Add board locations
            </Button>
          )}
          {!readOnly && (
            <Button type="button" size="sm" variant="outline" onClick={add}>
              <Plus className="mr-1 h-4 w-4" />
              Add block
            </Button>
          )}
        </div>
      </div>
      {sorted.map((block) => (
        <div key={block.id} className="rounded-xl border border-slate-100 p-3 space-y-2">
          <div className="flex justify-between gap-2">
            <Input
              value={block.label}
              onChange={(e) => update(block.id, { label: e.target.value })}
              placeholder="Block label"
              disabled={readOnly}
            />
            {!readOnly && (
              <button
                type="button"
                className="text-slate-400 hover:text-red-500"
                onClick={() => onChange(blocks.filter((b) => b.id !== block.id))}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input value={block.startTime ?? ""} onChange={(e) => update(block.id, { startTime: e.target.value })} placeholder="Start" disabled={readOnly} />
            <Input value={block.endTime ?? ""} onChange={(e) => update(block.id, { endTime: e.target.value })} placeholder="End" disabled={readOnly} />
          </div>
          <Input value={block.locationName ?? ""} onChange={(e) => update(block.id, { locationName: e.target.value })} placeholder="Location" disabled={readOnly} />
          <Input value={block.address ?? ""} onChange={(e) => update(block.id, { address: e.target.value })} placeholder="Address" disabled={readOnly} />
          <Textarea value={block.notes ?? ""} onChange={(e) => update(block.id, { notes: e.target.value })} placeholder="Notes" rows={2} disabled={readOnly} />
        </div>
      ))}
      {sorted.length === 0 && <p className="text-sm text-slate-500">No schedule blocks yet.</p>}
    </section>
  );
}
