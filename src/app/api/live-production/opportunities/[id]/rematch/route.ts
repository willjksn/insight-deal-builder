import { NextRequest, NextResponse } from "next/server";
import { updateLiveOpportunity } from "@/lib/liveProduction/server/opportunities";
import {
  liveProductionApiError,
  requireLiveManager,
} from "@/lib/liveProduction/server/routeHelpers";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, ctx: Ctx) {
  try {
    const { appUser } = await requireLiveManager(request);
    const { id } = await ctx.params;
    const opportunity = await updateLiveOpportunity(appUser, id, {}, true);
    return NextResponse.json({ opportunity });
  } catch (err) {
    return liveProductionApiError(err);
  }
}
