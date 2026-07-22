import { NextRequest, NextResponse } from "next/server";
import { resolveBusinessProfilePending } from "@/lib/revenueOpportunities/server/businessProfiles";
import {
  requireRevenueManager,
  revenueApiError,
} from "@/lib/revenueOpportunities/server/routeHelpers";
import { RevenueOpportunityError } from "@/lib/revenueOpportunities/errors";

export const runtime = "nodejs";

export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { appUser } = await requireRevenueManager(request);
    const { id } = await ctx.params;
    const body = (await request.json().catch(() => ({}))) as {
      action?: unknown;
      changeIds?: unknown;
    };
    if (body.action !== "approve" && body.action !== "reject") {
      throw new RevenueOpportunityError("VALIDATION_FAILED", "action must be 'approve' or 'reject'");
    }
    const changeIds = Array.isArray(body.changeIds)
      ? body.changeIds.filter((x): x is string => typeof x === "string")
      : undefined;
    const profile = await resolveBusinessProfilePending(appUser, id, body.action, changeIds);
    return NextResponse.json({ profile });
  } catch (err) {
    return revenueApiError(err);
  }
}
