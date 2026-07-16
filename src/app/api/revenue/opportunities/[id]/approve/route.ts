import { NextRequest, NextResponse } from "next/server";
import { approveOpportunity } from "@/lib/revenueOpportunities/server/opportunities";
import { requireRevenueManager, revenueApiError } from "@/lib/revenueOpportunities/server/routeHelpers";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { appUser } = await requireRevenueManager(request);
    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as { notes?: string };
    const opportunity = await approveOpportunity(appUser, id, body.notes);
    return NextResponse.json({ opportunity });
  } catch (err) {
    return revenueApiError(err);
  }
}
