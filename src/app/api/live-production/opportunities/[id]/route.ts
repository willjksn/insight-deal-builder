import { NextRequest, NextResponse } from "next/server";
import {
  deleteLiveOpportunity,
  getLiveOpportunity,
  updateLiveOpportunity,
} from "@/lib/liveProduction/server/opportunities";
import {
  liveProductionApiError,
  requireLiveManager,
  requireLiveViewer,
} from "@/lib/liveProduction/server/routeHelpers";
import type { LiveOpportunity } from "@/lib/liveProduction/types";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, ctx: Ctx) {
  try {
    const { appUser } = await requireLiveViewer(request);
    const { id } = await ctx.params;
    const opportunity = await getLiveOpportunity(appUser, id);
    if (!opportunity) {
      return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
    }
    return NextResponse.json({ opportunity });
  } catch (err) {
    return liveProductionApiError(err);
  }
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  try {
    const { appUser } = await requireLiveManager(request);
    const { id } = await ctx.params;
    const body = (await request.json()) as Partial<LiveOpportunity> & { rematch?: boolean };
    const { rematch, ...patch } = body;
    const opportunity = await updateLiveOpportunity(appUser, id, patch, Boolean(rematch));
    return NextResponse.json({ opportunity });
  } catch (err) {
    return liveProductionApiError(err);
  }
}

export async function DELETE(request: NextRequest, ctx: Ctx) {
  try {
    const { appUser } = await requireLiveManager(request);
    const { id } = await ctx.params;
    await deleteLiveOpportunity(appUser, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return liveProductionApiError(err);
  }
}
