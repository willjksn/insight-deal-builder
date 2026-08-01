import { NextRequest, NextResponse } from "next/server";
import {
  generateDailyBrief,
  getDailyBriefForDate,
  listDailyBriefs,
  todayBriefDateUtc,
} from "@/lib/revenueOpportunities/server/dailyBriefs";
import {
  requireRevenueManager,
  requireRevenueViewer,
  revenueApiError,
} from "@/lib/revenueOpportunities/server/routeHelpers";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { appUser } = await requireRevenueViewer(request);
    const url = new URL(request.url);
    const date = url.searchParams.get("date")?.trim();
    if (date) {
      const brief = await getDailyBriefForDate(appUser, date);
      return NextResponse.json({ brief });
    }
    const today = url.searchParams.get("today") === "1";
    if (today) {
      let brief = await getDailyBriefForDate(appUser, todayBriefDateUtc());
      if (!brief) {
        brief = await generateDailyBrief(appUser);
      }
      return NextResponse.json({ brief });
    }
    const briefs = await listDailyBriefs(appUser);
    return NextResponse.json({ briefs });
  } catch (err) {
    return revenueApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { appUser } = await requireRevenueManager(request);
    const body = (await request.json().catch(() => ({}))) as { briefDate?: string };
    const brief = await generateDailyBrief(appUser, {
      briefDate: typeof body.briefDate === "string" ? body.briefDate : undefined,
      source: "generated",
    });
    return NextResponse.json({ brief }, { status: 201 });
  } catch (err) {
    return revenueApiError(err);
  }
}
