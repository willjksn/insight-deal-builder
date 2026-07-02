import { NextRequest, NextResponse } from "next/server";
import { apiErrorStatus, requireApprovedAuthUser } from "@/lib/api/routeAuth";
import { eventsInRange } from "@/lib/calendar/buildEvents";
import { loadCalendarEventsForUser } from "@/lib/calendar/server";

export const runtime = "nodejs";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: NextRequest) {
  try {
    const { uid, appUser } = await requireApprovedAuthUser(request);
    const start = request.nextUrl.searchParams.get("start")?.trim();
    const end = request.nextUrl.searchParams.get("end")?.trim();

    const events = await loadCalendarEventsForUser({ uid, appUser, email: appUser.email });

    if (start && end && ISO_DATE.test(start) && ISO_DATE.test(end)) {
      return NextResponse.json({ events: eventsInRange(events, start, end) });
    }

    return NextResponse.json({ events });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load calendar";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}
