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
import { resolveN8nMode } from "@/lib/revenueOpportunities/n8n/config";
import { resolveGmailMode } from "@/lib/revenueOpportunities/providers/getEmailProvider";

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
      version: "0.9.0-n8n-automation",
      integrations: {
        gmail: resolveGmailMode(),
        n8n: (() => {
          const mode = resolveN8nMode();
          if (mode === "live") return "live" as const;
          if (mode === "mock") return "mock" as const;
          return "not_configured" as const;
        })(),
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
