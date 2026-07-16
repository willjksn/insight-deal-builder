import { NextRequest, NextResponse } from "next/server";
import { rejectOpportunity } from "@/lib/revenueOpportunities/server/opportunities";
import { requireRevenueManager, revenueApiError } from "@/lib/revenueOpportunities/server/routeHelpers";
import type { RevenueRejectionReason } from "@/lib/revenueOpportunities/types";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

const VALID_REASONS: RevenueRejectionReason[] = [
  "poor_fit",
  "too_small",
  "wrong_industry",
  "weak_budget_potential",
  "weak_creator_fit",
  "weak_campaign_opportunity",
  "incorrect_information",
  "duplicate",
  "contact_unavailable",
  "outside_geography",
  "existing_relationship",
  "brand_safety_concern",
  "other",
];

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { appUser } = await requireRevenueManager(request);
    const { id } = await context.params;
    const body = (await request.json()) as {
      reason?: RevenueRejectionReason;
      notes?: string;
      revisitLater?: boolean;
    };
    if (!body.reason || !VALID_REASONS.includes(body.reason)) {
      return NextResponse.json({ error: "Valid rejection reason is required" }, { status: 400 });
    }
    const opportunity = await rejectOpportunity(appUser, id, body.reason, body.notes, body.revisitLater);
    return NextResponse.json({ opportunity });
  } catch (err) {
    return revenueApiError(err);
  }
}
