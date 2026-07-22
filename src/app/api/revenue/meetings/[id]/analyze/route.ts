import { NextRequest, NextResponse } from "next/server";
import { analyzeMeeting } from "@/lib/revenueOpportunities/server/meetings";
import { requireRevenueManager, revenueApiError } from "@/lib/revenueOpportunities/server/routeHelpers";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { appUser } = await requireRevenueManager(request);
    const { id } = await context.params;
    const result = await analyzeMeeting(appUser, id);
    return NextResponse.json(result);
  } catch (err) {
    return revenueApiError(err);
  }
}
