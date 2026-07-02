"use client";

import Link from "next/link";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import {
  CALENDAR_KIND_COLORS,
  CALENDAR_KIND_LABELS,
  CalendarEvent,
  CalendarFilter,
} from "@/lib/calendar/types";
import { filterCalendarEvents } from "@/lib/calendar/buildEvents";

const FILTERS: { id: CalendarFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "shoot", label: "Shoots" },
  { id: "delivery", label: "Deliveries" },
  { id: "payment", label: "Payments" },
];

export function CalendarMonthView({
  month,
  events,
  filter,
  onMonthChange,
  onFilterChange,
  loading,
}: {
  month: Date;
  events: CalendarEvent[];
  filter: CalendarFilter;
  onMonthChange: (next: Date) => void;
  onFilterChange: (filter: CalendarFilter) => void;
  loading?: boolean;
}) {
  const filtered = filterCalendarEvents(events, filter);
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const eventsByDate = new Map<string, CalendarEvent[]>();
  for (const event of filtered) {
    const list = eventsByDate.get(event.date) ?? [];
    list.push(event);
    eventsByDate.set(event.date, list);
  }

  const today = new Date();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onMonthChange(subMonths(month, 1))}
            className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="min-w-[10rem] text-center text-lg font-semibold text-slate-900">
            {format(month, "MMMM yyyy")}
          </h2>
          <button
            type="button"
            onClick={() => onMonthChange(addMonths(month, 1))}
            className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
            aria-label="Next month"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => onMonthChange(new Date())}
            className="ml-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Today
          </button>
        </div>

        <div className="flex flex-wrap gap-1">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onFilterChange(item.id)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                filter === item.id
                  ? "bg-sky-600 text-white shadow-sm"
                  : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label) => (
            <div key={label} className="px-2 py-3">
              {label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const dayEvents = eventsByDate.get(key) ?? [];
            const inMonth = isSameMonth(day, month);
            const isToday = isSameDay(day, today);

            return (
              <div
                key={key}
                className={cn(
                  "min-h-[7.5rem] border-b border-r border-slate-100 p-2 align-top last:border-r-0",
                  !inMonth && "bg-slate-50/70"
                )}
              >
                <div
                  className={cn(
                    "mb-1 inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium",
                    isToday ? "bg-sky-600 text-white" : inMonth ? "text-slate-800" : "text-slate-400"
                  )}
                >
                  {format(day, "d")}
                </div>
                <ul className="space-y-1">
                  {dayEvents.slice(0, 3).map((event) => (
                    <li key={event.id}>
                      <Link
                        href={event.href}
                        className="group block rounded-md px-1.5 py-1 hover:bg-slate-50"
                        title={event.subtitle ?? event.title}
                      >
                        <span className="flex items-center gap-1.5">
                          <span
                            className={cn("h-2 w-2 shrink-0 rounded-full", CALENDAR_KIND_COLORS[event.kind])}
                            aria-hidden
                          />
                          <span className="truncate text-xs font-medium text-slate-800 group-hover:text-sky-700">
                            {event.title}
                          </span>
                        </span>
                        {event.subtitle ? (
                          <span className="mt-0.5 block truncate pl-3.5 text-[10px] text-slate-500">
                            {event.subtitle}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  ))}
                  {dayEvents.length > 3 ? (
                    <li className="pl-1.5 text-[10px] font-medium text-slate-500">
                      +{dayEvents.length - 3} more
                    </li>
                  ) : null}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-slate-600">
        {(Object.keys(CALENDAR_KIND_LABELS) as Array<keyof typeof CALENDAR_KIND_LABELS>).map(
          (kind) => (
            <span key={kind} className="inline-flex items-center gap-1.5">
              <span className={cn("h-2 w-2 rounded-full", CALENDAR_KIND_COLORS[kind])} />
              {CALENDAR_KIND_LABELS[kind]}
            </span>
          )
        )}
        {loading ? <span className="text-slate-400">Refreshing…</span> : null}
      </div>
    </div>
  );
}

export function CalendarAgendaList({
  month,
  events,
  filter,
}: {
  month: Date;
  events: CalendarEvent[];
  filter: CalendarFilter;
}) {
  const filtered = filterCalendarEvents(events, filter).filter((event) => {
    const d = parseISO(event.date);
    return isSameMonth(d, month);
  });

  if (filtered.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
        No events this month for this filter. Dates appear when projects, production days, or
        agreements have shoot, delivery, or payment info.
      </p>
    );
  }

  return (
    <div className="space-y-2 lg:hidden">
      {filtered.map((event) => (
        <Link
          key={event.id}
          href={event.href}
          className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
        >
          <span className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", CALENDAR_KIND_COLORS[event.kind])} />
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {format(parseISO(event.date), "EEE, MMM d")} · {CALENDAR_KIND_LABELS[event.kind]}
            </p>
            <p className="font-medium text-slate-900">{event.title}</p>
            {event.subtitle ? <p className="text-sm text-slate-500">{event.subtitle}</p> : null}
          </div>
        </Link>
      ))}
    </div>
  );
}
