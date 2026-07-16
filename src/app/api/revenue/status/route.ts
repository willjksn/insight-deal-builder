import { NextRequest, NextResponse } from "next/server";
import {
  apiErrorStatus,
  assertCanViewRevenueOpportunities,
  requireApprovedAuthUser,
} from "@/lib/api/routeAuth";
import { aiUsesMock } from "@/lib/ai/mockAi";
import { tavilyAvailable } from "@/lib/search/tavilyClient";
import {
  REVENUE_OPPORTUNITIES_PHASE,
  isRevenueOpportunitiesEnabled,
} from "@/lib/revenueOpportunities/featureFlag";
import type { RevenueFeatureStatus } from "@/lib/revenueOpportunities/types";
import {
  mockEmailProvider,
  mockWorkflowProvider,
} from "@/lib/revenueOpportunities/providers";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { appUser } = await requireApprovedAuthUser(request);
    assertCanViewRevenueOpportunities(appUser);

    if (!isRevenueOpportunitiesEnabled()) {
      return NextResponse.json(
        { error: "Revenue & opportunities is disabled", enabled: false },
        { status: 503 }
      );
    }

    const status: RevenueFeatureStatus = {
      enabled: true,
      phase: REVENUE_OPPORTUNITIES_PHASE,
      version: "0.4.0-research",
      integrations: {
        gmail: mockEmailProvider.isAvailable() ? "live" : "not_configured",
        n8n: mockWorkflowProvider.isAvailable() ? "live" : "not_configured",
        search: tavilyAvailable() ? "live" : "not_configured",
        ai: aiUsesMock() ? "mock" : "live",
      },
    };

    return NextResponse.json({ ok: true, status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load revenue status";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}
