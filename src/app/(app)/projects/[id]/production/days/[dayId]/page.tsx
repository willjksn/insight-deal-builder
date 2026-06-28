"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Plus, Printer, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { CallSheetView } from "@/components/production/CallSheetView";
import { useAuth } from "@/contexts/AuthContext";
import { useDocument } from "@/hooks/useDocument";
import { Project } from "@/lib/types";
import {
  getProductionBoardByProject,
  saveProductionBoard,
  subscribeProductionBoardByProject,
} from "@/lib/firebase/productionFirestore";
import { createEmptyProductionDay } from "@/lib/production/defaults";
import {
  applyKeyContactsFromBoard,
  deriveKeyContactsFromBoard,
  keyContactsEmpty,
  mergeKeyContacts,
} from "@/lib/production/callSheetContacts";
import {
  appendLocationsToSchedule,
  applyFirstBookedLocation,
  applyPrimaryLocationFromBoard,
  bookedLocations,
} from "@/lib/production/locationSync";
import {
  ProductionBoard,
  ProductionDay,
  ProductionDayScheduleBlock,
  ProductionDayShot,
  ProductionLocationEntry,
} from "@/lib/production/types";
import { canManageProjects, canUseShotScout } from "@/lib/utils/permissions";
import { cn } from "@/lib/utils/cn";

export default function CallSheetDayPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const dayId = params.dayId as string;
  const { appUser } = useAuth();
  const { data: project, loading: projectLoading } = useDocument<Project>("projects", projectId);
  const [board, setBoard] = useState<ProductionBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const localEditRef = useRef(false);
  const savingRef = useRef(false);
  const contactsSyncedRef = useRef(false);

  const allowed = canUseShotScout(appUser) || canManageProjects(appUser);

  useEffect(() => {
    savingRef.current = saving;
  }, [saving]);

  useEffect(() => {
    if (!projectId || !allowed) return;
    let unsub: (() => void) | undefined;
    setLoading(true);
    getProductionBoardByProject(projectId)
      .then((loaded) => {
        if (loaded) setBoard(loaded);
        unsub = subscribeProductionBoardByProject(
          projectId,
          (remote) => {
            if (!remote || localEditRef.current || savingRef.current) return;
            setBoard(remote);
          },
          () => undefined
        );
      })
      .finally(() => setLoading(false));
    return () => unsub?.();
  }, [projectId, allowed]);

  const day = board?.productionDays.find((d) => d.id === dayId);
  const sortedDays = board
    ? [...board.productionDays].sort((a, b) => a.dayNumber - b.dayNumber)
    : [];
  const boardBookedLocations = board ? bookedLocations(board) : [];

  useEffect(() => {
    if (loading || !day) return;
    const hash = window.location.hash.replace("#", "");
    if (hash !== "shots" && hash !== "schedule") return;
    const el = document.getElementById(hash);
    if (el) {
      window.requestAnimationFrame(() => {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }, [loading, dayId, day]);

  const saveBoard = useCallback(async (nextBoard: ProductionBoard) => {
    setBoard(nextBoard);
    setSaving(true);
    try {
      const { id, createdAt, updatedAt: _updatedAt, ...rest } = nextBoard;
      await saveProductionBoard(id, rest);
    } finally {
      setSaving(false);
    }
  }, []);

  const persistDay = useCallback(
    (nextDay: ProductionDay) => {
      if (!board) return;
      localEditRef.current = true;
      const nextBoard = {
        ...board,
        productionDays: board.productionDays.map((d) =>
          d.id === nextDay.id ? nextDay : d
        ),
      };
      setBoard(nextBoard);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        setSaving(true);
        try {
          const { id, createdAt, updatedAt: _updatedAt, ...rest } = nextBoard;
          await saveProductionBoard(id, rest);
        } finally {
          setSaving(false);
          localEditRef.current = false;
        }
      }, 600);
    },
    [board]
  );

  useEffect(() => {
    contactsSyncedRef.current = false;
  }, [dayId]);

  useEffect(() => {
    if (!board || !day || contactsSyncedRef.current) return;
    if (!keyContactsEmpty(day)) return;
    const merged = mergeKeyContacts(day, deriveKeyContactsFromBoard(board));
    const changed =
      merged.producerName !== day.producerName ||
      merged.adName !== day.adName ||
      merged.directorName !== day.directorName ||
      merged.dpName !== day.dpName;
    if (!changed) return;
    contactsSyncedRef.current = true;
    persistDay(merged);
  }, [board, day, persistDay]);

  const addProductionDay = async () => {
    if (!board) return;
    const newDay = createEmptyProductionDay(board.productionDays.length + 1);
    const nextBoard = {
      ...board,
      productionDays: [...board.productionDays, newDay],
    };
    await saveBoard(nextBoard);
    router.push(`/projects/${projectId}/production/days/${newDay.id}`);
  };

  const removeProductionDay = async (id: string) => {
    if (!board || board.productionDays.length <= 1) return;
    if (!window.confirm("Remove this production day and its call sheet?")) return;

    const remaining = board.productionDays
      .filter((d) => d.id !== id)
      .sort((a, b) => a.dayNumber - b.dayNumber)
      .map((d, index) => ({ ...d, dayNumber: index + 1 }));

    const nextBoard = { ...board, productionDays: remaining };
    await saveBoard(nextBoard);

    if (id === dayId) {
      router.push(`/projects/${projectId}/production/days/${remaining[0].id}`);
    }
  };

  const patchDay = (patch: Partial<ProductionDay>) => {
    if (!day) return;
    persistDay({ ...day, ...patch });
  };

  if (projectLoading || loading) return <LoadingSpinner className="py-20" />;

  if (!allowed) {
    return (
      <div className="py-20 text-center text-slate-500">
        <p>Access denied.</p>
        <Link href={`/projects/${projectId}`}>
          <Button className="mt-4" variant="outline">Back</Button>
        </Link>
      </div>
    );
  }

  if (!project || !board || !day) {
    return (
      <div className="py-20 text-center text-slate-500">
        <p>Call sheet not found.</p>
        <Link href={`/projects/${projectId}/production`}>
          <Button className="mt-4" variant="outline">Pre-production board</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="pb-24">
      <PageHeader
        title={`Call sheet — Day ${day.dayNumber}`}
        subtitle={project.projectName}
        action={
          <div className="flex flex-wrap gap-2">
            {saving && <span className="text-sm text-slate-400">Saving…</span>}
            <Button size="touch" variant="outline" onClick={() => window.print()}>
              <Printer className="mr-2 h-5 w-5" />
              Print
            </Button>
            <Link href={`/projects/${projectId}/production`}>
              <Button size="touch" variant="outline">
                <ArrowLeft className="mr-2 h-5 w-5" />
                Board
              </Button>
            </Link>
          </div>
        }
      />

      <div className="mb-6 print:hidden">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Production days
          </span>
          {sortedDays.map((d) => (
            <Link
              key={d.id}
              href={`/projects/${projectId}/production/days/${d.id}`}
              className={cn(
                "inline-flex max-w-[220px] items-center rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                d.id === dayId
                  ? "bg-sky-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              )}
            >
              <span className="truncate">
                Day {d.dayNumber}
                {d.title && d.title !== `Day ${d.dayNumber}` ? `: ${d.title}` : ""}
              </span>
            </Link>
          ))}
          <Button type="button" size="sm" variant="outline" onClick={() => void addProductionDay()}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add day
          </Button>
        </div>
        {sortedDays.length > 1 && (
          <button
            type="button"
            onClick={() => void removeProductionDay(dayId)}
            className="mt-2 inline-flex items-center gap-1 text-xs text-red-600 hover:underline"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove this day
          </button>
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-2 print:block">
        <div className="space-y-4 print:hidden">
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
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => patchDay(applyFirstBookedLocation(day, board!))}
                >
                  Use first board location
                </Button>
                {boardBookedLocations.map((loc) => (
                  <Button
                    key={loc.id}
                    type="button"
                    size="sm"
                    variant="outline"
                    className="max-w-[200px] truncate"
                    onClick={() => patchDay(applyPrimaryLocationFromBoard(day, loc))}
                  >
                    {loc.name}
                  </Button>
                ))}
              </div>
            )}
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-0 flex-1">
                <p className="mb-1.5 block text-sm font-medium text-slate-700">Key contacts</p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => board && patchDay(applyKeyContactsFromBoard(day, board))}
              >
                Sync from board
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Producer" value={day.producerName ?? ""} onChange={(e) => patchDay({ producerName: e.target.value })} />
              <Input label="AD" value={day.adName ?? ""} onChange={(e) => patchDay({ adName: e.target.value })} />
              <Input label="Director" value={day.directorName ?? ""} onChange={(e) => patchDay({ directorName: e.target.value })} />
              <Input label="DP" value={day.dpName ?? ""} onChange={(e) => patchDay({ dpName: e.target.value })} />
            </div>
            <Textarea label="Weather / notes" value={day.weatherNotes ?? ""} onChange={(e) => patchDay({ weatherNotes: e.target.value })} rows={3} />
          </section>

          <ScheduleEditor
            blocks={day.schedule}
            boardLocations={boardBookedLocations}
            onChange={(schedule) => patchDay({ schedule })}
          />

          <ShotsEditor
            shots={day.shots}
            onChange={(shots) => patchDay({ shots })}
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
}: {
  blocks: ProductionDayScheduleBlock[];
  boardLocations: ProductionLocationEntry[];
  onChange: (blocks: ProductionDayScheduleBlock[]) => void;
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
          {boardLocations.length > 0 && (
            <Button type="button" size="sm" variant="outline" onClick={addFromBoard}>
              Add board locations
            </Button>
          )}
          <Button type="button" size="sm" variant="outline" onClick={add}>
            <Plus className="mr-1 h-4 w-4" />
            Add block
          </Button>
        </div>
      </div>
      {sorted.map((block) => (
        <div key={block.id} className="rounded-xl border border-slate-100 p-3 space-y-2">
          <div className="flex justify-between gap-2">
            <Input
              value={block.label}
              onChange={(e) => update(block.id, { label: e.target.value })}
              placeholder="Block label"
            />
            <button
              type="button"
              className="text-slate-400 hover:text-red-500"
              onClick={() => onChange(blocks.filter((b) => b.id !== block.id))}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input value={block.startTime ?? ""} onChange={(e) => update(block.id, { startTime: e.target.value })} placeholder="Start" />
            <Input value={block.endTime ?? ""} onChange={(e) => update(block.id, { endTime: e.target.value })} placeholder="End" />
          </div>
          <Input value={block.locationName ?? ""} onChange={(e) => update(block.id, { locationName: e.target.value })} placeholder="Location" />
          <Input value={block.address ?? ""} onChange={(e) => update(block.id, { address: e.target.value })} placeholder="Address" />
          <Textarea value={block.notes ?? ""} onChange={(e) => update(block.id, { notes: e.target.value })} placeholder="Notes" rows={2} />
        </div>
      ))}
      {sorted.length === 0 && <p className="text-sm text-slate-500">No schedule blocks yet.</p>}
    </section>
  );
}

function ShotsEditor({
  shots,
  onChange,
}: {
  shots: ProductionDayShot[];
  onChange: (shots: ProductionDayShot[]) => void;
}) {
  const sorted = [...shots].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <section id="shots" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Shot checklist</h2>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() =>
            onChange([
              ...shots,
              { id: crypto.randomUUID(), label: "New shot", done: false, sortOrder: shots.length },
            ])
          }
        >
          <Plus className="mr-1 h-4 w-4" />
          Add shot
        </Button>
      </div>
      {sorted.map((shot) => (
        <div key={shot.id} className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={shot.done}
            onChange={(e) =>
              onChange(
                shots.map((s) => (s.id === shot.id ? { ...s, done: e.target.checked } : s))
              )
            }
            className="h-4 w-4 rounded border-slate-300"
          />
          <Input
            value={shot.label}
            onChange={(e) =>
              onChange(
                shots.map((s) => (s.id === shot.id ? { ...s, label: e.target.value } : s))
              )
            }
            className="flex-1"
          />
          <button
            type="button"
            className="text-slate-400 hover:text-red-500"
            onClick={() => onChange(shots.filter((s) => s.id !== shot.id))}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
      {sorted.length === 0 && <p className="text-sm text-slate-500">Import shots from the board or Scout.</p>}
    </section>
  );
}
