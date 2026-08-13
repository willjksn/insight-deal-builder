import { NextRequest, NextResponse } from "next/server";
import { getDiscoveryRun } from "@/lib/liveProduction/server/discoveryRuns";
import {
  liveProductionApiError,
  requireLiveViewer,
} from "@/lib/liveProduction/server/routeHelpers";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, ctx: Ctx) {
  try {
    const { appUser } = await requireLiveViewer(request);
    const { id } = await ctx.params;
    const run = await getDiscoveryRun(appUser, id);
    if (!run) {
      return NextResponse.json({ error: "Discovery run not found" }, { status: 404 });
    }
    return NextResponse.json({ run });
  } catch (err) {
    return liveProductionApiError(err);
  }
}
