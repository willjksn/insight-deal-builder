import { NextRequest, NextResponse } from "next/server";
import { getDiscoverySession, updateDiscoverySession } from "@/lib/revenueOpportunities/server/discoverySessions";
import type { DiscoveryQuestionNote } from "@/lib/revenueOpportunities/types/discovery";
import { requireRevenueManager, requireRevenueViewer, revenueApiError } from "@/lib/revenueOpportunities/server/routeHelpers";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { appUser } = await requireRevenueViewer(request);
    const { id } = await context.params;
    const session = await getDiscoverySession(appUser, id);
    return NextResponse.json({ session });
  } catch (err) {
    return revenueApiError(err);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { appUser } = await requireRevenueManager(request);
    const { id } = await context.params;
    const body = (await request.json()) as {
      scheduledAt?: string;
      callNotes?: string;
      callQuestionNotes?: DiscoveryQuestionNote[];
      additionalCallNotes?: string;
      status?: "scheduled" | "completed" | "cancelled";
    };
    const session = await updateDiscoverySession(appUser, id, body);
    return NextResponse.json({ session });
  } catch (err) {
    return revenueApiError(err);
  }
}
