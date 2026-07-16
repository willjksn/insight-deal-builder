import { NextRequest, NextResponse } from "next/server";
import { syncInboxThreads } from "@/lib/revenueOpportunities/server/inboxSync";
import { requireRevenueManager, revenueApiError } from "@/lib/revenueOpportunities/server/routeHelpers";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { appUser } = await requireRevenueManager(request);
    const body = (await request.json().catch(() => ({}))) as { query?: string };
    const threads = await syncInboxThreads(appUser, body.query);
    return NextResponse.json({ threads });
  } catch (err) {
    return revenueApiError(err);
  }
}
