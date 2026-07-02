import { NextRequest, NextResponse } from "next/server";
import { apiErrorStatus, requireApprovedAuthUser } from "@/lib/api/routeAuth";
import { loadAgreementForUser } from "@/lib/agreement/serverAccess";
import { getPaymentLinkParty } from "@/lib/agreement/payeeParties";
import { createSigningLink, findActiveSigningToken } from "@/lib/signing/server";
import { agreementAcceptsStripePayments } from "@/lib/stripe/eligibility";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: agreementId } = await params;
    const { uid, appUser } = await requireApprovedAuthUser(request);
    const agreement = await loadAgreementForUser(agreementId, appUser);

    if (!agreementAcceptsStripePayments(agreement)) {
      return NextResponse.json({ token: null });
    }

    const payParty = getPaymentLinkParty(agreement);
    if (!payParty) {
      return NextResponse.json({ token: null });
    }

    let token = await findActiveSigningToken(agreementId, payParty.id);
    if (!token) {
      const created = await createSigningLink({
        agreementId,
        partyId: payParty.id,
        createdBy: uid,
      });
      token = created.token;
    }

    return NextResponse.json({ token, partyId: payParty.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load signing token";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}
