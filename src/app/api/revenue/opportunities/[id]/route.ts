import { NextRequest, NextResponse } from "next/server";
import {
  deleteOpportunity,
  getOpportunity,
  updateOpportunity,
} from "@/lib/revenueOpportunities/server/opportunities";
import { requireRevenueManager, requireRevenueViewer, revenueApiError } from "@/lib/revenueOpportunities/server/routeHelpers";
import type { RevenueOpportunityUpdateInput } from "@/lib/revenueOpportunities/types/opportunity";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { appUser } = await requireRevenueViewer(request);
    const { id } = await context.params;
    const opportunity = await getOpportunity(appUser, id);
    return NextResponse.json({ opportunity });
  } catch (err) {
    return revenueApiError(err);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { appUser } = await requireRevenueManager(request);
    const { id } = await context.params;
    const body = (await request.json()) as RevenueOpportunityUpdateInput;
    const opportunity = await updateOpportunity(appUser, id, body);
    return NextResponse.json({ opportunity });
  } catch (err) {
    return revenueApiError(err);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { appUser } = await requireRevenueManager(request);
    const { id } = await context.params;
    await deleteOpportunity(appUser, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return revenueApiError(err);
  }
}
