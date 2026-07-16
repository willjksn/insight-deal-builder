import { NextRequest, NextResponse } from "next/server";
import { buildDashboardSummary } from "@/lib/revenueOpportunities/server/dashboard";
import { requireRevenueViewer, revenueApiError } from "@/lib/revenueOpportunities/server/routeHelpers";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { appUser } = await requireRevenueViewer(request);
    const summary = await buildDashboardSummary(appUser);
    return NextResponse.json({ summary });
  } catch (err) {
    return revenueApiError(err);
  }
}
