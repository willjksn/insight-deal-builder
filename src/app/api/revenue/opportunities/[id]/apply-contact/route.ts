import { NextRequest, NextResponse } from "next/server";
import { resolveContactSuggestion } from "@/lib/revenueOpportunities/server/agentRunner";
import { requireRevenueManager, revenueApiError } from "@/lib/revenueOpportunities/server/routeHelpers";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { appUser } = await requireRevenueManager(request);
    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as { action?: unknown };
    const action = body.action === "dismiss" ? "dismiss" : "apply";
    const opportunity = await resolveContactSuggestion(appUser, id, action);
    return NextResponse.json({ opportunity });
  } catch (err) {
    return revenueApiError(err);
  }
}
