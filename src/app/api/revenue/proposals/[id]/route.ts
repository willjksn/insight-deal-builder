import { NextRequest, NextResponse } from "next/server";
import { getProposal, updateProposal } from "@/lib/revenueOpportunities/server/proposals";
import { requireRevenueManager, requireRevenueViewer, revenueApiError } from "@/lib/revenueOpportunities/server/routeHelpers";
import type {
  AgreementProposalPrefill,
  RevenueProposalStatus,
} from "@/lib/revenueOpportunities/types/proposal";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { appUser } = await requireRevenueViewer(request);
    const { id } = await context.params;
    const proposal = await getProposal(appUser, id);
    return NextResponse.json({ proposal });
  } catch (err) {
    return revenueApiError(err);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { appUser } = await requireRevenueManager(request);
    const { id } = await context.params;
    const body = (await request.json()) as {
      status?: RevenueProposalStatus;
      title?: string;
      executiveSummary?: string;
      scopeOutline?: string;
      deliverables?: string[];
      timelineNotes?: string;
      investmentMin?: number;
      investmentMax?: number;
      paymentStructureSuggestion?: string;
      agreementPrefill?: AgreementProposalPrefill;
      agreementId?: string;
    };
    const proposal = await updateProposal(appUser, id, body);
    return NextResponse.json({ proposal });
  } catch (err) {
    return revenueApiError(err);
  }
}
