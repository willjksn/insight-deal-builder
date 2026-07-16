import { NextRequest, NextResponse } from "next/server";
import { createGmailDraftFromOutreach } from "@/lib/revenueOpportunities/server/outreachGmail";
import { requireRevenueManager, revenueApiError } from "@/lib/revenueOpportunities/server/routeHelpers";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const { appUser } = await requireRevenueManager(_request);
    const { id } = await context.params;
    const result = await createGmailDraftFromOutreach(appUser, id);
    return NextResponse.json(result);
  } catch (err) {
    return revenueApiError(err);
  }
}
