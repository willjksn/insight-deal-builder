import { NextRequest, NextResponse } from "next/server";
import { draftBusinessProfile } from "@/lib/revenueOpportunities/server/businessProfiles";
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
      sourceText?: unknown;
      sourceUrl?: unknown;
    };
    const sourceText = typeof body.sourceText === "string" ? body.sourceText.trim() : "";
    const sourceUrl = typeof body.sourceUrl === "string" ? body.sourceUrl.trim() : "";
    if (!sourceText && !sourceUrl) {
      throw new RevenueOpportunityError(
        "VALIDATION_FAILED",
        "Provide pasted material or a URL for the AI to work from"
      );
    }
    const result = await draftBusinessProfile(appUser, id, {
      sourceText: sourceText || undefined,
      sourceUrl: sourceUrl || undefined,
    });
    return NextResponse.json(result);
  } catch (err) {
    return revenueApiError(err);
  }
}
