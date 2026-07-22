import { NextRequest, NextResponse } from "next/server";
import { resolveMeetingExtraction } from "@/lib/revenueOpportunities/server/meetings";
import { requireRevenueManager, revenueApiError } from "@/lib/revenueOpportunities/server/routeHelpers";
import { RevenueOpportunityError } from "@/lib/revenueOpportunities/errors";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { appUser } = await requireRevenueManager(request);
    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as {
      extractionId?: unknown;
      action?: unknown;
    };
    const extractionId = typeof body.extractionId === "string" ? body.extractionId : "";
    if (!extractionId) {
      throw new RevenueOpportunityError("VALIDATION_FAILED", "extractionId is required");
    }
    if (body.action !== "approve" && body.action !== "reject") {
      throw new RevenueOpportunityError("VALIDATION_FAILED", "action must be 'approve' or 'reject'");
    }
    const meeting = await resolveMeetingExtraction(appUser, id, extractionId, body.action);
    return NextResponse.json({ meeting });
  } catch (err) {
    return revenueApiError(err);
  }
}
