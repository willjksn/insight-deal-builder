import { NextRequest, NextResponse } from "next/server";
import { generateOutreachForOpportunity } from "@/lib/revenueOpportunities/server/outreachRun";
import { requireRevenueManager, revenueApiError } from "@/lib/revenueOpportunities/server/routeHelpers";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { appUser } = await requireRevenueManager(request);
    const { id } = await context.params;
    const result = await generateOutreachForOpportunity(appUser, id);
    return NextResponse.json(result);
  } catch (err) {
    return revenueApiError(err);
  }
}
