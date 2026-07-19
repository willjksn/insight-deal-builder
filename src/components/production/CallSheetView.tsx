"use client";

import { ProductionBoard, ProductionDay, ProductionPerson } from "@/lib/production/types";
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
  return d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

interface CallSheetViewProps {
  board: ProductionBoard;
  day: ProductionDay;
  className?: string;
  printMode?: boolean;
}

export function CallSheetView({ board, day, className, printMode }: CallSheetViewProps) {
  const cast = peopleForDay(board, ["cast"]);
  const crew = peopleForDay(board, ["production_team", "camera_department"]);
  const title = board.filmTitle || "Untitled production";

  return (
    <div
      className={cn(
        "bg-white text-slate-900",
        printMode ? "p-8 text-[11px] leading-snug" : "rounded-2xl border border-slate-200 p-6 md:p-8 text-sm",
        className
      )}
    >
      <header className="border-b-2 border-slate-900 pb-4 mb-6">
        <p className="text-xs font-bold tracking-[0.2em] text-slate-600 uppercase">Production call sheet</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">{title}</h1>
        <div className="mt-3 flex flex-wrap gap-x-8 gap-y-1 text-sm">
          <span><strong>Day {day.dayNumber}</strong>{day.title ? ` — ${day.title}` : ""}</span>
          <span><strong>Date:</strong> {formatDate(day.shootDate)}</span>
          {day.scenes.length > 0 && (
            <span><strong>Scenes:</strong> {day.scenes.join(", ")}</span>
          )}
          {(day.shots?.length ?? 0) > 0 && (
            <span>
              <strong>Coverage:</strong> {day.shots!.filter((s) => s.done).length}/{day.shots!.length}{" "}
              shots
            </span>
          )}
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <InfoCell label="Crew call" value={day.crewCall} />
        <InfoCell label="Breakfast" value={day.breakfast} />
        <InfoCell label="Lunch" value={day.lunch} />
        <InfoCell label="Est. wrap" value={day.wrapTime} />
        <InfoCell label="Sunrise" value={day.sunrise} />
        <InfoCell label="Sunset" value={day.sunset} />
      </div>

      {(day.primaryLocation || day.primaryAddress) && (
        <section className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">Primary location</h2>
          <p className="font-medium">{day.primaryLocation}</p>
          {day.primaryAddress && <p className="text-slate-600">{day.primaryAddress}</p>}
        </section>
      )}

      {day.weatherNotes && (
        <section className="mb-6 rounded-lg bg-slate-50 px-4 py-3">
          <strong className="text-xs uppercase tracking-wider">Weather / notes</strong>
          <p className="mt-1 whitespace-pre-wrap">{day.weatherNotes}</p>
        </section>
      )}

      <section className="mb-6">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">Key contacts</h2>
        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4 text-sm">
          <InfoCell label="Producer" value={day.producerName} compact />
          <InfoCell label="AD" value={day.adName} compact />
          <InfoCell label="Director" value={day.directorName} compact />
          <InfoCell label="DP" value={day.dpName} compact />
        </div>
      </section>

      {day.schedule.length > 0 && (
        <section className="mb-6 overflow-x-auto">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">Schedule</h2>
          <table className="w-full min-w-[520px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-300 text-xs uppercase text-slate-500">
                <th className="py-2 pr-3">Time</th>
                <th className="py-2 pr-3">Block</th>
                <th className="py-2 pr-3">Location</th>
                <th className="py-2">Notes</th>
              </tr>
            </thead>
            <tbody>
              {[...day.schedule].sort((a, b) => a.sortOrder - b.sortOrder).map((block) => (
                <tr key={block.id} className="border-b border-slate-100 align-top">
                  <td className="py-2 pr-3 whitespace-nowrap">
                    {[block.startTime, block.endTime].filter(Boolean).join(" – ") || "—"}
                  </td>
                  <td className="py-2 pr-3 font-medium">{block.label}</td>
                  <td className="py-2 pr-3">
                    <div>{block.locationName}</div>
                    {block.address && <div className="text-slate-500 text-xs">{block.address}</div>}
                  </td>
                  <td className="py-2 text-slate-600 whitespace-pre-wrap">{block.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {cast.length > 0 && (
        <PeopleTable title="Cast" people={cast} />
      )}

      {crew.length > 0 && (
        <PeopleTable title="Crew" people={crew} />
      )}
    </div>
  );
}

function InfoCell({
  label,
  value,
  compact,
}: {
  label: string;
  value?: string;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "" : "rounded-lg border border-slate-200 px-3 py-2"}>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</div>
      <div className="font-medium">{value || "—"}</div>
    </div>
  );
}

function PeopleTable({ title, people }: { title: string; people: ProductionPerson[] }) {
  return (
    <section className="mb-6 overflow-x-auto">
      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">{title}</h2>
      <table className="w-full min-w-[480px] border-collapse text-left">
        <thead>
          <tr className="border-b border-slate-300 text-xs uppercase text-slate-500">
            <th className="py-2 pr-3">Name</th>
            <th className="py-2 pr-3">Role</th>
            <th className="py-2 pr-3">Call</th>
            <th className="py-2 pr-3">Phone</th>
            <th className="py-2">Email</th>
          </tr>
        </thead>
        <tbody>
          {people.map((p) => (
            <tr key={p.id} className="border-b border-slate-100">
              <td className="py-2 pr-3 font-medium">{p.name || "—"}</td>
              <td className="py-2 pr-3">{p.role || "—"}</td>
              <td className="py-2 pr-3 whitespace-nowrap">{p.callTime || "—"}</td>
              <td className="py-2 pr-3">{p.phone || "—"}</td>
              <td className="py-2">{p.email || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
