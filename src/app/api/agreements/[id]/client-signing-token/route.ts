import { NextRequest, NextResponse } from "next/server";
import { apiErrorStatus, requireApprovedAuthUser } from "@/lib/api/routeAuth";
import { loadAgreementForUser } from "@/lib/agreement/serverAccess";
import { getExternalSigningParty } from "@/lib/agreement/payeeParties";
import { findActiveSigningToken } from "@/lib/signing/server";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: agreementId } = await params;
    const { appUser } = await requireApprovedAuthUser(request);
    const agreement = await loadAgreementForUser(agreementId, appUser);

    if (agreement.agreementType !== "client_project") {
      return NextResponse.json({ token: null });
    }

    const clientParty = getExternalSigningParty(agreement);
    if (!clientParty || clientParty.type !== "client") {
      return NextResponse.json({ token: null });
    }

    const token = await findActiveSigningToken(agreementId, clientParty.id);
    return NextResponse.json({ token });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load signing token";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}
