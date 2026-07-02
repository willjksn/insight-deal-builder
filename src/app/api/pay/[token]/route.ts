import { NextRequest, NextResponse } from "next/server";
import { apiErrorStatus } from "@/lib/api/routeAuth";
import { getAdminDb } from "@/lib/firebase/admin";
import { getSigningSession } from "@/lib/signing/server";
import {
  agreementAcceptsStripePayments,
  getStripePaymentKind,
  installmentPayableAmount,
  partyCanPayViaStripe,
} from "@/lib/stripe/eligibility";
import { isStripeConfigured } from "@/lib/stripe/config";
import { resolvePaymentInstallments, installmentOutstanding } from "@/lib/analytics/paymentTracking";
import { resolvePartnerReceivableInstallments } from "@/lib/analytics/partnerReceivableTracking";
import { formatPromotionSummary } from "@/lib/agreement/paymentDiscount";
import { Agreement } from "@/lib/types";

export const runtime = "nodejs";

async function loadFullAgreement(agreementId: string): Promise<Agreement | null> {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin is not configured");
  const snap = await db.collection("agreements").doc(agreementId).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() } as Agreement;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const session = await getSigningSession(token);
    if (!session) {
      return NextResponse.json({ error: "Invalid or expired payment link" }, { status: 404 });
    }

    const agreement = await loadFullAgreement(session.agreement.id);
    if (!agreement) {
      return NextResponse.json({ error: "Agreement not found" }, { status: 404 });
    }

    if (!partyCanPayViaStripe(agreement, session.party)) {
      return NextResponse.json(
        { error: "Card payments are not available for this party on this agreement" },
        { status: 400 }
      );
    }

    const paymentKind = getStripePaymentKind(agreement);
    const eligible = agreementAcceptsStripePayments(agreement);
    const sourceRows =
      paymentKind === "partner_reimburse"
        ? resolvePartnerReceivableInstallments(agreement)
        : resolvePaymentInstallments(agreement);

    const installments = sourceRows.map((row) => ({
      id: row.id,
      label: row.label,
      amountDue: row.amountDue,
      paidAmount: row.paidAmount ?? 0,
      outstanding: installmentOutstanding(row),
      payable: installmentPayableAmount(agreement, row.id),
    }));

    return NextResponse.json({
      stripeEnabled: isStripeConfigured(),
      paymentKind,
      agreementTitle: agreement.title,
      projectName: agreement.projectDetails.projectName,
      partyName: session.party.signerName || session.party.name,
      eligible,
      promotionSummary:
        paymentKind === "client_payment" ? formatPromotionSummary(agreement.paymentTerms) : null,
      installments,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load payment info";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}
