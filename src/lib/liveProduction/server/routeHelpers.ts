import { NextRequest, NextResponse } from "next/server";
import {
  apiErrorStatus,
  assertCanManageRevenueOpportunities,
  assertCanViewRevenueOpportunities,
  requireApprovedAuthUser,
} from "@/lib/api/routeAuth";
import { isRevenueOpportunitiesEnabled } from "@/lib/revenueOpportunities/featureFlag";

export const runtime = "nodejs";

/** Live Production Opportunities rides the same access gate as Revenue & opportunities. */
export function assertLiveProductionEnabled(): void {
  if (!isRevenueOpportunitiesEnabled()) {
    throw new Error("Live Production Opportunities is disabled");
  }
}

export function liveProductionApiError(err: unknown): NextResponse {
  const message = err instanceof Error ? err.message : "Request failed";
  const status =
    message.includes("disabled") ? 503 : message.includes("not found") ? 404 : apiErrorStatus(message);
  return NextResponse.json({ error: message }, { status });
}

export async function requireLiveViewer(request: NextRequest) {
  assertLiveProductionEnabled();
  const auth = await requireApprovedAuthUser(request);
  assertCanViewRevenueOpportunities(auth.appUser);
  return auth;
}

export async function requireLiveManager(request: NextRequest) {
  assertLiveProductionEnabled();
  const auth = await requireApprovedAuthUser(request);
  assertCanManageRevenueOpportunities(auth.appUser);
  return auth;
}
