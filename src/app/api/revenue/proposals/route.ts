import { NextRequest, NextResponse } from "next/server";
import { listProposals } from "@/lib/revenueOpportunities/server/proposals";
import { requireRevenueViewer, revenueApiError } from "@/lib/revenueOpportunities/server/routeHelpers";
import type { RevenueProposalStatus } from "@/lib/revenueOpportunities/types/proposal";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { appUser } = await requireRevenueViewer(request);
    const { searchParams } = new URL(request.url);
    const opportunityId = searchParams.get("opportunityId") ?? undefined;
    const status = searchParams.get("status") as RevenueProposalStatus | null;
    const proposals = await listProposals(appUser, { opportunityId, status: status ?? undefined });
    return NextResponse.json({ proposals });
  } catch (err) {
    return revenueApiError(err);
  }
}
