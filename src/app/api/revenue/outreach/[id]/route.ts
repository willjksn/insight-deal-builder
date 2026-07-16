import { NextRequest, NextResponse } from "next/server";
import { getOutreachActivity, updateOutreachActivity } from "@/lib/revenueOpportunities/server/outreach";
import { requireRevenueManager, requireRevenueViewer, revenueApiError } from "@/lib/revenueOpportunities/server/routeHelpers";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { appUser } = await requireRevenueViewer(request);
    const { id } = await context.params;
    const activity = await getOutreachActivity(appUser, id);
    return NextResponse.json({ activity });
  } catch (err) {
    return revenueApiError(err);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { appUser } = await requireRevenueManager(request);
    const { id } = await context.params;
    const body = (await request.json()) as {
      subject?: string;
      body?: string;
      recipientName?: string;
      recipientEmail?: string;
    };
    const activity = await updateOutreachActivity(appUser, id, body);
    return NextResponse.json({ activity });
  } catch (err) {
    return revenueApiError(err);
  }
}
