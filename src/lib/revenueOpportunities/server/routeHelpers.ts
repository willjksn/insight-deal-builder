import { NextRequest, NextResponse } from "next/server";
import {
  apiErrorStatus,
  assertCanManageRevenueOpportunities,
  assertCanViewRevenueOpportunities,
  requireApprovedAuthUser,
} from "@/lib/api/routeAuth";
import { isRevenueOpportunityError } from "@/lib/revenueOpportunities/errors";
import { isRevenueOpportunitiesEnabled } from "@/lib/revenueOpportunities/featureFlag";

export const runtime = "nodejs";

export function assertRevenueFeatureEnabled(): void {
  if (!isRevenueOpportunitiesEnabled()) {
    throw new Error("Revenue & opportunities is disabled");
  }
}

export function revenueApiError(err: unknown): NextResponse {
  if (isRevenueOpportunityError(err)) {
    return NextResponse.json({ error: err.message, code: err.code, details: err.details }, { status: err.status });
  }
  const message = err instanceof Error ? err.message : "Request failed";
  const status = message.includes("disabled") ? 503 : apiErrorStatus(message);
  return NextResponse.json({ error: message }, { status });
}

export async function requireRevenueViewer(request: NextRequest) {
  assertRevenueFeatureEnabled();
  const auth = await requireApprovedAuthUser(request);
  assertCanViewRevenueOpportunities(auth.appUser);
  return auth;
}

export async function requireRevenueManager(request: NextRequest) {
  assertRevenueFeatureEnabled();
  const auth = await requireApprovedAuthUser(request);
  assertCanManageRevenueOpportunities(auth.appUser);
  return auth;
}
