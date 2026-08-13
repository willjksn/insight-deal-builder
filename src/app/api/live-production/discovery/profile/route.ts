import { NextRequest, NextResponse } from "next/server";
import {
  getDiscoveryProfile,
  saveDiscoveryProfile,
} from "@/lib/liveProduction/server/discoveryProfile";
import {
  liveProductionApiError,
  requireLiveManager,
  requireLiveViewer,
} from "@/lib/liveProduction/server/routeHelpers";
import type { LiveProductionTargetProfile } from "@/lib/liveProduction/defaultsKeywords";
import { tavilyAvailable } from "@/lib/search/tavilyClient";
import { aiUsesMock } from "@/lib/ai/mockAi";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { appUser } = await requireLiveViewer(request);
    const profile = await getDiscoveryProfile(appUser);
    return NextResponse.json({
      profile,
      discoveryMode:
        !aiUsesMock() && tavilyAvailable() ? "live" : ("demo" as const),
    });
  } catch (err) {
    return liveProductionApiError(err);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { appUser } = await requireLiveManager(request);
    const body = (await request.json()) as Partial<LiveProductionTargetProfile>;
    const profile = await saveDiscoveryProfile(appUser, body);
    return NextResponse.json({ profile });
  } catch (err) {
    return liveProductionApiError(err);
  }
}
