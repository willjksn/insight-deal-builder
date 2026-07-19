"use client";

import {
  ProductionBoard,
  ProductionDay,
  ProductionDayShot,
  ProductionPerson,
} from "@/lib/production/types";
import { formatShotTypeLabel } from "@/lib/production/shotLabels";
import { cn } from "@/lib/utils/cn";

function peopleForDay(board: ProductionBoard, groups: ProductionPerson["group"][]) {
  return board.people
    .filter((p) => groups.includes(p.group))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

function formatDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso + "T12:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface CallSheetViewProps {
  board: ProductionBoard;
  day: ProductionDay;
  className?: string;
  printMode?: boolean;
}

/** Printable / preview call sheet — denser when printMode (on-set one-pager). */
export function CallSheetView({ board, day, className, printMode }: CallSheetViewProps) {
  const cast = peopleForDay(board, ["cast"]);
  const crew = peopleForDay(board, ["production_team", "camera_department"]);
  const title = board.filmTitle || "Untitled production";
  const coverageCount = day.shots?.length ?? 0;
  const coverageDone = day.shots?.filter((s) => s.done).length ?? 0;

  return (
    <div
      className={cn(
        "call-sheet-doc bg-white text-slate-900",
        printMode
          ? "call-sheet-print p-5 text-[10px] leading-snug md:p-6"
          : "rounded-2xl border border-slate-200 p-6 text-sm md:p-8",
        className
      )}
    >
      <style>{`
        @media print {
          @page {
            size: letter;
            margin: 0.4in;
          }
          .call-sheet-doc.call-sheet-print {
            padding: 0 !important;
            font-size: 9.5pt !important;
            line-height: 1.25 !important;
            color: #0f172a !important;
          }
          .call-sheet-section {
            break-inside: avoid-page;
            page-break-inside: avoid;
            margin-bottom: 0.45rem !important;
          }
          .call-sheet-header {
            margin-bottom: 0.4rem !important;
            padding-bottom: 0.35rem !important;
          }
          .call-sheet-header h1 {
            font-size: 16pt !important;
          }
          .call-sheet-times {
            gap: 0.25rem !important;
            margin-bottom: 0.4rem !important;
          }
          .call-sheet-times > div {
            border: 1px solid #cbd5e1 !important;
            border-radius: 2px !important;
            padding: 0.2rem 0.35rem !important;
          }
          .call-sheet-table th,
          .call-sheet-table td {
            padding-top: 0.15rem !important;
            padding-bottom: 0.15rem !important;
          }
          .call-sheet-thumb {
            height: 1.35rem !important;
            width: 2.1rem !important;
            border-radius: 1px !important;
          }
          .call-sheet-desc {
            display: none !important;
          }
        }
      `}</style>

      <header className="call-sheet-header call-sheet-section mb-5 border-b-2 border-slate-900 pb-3">
        <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-600">
          Production call sheet
        </p>
        <h1 className="mt-0.5 text-xl font-bold tracking-tight md:text-2xl">{title}</h1>
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-0.5 text-[11px] md:text-sm">
          <span>
            <strong>Day {day.dayNumber}</strong>
            {day.title ? ` — ${day.title}` : ""}
          </span>
          <span>
            <strong>Date:</strong> {formatDate(day.shootDate)}
          </span>
          {day.scenes.length > 0 && (
            <span>
              <strong>Scenes:</strong> {day.scenes.join(", ")}
            </span>
          )}
          {coverageCount > 0 && (
            <span>
              <strong>Coverage:</strong> {coverageDone}/{coverageCount}
            </span>
          )}
        </div>
      </header>

      <div className="call-sheet-times call-sheet-section mb-4 grid grid-cols-3 gap-2 md:grid-cols-6">
        <InfoCell label="Crew call" value={day.crewCall} dense={printMode} />
        <InfoCell label="Breakfast" value={day.breakfast} dense={printMode} />
        <InfoCell label="Lunch" value={day.lunch} dense={printMode} />
        <InfoCell label="Est. wrap" value={day.wrapTime} dense={printMode} />
        <InfoCell label="Sunrise" value={day.sunrise} dense={printMode} />
        <InfoCell label="Sunset" value={day.sunset} dense={printMode} />
      </div>

      <div className="call-sheet-section mb-4 grid gap-3 md:grid-cols-2">
        {(day.primaryLocation || day.primaryAddress) && (
          <section>
            <h2 className="mb-1 text-[9px] font-bold uppercase tracking-wider text-slate-600">
              Primary location
            </h2>
            <p className="font-medium">{day.primaryLocation || "—"}</p>
            {day.primaryAddress ? (
              <p className="text-slate-600">{day.primaryAddress}</p>
            ) : null}
          </section>
        )}
        <section>
          <h2 className="mb-1 text-[9px] font-bold uppercase tracking-wider text-slate-600">
            Key contacts
          </h2>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            <InfoCell label="Producer" value={day.producerName} compact />
            <InfoCell label="AD" value={day.adName} compact />
            <InfoCell label="Director" value={day.directorName} compact />
            <InfoCell label="DP" value={day.dpName} compact />
          </div>
        </section>
      </div>

      {day.weatherNotes ? (
        <section className="call-sheet-section mb-4 rounded-md bg-slate-50 px-3 py-2">
          <strong className="text-[9px] uppercase tracking-wider">Weather / notes</strong>
          <p className="mt-0.5 whitespace-pre-wrap">{day.weatherNotes}</p>
        </section>
      ) : null}

      {day.schedule.length > 0 && (
        <section className="call-sheet-section mb-4 overflow-x-auto">
          <h2 className="mb-1 text-[9px] font-bold uppercase tracking-wider text-slate-600">
            Schedule
          </h2>
          <table className="call-sheet-table w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-300 text-[9px] uppercase text-slate-500">
                <th className="py-1.5 pr-2">Time</th>
                <th className="py-1.5 pr-2">Block</th>
                <th className="py-1.5 pr-2">Location</th>
                <th className="py-1.5">Notes</th>
              </tr>
            </thead>
            <tbody>
              {[...day.schedule]
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((block) => (
                  <tr key={block.id} className="border-b border-slate-100 align-top">
                    <td className="py-1 pr-2 whitespace-nowrap">
                      {[block.startTime, block.endTime].filter(Boolean).join(" – ") || "—"}
                    </td>
                    <td className="py-1 pr-2 font-medium">{block.label}</td>
                    <td className="py-1 pr-2">
                      <div>{block.locationName}</div>
                      {block.address ? (
                        <div className="text-[9px] text-slate-500">{block.address}</div>
                      ) : null}
                    </td>
                    <td className="py-1 whitespace-pre-wrap text-slate-600">{block.notes}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </section>
      )}

      {coverageCount > 0 && <CoverageTable shots={day.shots!} compact={printMode} />}

      {cast.length > 0 && <PeopleTable title="Cast" people={cast} compact={printMode} />}
      {crew.length > 0 && <PeopleTable title="Crew" people={crew} compact={printMode} />}
    </div>
  );
}

function InfoCell({
  label,
  value,
  compact,
  dense,
}: {
  label: string;
  value?: string;
  compact?: boolean;
  dense?: boolean;
}) {
  return (
    <div
      className={cn(
        compact ? "" : dense ? "rounded border border-slate-200 px-2 py-1" : "rounded-lg border border-slate-200 px-3 py-2"
      )}
    >
      <div className="text-[8px] font-semibold uppercase tracking-wider text-slate-500">{label}</div>
      <div className={cn("font-medium", dense && "text-[11px]")}>{value || "—"}</div>
    </div>
  );
}

function coverageShotLabel(shot: ProductionDayShot): string {
  const num = shot.scoutShotNumber ?? shot.sortOrder + 1;
  if (shot.shotName?.trim()) return `${num}. ${shot.shotName.trim()}`;
  if (shot.shotType) return `${num}. ${formatShotTypeLabel(shot.shotType)}`;
  return `${num}. Shot`;
}

function CoverageTable({
  shots,
  compact,
}: {
  shots: ProductionDayShot[];
  compact?: boolean;
}) {
  const sorted = [...shots].sort((a, b) => a.sortOrder - b.sortOrder);
  return (
    <section className="call-sheet-section mb-4 overflow-x-auto">
      <h2 className="mb-1 text-[9px] font-bold uppercase tracking-wider text-slate-600">
        Coverage ({sorted.filter((s) => s.done).length}/{sorted.length})
      </h2>
      <table className="call-sheet-table w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-slate-300 text-[9px] uppercase text-slate-500">
            <th className="w-12 py-1.5 pr-1.5">Frame</th>
            <th className="py-1.5 pr-2">Shot</th>
            <th className="py-1.5 pr-2">Sc</th>
            <th className="py-1.5 pr-2">Lens</th>
            <th className="py-1.5 pr-2">Framing</th>
            <th className="py-1.5">✓</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((shot) => (
            <tr key={shot.id} className="border-b border-slate-100 align-middle">
              <td className="py-1 pr-1.5">
                <div className="call-sheet-thumb h-8 w-12 overflow-hidden rounded border border-slate-200 bg-slate-50">
                  {shot.referenceImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={shot.referenceImageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
              </td>
              <td className="py-1 pr-2">
                <div className="font-medium">{coverageShotLabel(shot)}</div>
                {!compact && (shot.description || shot.subjectAction) ? (
                  <div className="call-sheet-desc line-clamp-1 text-[9px] text-slate-500">
                    {shot.description?.trim() || shot.subjectAction}
                  </div>
                ) : null}
              </td>
              <td className="py-1 pr-2 whitespace-nowrap">{shot.sceneRef || "—"}</td>
              <td className="py-1 pr-2 whitespace-nowrap">{shot.lens || "—"}</td>
              <td className="max-w-[8rem] truncate py-1 pr-2">{shot.framing || "—"}</td>
              <td className="py-1">{shot.done ? "✓" : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function PeopleTable({
  title,
  people,
  compact,
}: {
  title: string;
  people: ProductionPerson[];
  compact?: boolean;
}) {
  return (
    <section className="call-sheet-section mb-4 overflow-x-auto">
      <h2 className="mb-1 text-[9px] font-bold uppercase tracking-wider text-slate-600">{title}</h2>
      <table className="call-sheet-table w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-slate-300 text-[9px] uppercase text-slate-500">
            <th className="py-1.5 pr-2">Name</th>
            <th className="py-1.5 pr-2">Role</th>
            <th className="py-1.5 pr-2">Call</th>
            <th className="py-1.5 pr-2">Phone</th>
            {!compact ? <th className="py-1.5">Email</th> : null}
          </tr>
        </thead>
        <tbody>
          {people.map((p) => (
            <tr key={p.id} className="border-b border-slate-100">
              <td className="py-1 pr-2 font-medium">{p.name || "—"}</td>
              <td className="py-1 pr-2">{p.role || "—"}</td>
              <td className="py-1 pr-2 whitespace-nowrap">{p.callTime || "—"}</td>
              <td className="py-1 pr-2">{p.phone || "—"}</td>
              {!compact ? <td className="py-1">{p.email || "—"}</td> : null}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
