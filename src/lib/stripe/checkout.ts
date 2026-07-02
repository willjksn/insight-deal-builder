import Stripe from "stripe";
import { Agreement } from "@/lib/types";
import { getStripe } from "@/lib/stripe/server";
import {
  agreementAcceptsStripePayments,
  dollarsToCents,
  installmentPayableAmount,
} from "@/lib/stripe/eligibility";
import { resolvePaymentInstallments } from "@/lib/analytics/paymentTracking";

export type CreateAgreementCheckoutParams = {
  agreement: Agreement;
  installmentId: string;
  appUrl: string;
  customerEmail?: string;
  successPath?: string;
  cancelPath?: string;
};

export function validateCheckoutRequest(params: CreateAgreementCheckoutParams): {
  amountDue: number;
  amountCents: number;
  label: string;
} {
  const { agreement, installmentId } = params;

  if (!agreementAcceptsStripePayments(agreement)) {
    throw new Error("This agreement is not eligible for card payments.");
  }

  const amountDue = installmentPayableAmount(agreement, installmentId);
  if (amountDue == null) {
    throw new Error("That installment is already paid or not found.");
  }

  const row = resolvePaymentInstallments(agreement).find((r) => r.id === installmentId);
  if (!row) throw new Error("Installment not found.");

  return {
    amountDue,
    amountCents: dollarsToCents(amountDue),
    label: row.label,
  };
}

export async function createAgreementCheckoutSession(
  params: CreateAgreementCheckoutParams
): Promise<{ sessionId: string; url: string }> {
  const { agreement, installmentId, appUrl, customerEmail } = params;
  const { amountDue, amountCents, label } = validateCheckoutRequest(params);

  const base = appUrl.replace(/\/$/, "");
  const successUrl =
    params.successPath ??
    `${base}/pay/success?session_id={CHECKOUT_SESSION_ID}&agreementId=${agreement.id}`;
  const cancelUrl =
    params.cancelPath ?? `${base}/agreements/${agreement.id}?payment=cancelled`;

  const projectName = agreement.projectDetails.projectName || agreement.title;
  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    customer_email: customerEmail?.trim() || undefined,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: amountCents,
          product_data: {
            name: `${label} — ${projectName}`,
            description: agreement.title,
          },
        },
      },
    ],
    metadata: {
      agreementId: agreement.id,
      installmentId,
      amountCents: String(amountCents),
      amountDue: String(amountDue),
    },
    payment_intent_data: {
      metadata: {
        agreementId: agreement.id,
        installmentId,
        amountCents: String(amountCents),
      },
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  if (!session.url) {
    throw new Error("Stripe did not return a checkout URL.");
  }

  return { sessionId: session.id, url: session.url };
}

export async function retrieveCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session> {
  const stripe = getStripe();
  return stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["payment_intent"],
  });
}
