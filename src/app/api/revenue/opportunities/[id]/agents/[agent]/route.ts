import { NextRequest, NextResponse } from "next/server";
import {
  runBrandForOpportunity,
  runFollowUpForOpportunity,
  runFormalForOpportunity,
  runPursuitForOpportunity,
  runSignalForOpportunity,
} from "@/lib/revenueOpportunities/server/agentRunner";
import { requireRevenueManager, revenueApiError } from "@/lib/revenueOpportunities/server/routeHelpers";
import { RevenueOpportunityError } from "@/lib/revenueOpportunities/errors";
import type { AppUser } from "@/lib/types";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string; agent: string }> };

const RUNNERS: Record<string, (appUser: AppUser, id: string) => Promise<unknown>> = {
  signal: runSignalForOpportunity,
  formal: runFormalForOpportunity,
  brand: runBrandForOpportunity,
  pursuit: runPursuitForOpportunity,
  "follow-up": runFollowUpForOpportunity,
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { appUser } = await requireRevenueManager(request);
    const { id, agent } = await context.params;
    const runner = RUNNERS[agent];
    if (!runner) {
      throw new RevenueOpportunityError("VALIDATION_FAILED", `Unknown intel agent: ${agent}`);
    }
    const result = await runner(appUser, id);
    return NextResponse.json(result);
  } catch (err) {
    return revenueApiError(err);
  }
}
