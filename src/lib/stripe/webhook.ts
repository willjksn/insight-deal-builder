import { FieldValue, Firestore } from "firebase-admin/firestore";
import Stripe from "stripe";
import { Agreement } from "@/lib/types";
import { getStripeWebhookSecret } from "@/lib/stripe/config";
import { getStripe } from "@/lib/stripe/server";
import { applyStripePaymentToAgreement, persistStripePayment } from "@/lib/stripe/applyPayment";
import { installmentPayableAmount } from "@/lib/stripe/eligibility";

const WEBHOOK_EVENTS_COLLECTION = "stripeWebhookEvents";

export function constructStripeEvent(payload: string, signature: string | null): Stripe.Event {
  const secret = getStripeWebhookSecret();
  if (!secret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
  }
  if (!signature) {
    throw new Error("Missing Stripe signature header");
  }
  const stripe = getStripe();
  return stripe.webhooks.constructEvent(payload, signature, secret);
}

async function markEventProcessed(db: Firestore, eventId: string): Promise<boolean> {
  const ref = db.collection(WEBHOOK_EVENTS_COLLECTION).doc(eventId);
  const snap = await ref.get();
  if (snap.exists) return false;
  await ref.set({
    processedAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
  });
  return true;
}

async function loadAgreement(db: Firestore, agreementId: string): Promise<Agreement | null> {
  const snap = await db.collection("agreements").doc(agreementId).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() } as Agreement;
}

export async function handleCheckoutSessionCompleted(
  db: Firestore,
  session: Stripe.Checkout.Session
): Promise<{ applied: boolean; agreementId?: string }> {
  if (session.payment_status !== "paid") {
    return { applied: false };
  }

  const agreementId = session.metadata?.agreementId;
  const installmentId = session.metadata?.installmentId;
  const amountCents = Number(session.metadata?.amountCents ?? session.amount_total ?? 0);

  if (!agreementId || !installmentId || !Number.isFinite(amountCents) || amountCents <= 0) {
    throw new Error("Checkout session missing payment metadata");
  }

  const agreement = await loadAgreement(db, agreementId);
  if (!agreement) {
    throw new Error(`Agreement ${agreementId} not found`);
  }

  const payable = installmentPayableAmount(agreement, installmentId);
  if (payable == null) {
    return { applied: false, agreementId };
  }

  const paidAt = new Date().toISOString();
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;

  const paymentTracking = applyStripePaymentToAgreement({
    agreement,
    installmentId,
    amountCents,
    paidAt,
    stripeCheckoutSessionId: session.id,
    stripePaymentIntentId: paymentIntentId,
  });

  await persistStripePayment(db, agreementId, paymentTracking);
  return { applied: true, agreementId };
}

export async function processStripeWebhookEvent(
  db: Firestore,
  event: Stripe.Event
): Promise<{ handled: boolean; applied?: boolean; agreementId?: string }> {
  const isNew = await markEventProcessed(db, event.id);
  if (!isNew) {
    return { handled: true, applied: false };
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const result = await handleCheckoutSessionCompleted(db, session);
    return { handled: true, ...result };
  }

  return { handled: false };
}
