import { NextRequest, NextResponse } from "next/server";
import {
  deleteCampaign,
  getCampaign,
  updateCampaign,
} from "@/lib/revenueOpportunities/server/campaigns";
import { requireRevenueManager, requireRevenueViewer, revenueApiError } from "@/lib/revenueOpportunities/server/routeHelpers";
import type { RevenueCampaignUpdateInput } from "@/lib/revenueOpportunities/types/campaign";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { appUser } = await requireRevenueViewer(request);
    const { id } = await context.params;
    const campaign = await getCampaign(appUser, id);
    return NextResponse.json({ campaign });
  } catch (err) {
    return revenueApiError(err);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { appUser } = await requireRevenueManager(request);
    const { id } = await context.params;
    const body = (await request.json()) as RevenueCampaignUpdateInput;
    const campaign = await updateCampaign(appUser, id, body);
    return NextResponse.json({ campaign });
  } catch (err) {
    return revenueApiError(err);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { appUser } = await requireRevenueManager(request);
    const { id } = await context.params;
    const result = await deleteCampaign(appUser, id);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return revenueApiError(err);
  }
}
