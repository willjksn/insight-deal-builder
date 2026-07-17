import { NextRequest, NextResponse } from "next/server";
import { getProposal } from "@/lib/revenueOpportunities/server/proposals";
import { emptyClientAgreementFromRevenuePrefill } from "@/lib/revenueOpportunities/proposals/applyToAgreement";
import { requireRevenueManager, revenueApiError } from "@/lib/revenueOpportunities/server/routeHelpers";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { appUser } = await requireRevenueManager(request);
    const { id } = await context.params;
    const proposal = await getProposal(appUser, id);
    if (!proposal.agreementPrefill) {
      return NextResponse.json({ error: "Proposal has no agreement prefill" }, { status: 400 });
    }
    const agreementPatch = emptyClientAgreementFromRevenuePrefill(proposal.agreementPrefill);
    return NextResponse.json({ proposal, agreementPatch });
  } catch (err) {
    return revenueApiError(err);
  }
}
