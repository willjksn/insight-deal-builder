import { NextRequest, NextResponse } from "next/server";
import { getFeedbackSummary } from "@/lib/revenueOpportunities/server/feedback";
import { requireRevenueViewer, revenueApiError } from "@/lib/revenueOpportunities/server/routeHelpers";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { appUser } = await requireRevenueViewer(request);
    const summary = await getFeedbackSummary(appUser);
    return NextResponse.json({ summary });
  } catch (err) {
    return revenueApiError(err);
  }
}
