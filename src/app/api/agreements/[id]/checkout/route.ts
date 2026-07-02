import { NextRequest, NextResponse } from "next/server";
import { apiErrorStatus, requireApprovedAuthUser } from "@/lib/api/routeAuth";
import { loadAgreementForUser } from "@/lib/agreement/serverAccess";
import { getExternalSigningParty } from "@/lib/agreement/payeeParties";
import { createAgreementCheckoutSession } from "@/lib/stripe/checkout";
import { assertStripeConfigured } from "@/lib/stripe/config";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    assertStripeConfigured();
    const { id: agreementId } = await params;
    const { appUser } = await requireApprovedAuthUser(request);
    const body = (await request.json()) as { installmentId?: string };

    const installmentId = body.installmentId?.trim();
    if (!installmentId) {
      return NextResponse.json({ error: "installmentId is required" }, { status: 400 });
    }

    const agreement = await loadAgreementForUser(agreementId, appUser);
    const clientParty = getExternalSigningParty(agreement);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;

    const { sessionId, url } = await createAgreementCheckoutSession({
      agreement,
      installmentId,
      appUrl,
      customerEmail: clientParty?.email,
    });

    return NextResponse.json({ sessionId, url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create checkout";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}
