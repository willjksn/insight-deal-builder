import { NextRequest, NextResponse } from "next/server";
import {
  addSuppressionEntry,
  listSuppressionEntries,
} from "@/lib/revenueOpportunities/server/suppression";
import {
  requireRevenueManager,
  requireRevenueViewer,
  revenueApiError,
} from "@/lib/revenueOpportunities/server/routeHelpers";
import { RevenueOpportunityError } from "@/lib/revenueOpportunities/errors";
import type { RevenueSuppressionKind } from "@/lib/revenueOpportunities/types/suppression";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { appUser } = await requireRevenueViewer(request);
    const entries = await listSuppressionEntries(appUser);
    return NextResponse.json({ entries });
  } catch (err) {
    return revenueApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { appUser } = await requireRevenueManager(request);
    const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const kind: RevenueSuppressionKind = b.kind === "domain" ? "domain" : "email";
    const value = typeof b.value === "string" ? b.value : "";
    if (!value.trim()) {
      throw new RevenueOpportunityError("VALIDATION_FAILED", "Value is required");
    }
    const entry = await addSuppressionEntry(appUser, {
      kind,
      value,
      reason: typeof b.reason === "string" ? b.reason : undefined,
      source: "manual",
    });
    return NextResponse.json({ entry }, { status: 201 });
  } catch (err) {
    return revenueApiError(err);
  }
}
