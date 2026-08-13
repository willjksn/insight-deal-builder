import { NextRequest, NextResponse } from "next/server";
import {
  listDiscoveryRuns,
  startDiscoveryRun,
} from "@/lib/liveProduction/server/discoveryRuns";
import {
  liveProductionApiError,
  requireLiveManager,
  requireLiveViewer,
} from "@/lib/liveProduction/server/routeHelpers";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET(request: NextRequest) {
  try {
    const { appUser } = await requireLiveViewer(request);
    const runs = await listDiscoveryRuns(appUser, 12);
    return NextResponse.json({ runs });
  } catch (err) {
    return liveProductionApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { appUser } = await requireLiveManager(request);
    const run = await startDiscoveryRun(appUser);
    return NextResponse.json({ run });
  } catch (err) {
    return liveProductionApiError(err);
  }
}
