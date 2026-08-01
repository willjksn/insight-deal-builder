import { NextRequest, NextResponse } from "next/server";
import { upsertContactFromOpportunity } from "@/lib/revenueOpportunities/server/contacts";
import {
  requireRevenueManager,
  revenueApiError,
} from "@/lib/revenueOpportunities/server/routeHelpers";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { appUser } = await requireRevenueManager(request);
    const { id } = await context.params;
    const result = await upsertContactFromOpportunity(appUser, id);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return revenueApiError(err);
  }
}
