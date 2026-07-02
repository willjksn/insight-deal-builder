import { NextRequest, NextResponse } from "next/server";
import { apiErrorStatus } from "@/lib/api/routeAuth";
import { getAdminDb } from "@/lib/firebase/admin";
import { getSigningSession } from "@/lib/signing/server";
import {
  agreementAcceptsStripePayments,
  installmentPayableAmount,
} from "@/lib/stripe/eligibility";
import { isStripeConfigured } from "@/lib/stripe/config";
import { resolvePaymentInstallments, installmentOutstanding } from "@/lib/analytics/paymentTracking";
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

    if (session.party.type !== "client") {
      return NextResponse.json(
        { error: "Card payments are only available on client project agreements" },
        { status: 400 }
      );
    }

    const agreement = await loadFullAgreement(session.agreement.id);
    if (!agreement) {
      return NextResponse.json({ error: "Agreement not found" }, { status: 404 });
    }

    const eligible = agreementAcceptsStripePayments(agreement);
    const installments = resolvePaymentInstallments(agreement).map((row) => ({
      id: row.id,
      label: row.label,
      amountDue: row.amountDue,
      paidAmount: row.paidAmount ?? 0,
      outstanding: installmentOutstanding(row),
      payable: installmentPayableAmount(agreement, row.id),
    }));

    return NextResponse.json({
      stripeEnabled: isStripeConfigured(),
      agreementTitle: agreement.title,
      projectName: agreement.projectDetails.projectName,
      partyName: session.party.signerName || session.party.name,
      eligible,
      installments,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load payment info";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}
