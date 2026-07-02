import { FieldValue, Firestore } from "firebase-admin/firestore";
import { Agreement } from "@/lib/types";
import { recordInstallmentPayment } from "@/lib/analytics/paymentTracking";
import { centsToDollars } from "@/lib/stripe/eligibility";

export function applyStripePaymentToAgreement(params: {
  agreement: Agreement;
  installmentId: string;
  amountCents: number;
  paidAt: string;
  stripeCheckoutSessionId: string;
  stripePaymentIntentId?: string;
}): Agreement["paymentTracking"] {
  const amount = centsToDollars(params.amountCents);
  const base = recordInstallmentPayment(
    params.agreement.paymentTracking,
    params.agreement.paymentTerms,
    params.installmentId,
    amount,
    params.paidAt,
    "Stripe",
    `Stripe Checkout ${params.stripeCheckoutSessionId}`,
    "add"
  );

  const installments = base.installments.map((row) => {
    if (row.id !== params.installmentId) return row;
    return {
      ...row,
      paymentSource: "stripe" as const,
      stripeCheckoutSessionId: params.stripeCheckoutSessionId,
      stripePaymentIntentId: params.stripePaymentIntentId,
    };
  });

  return { ...base, installments };
}

export async function persistStripePayment(
  db: Firestore,
  agreementId: string,
  paymentTracking: Agreement["paymentTracking"]
): Promise<void> {
  await db.collection("agreements").doc(agreementId).update({
    paymentTracking,
    updatedAt: FieldValue.serverTimestamp(),
  });
}
