import { NextRequest, NextResponse } from "next/server";
import { initRevenueAgents, listRegisteredAgents } from "@/lib/revenueOpportunities/agents";
import { requireRevenueViewer, revenueApiError } from "@/lib/revenueOpportunities/server/routeHelpers";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    await requireRevenueViewer(request);
    initRevenueAgents();
    return NextResponse.json({ agents: listRegisteredAgents() });
  } catch (err) {
    return revenueApiError(err);
  }
}
