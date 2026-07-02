"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { endOfMonth, format, startOfMonth } from "date-fns";
import { CalendarDays } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAuth } from "@/contexts/AuthContext";
import {
  CalendarAgendaList,
  CalendarMonthView,
} from "@/components/calendar/CalendarMonthView";
import { CalendarEvent, CalendarFilter } from "@/lib/calendar/types";
import { eventsInRange } from "@/lib/calendar/buildEvents";

export default function CalendarPage() {
  const { user } = useAuth();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [filter, setFilter] = useState<CalendarFilter>("all");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const range = useMemo(() => {
    const start = format(startOfMonth(month), "yyyy-MM-dd");
    const end = format(endOfMonth(month), "yyyy-MM-dd");
    return { start, end };
  }, [month]);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch(
        `/api/calendar/events?start=${range.start}&end=${range.end}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load calendar");
      setEvents(data.events as CalendarEvent[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load calendar");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [user, range.start, range.end]);

  useEffect(() => {
    void load();
  }, [load]);

  const monthEvents = useMemo(
    () => eventsInRange(events, range.start, range.end),
    [events, range.start, range.end]
  );

  if (!user) {
    return <LoadingSpinner className="py-20" />;
  }

  return (
    <div>
      <PageHeader
        title="Calendar"
        subtitle="Shoot days, deliveries, and payments pulled from your projects and agreements — no extra scheduling required."
      />

      {error ? (
        <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {loading && events.length === 0 ? (
        <LoadingSpinner className="py-16" />
      ) : (
        <>
          <div className="hidden lg:block">
            <CalendarMonthView
              month={month}
              events={monthEvents}
              filter={filter}
              onMonthChange={setMonth}
              onFilterChange={setFilter}
              loading={loading}
            />
          </div>

          <div className="lg:hidden space-y-4">
            <CalendarMonthView
              month={month}
              events={monthEvents}
              filter={filter}
              onMonthChange={setMonth}
              onFilterChange={setFilter}
              loading={loading}
            />
            <div>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
                <CalendarDays className="h-4 w-4" />
                This month
              </h3>
              <CalendarAgendaList month={month} events={monthEvents} filter={filter} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
