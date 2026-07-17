import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { emptyClientAgreementFromRevenuePrefill } from "@/lib/revenueOpportunities/proposals/applyToAgreement";
import { partiesPatchForRevenueAgreement } from "@/lib/revenueOpportunities/proposals/buildAgreementParties";
import { ensureClientFromOpportunity } from "@/lib/revenueOpportunities/server/ensureClientFromOpportunity";
import { getOpportunity } from "@/lib/revenueOpportunities/server/opportunities";
import { getProposal } from "@/lib/revenueOpportunities/server/proposals";
import { requireRevenueManager, revenueApiError } from "@/lib/revenueOpportunities/server/routeHelpers";
import type { Agreement, Company } from "@/lib/types";

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

    const opportunity = await getOpportunity(appUser, proposal.opportunityId);
    const { client, created: clientCreated, opportunity: linkedOpportunity } =
      await ensureClientFromOpportunity(appUser, opportunity);

    const db = getAdminDb();
    const companies = db
      ? (await db.collection("companies").get()).docs.map(
          (d) => d.data() as Pick<Company, "displayName" | "legalName" | "authorizedSignerName" | "authorizedSignerTitle" | "email">
        )
      : [];

    const scopePatch = emptyClientAgreementFromRevenuePrefill(proposal.agreementPrefill);
    const signerPatch = partiesPatchForRevenueAgreement(client, linkedOpportunity, companies);
    const agreementPatch: Partial<Agreement> = {
      ...scopePatch,
      parties: signerPatch.parties,
      projectDetails: {
        ...signerPatch.projectDetails,
        ...scopePatch.projectDetails,
        clientName: signerPatch.projectDetails.clientName,
        projectOverview: scopePatch.projectDetails?.projectOverview ?? "",
      },
    };

    return NextResponse.json({ proposal, agreementPatch, clientCreated, clientId: client.id });
  } catch (err) {
    return revenueApiError(err);
  }
}
