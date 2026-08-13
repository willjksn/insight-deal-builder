import { NextRequest, NextResponse } from "next/server";
import {
  dashboardStats,
  ensureCharlotteSeed,
} from "@/lib/liveProduction/server/opportunities";
import {
  liveProductionApiError,
  requireLiveViewer,
} from "@/lib/liveProduction/server/routeHelpers";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { appUser } = await requireLiveViewer(request);
    await ensureCharlotteSeed(appUser);
    const stats = await dashboardStats(appUser);
    return NextResponse.json({ stats });
  } catch (err) {
    return liveProductionApiError(err);
  }
}
