import { FieldValue } from "firebase-admin/firestore";
import { APP_DOMAIN } from "@/lib/brand";
import { PRODUCER_LEGAL_NAME } from "@/lib/constants/legalTerms";
import { sendTransactionalEmail } from "@/lib/notifications/delivery";
import { getAdminDb } from "@/lib/firebase/admin";
import { CreatorError } from "@/lib/creators/errors";
import { CREATORS_COLLECTION, isStripeConnectReady, type Creator } from "@/lib/creators/types";
import { serializeDoc } from "@/lib/revenueOpportunities/server/serialize";

function appBaseUrl(): string {
  const env = process.env.NEXT_PUBLIC_APP_URL?.trim() || process.env.APP_URL?.trim();
  if (env) return env.replace(/\/$/, "");
  return `https://${APP_DOMAIN}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatUsd(amount: number): string {
  return amount.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export function buildCreatorPaidEmail(params: {
  professionalName: string;
  campaignName: string;
  amount: number;
  paidVia: "stripe" | "manual";
}): { subject: string; html: string; text: string } {
  const name = params.professionalName.trim() || "there";
  const amountLabel = formatUsd(params.amount);
  const via =
    params.paidVia === "stripe"
      ? "via Stripe Connect"
      : "and recorded in ShootSpine (paid outside Stripe)";
  const subject = `Payment recorded · ${params.campaignName}`;
  const portalUrl = `${appBaseUrl()}/creator-portal/campaigns`;

  const text = `Hi ${name},

${PRODUCER_LEGAL_NAME} recorded a payment of ${amountLabel} for "${params.campaignName}" ${via}.

View your campaigns in the creator portal:
${portalUrl}

Questions? Reply to this email or write to contact@insightmediagroupllc.com.

— ${PRODUCER_LEGAL_NAME}`;

  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.55;color:#0f172a;max-width:560px;">
      <p style="margin:0 0 16px;">Hi ${escapeHtml(name)},</p>
      <p style="margin:0 0 16px;">
        <strong>${escapeHtml(PRODUCER_LEGAL_NAME)}</strong> recorded a payment of
        <strong>${escapeHtml(amountLabel)}</strong> for
        <strong>${escapeHtml(params.campaignName)}</strong> ${escapeHtml(via)}.
      </p>
      <p style="margin:0 0 24px;">
        <a href="${portalUrl}" style="color:#0284c7;">View your campaigns</a>
      </p>
      <p style="margin:0;color:#64748b;font-size:13px;">— ${escapeHtml(PRODUCER_LEGAL_NAME)}</p>
    </div>
  `;

  return { subject, html, text };
}

export function buildCreatorConnectNudgeEmail(params: {
  professionalName: string;
}): { subject: string; html: string; text: string } {
  const name = params.professionalName.trim() || "there";
  const subject = `Finish Stripe Connect to get paid · ${PRODUCER_LEGAL_NAME}`;
  const paymentUrl = `${appBaseUrl()}/creator-portal/payment`;

  const text = `Hi ${name},

${PRODUCER_LEGAL_NAME} needs your Stripe Connect set up so we can pay you for creator work. Bank details stay with Stripe — we never store them in ShootSpine.

Open the payment page and choose Connect with Stripe:
${paymentUrl}

— ${PRODUCER_LEGAL_NAME}`;

  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.55;color:#0f172a;max-width:560px;">
      <p style="margin:0 0 16px;">Hi ${escapeHtml(name)},</p>
      <p style="margin:0 0 16px;">
        <strong>${escapeHtml(PRODUCER_LEGAL_NAME)}</strong> needs your Stripe Connect set up so we can
        pay you for creator work. Bank details stay with Stripe — we never store them in ShootSpine.
      </p>
      <p style="margin:0 0 24px;">
        <a href="${paymentUrl}" style="color:#0284c7;">Open payment setup</a>
      </p>
      <p style="margin:0;color:#64748b;font-size:13px;">— ${escapeHtml(PRODUCER_LEGAL_NAME)}</p>
    </div>
  `;

  return { subject, html, text };
}

/** Best-effort — never throws (payout already saved). */
export async function sendCreatorPaidEmail(params: {
  to: string;
  professionalName: string;
  campaignName: string;
  amount: number;
  paidVia: "stripe" | "manual";
}): Promise<{ sent: boolean }> {
  const to = params.to.trim();
  if (!to) return { sent: false };
  const content = buildCreatorPaidEmail(params);
  try {
    const result = await sendTransactionalEmail({ to, ...content });
    return { sent: result.sent };
  } catch (err) {
    console.error("[creators] paid email failed", err);
    return { sent: false };
  }
}

/** Best-effort Connect / payment setup reminder. */
export async function sendCreatorConnectNudgeEmail(params: {
  to: string;
  professionalName: string;
}): Promise<{ sent: boolean }> {
  const to = params.to.trim();
  if (!to) return { sent: false };
  const content = buildCreatorConnectNudgeEmail(params);
  try {
    const result = await sendTransactionalEmail({ to, ...content });
    return { sent: result.sent };
  } catch (err) {
    console.error("[creators] Connect nudge email failed", err);
    return { sent: false };
  }
}

const CONNECT_NUDGE_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

function nudgeIsFresh(sentAt?: string): boolean {
  if (!sentAt) return false;
  const t = Date.parse(sentAt);
  if (!Number.isFinite(t)) return false;
  return Date.now() - t < CONNECT_NUDGE_COOLDOWN_MS;
}

async function markConnectNudgeSent(creatorId: string): Promise<void> {
  const db = getAdminDb();
  if (!db) return;
  await db.collection(CREATORS_COLLECTION).doc(creatorId).update({
    stripeConnectNudgeSentAt: new Date().toISOString(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

/** Staff action: email creator to finish Connect / payment setup. */
export async function remindCreatorStripeConnect(
  creatorId: string
): Promise<{ sent: boolean; creator: Creator }> {
  const db = getAdminDb();
  if (!db) throw new CreatorError("NOT_CONFIGURED", "Firebase Admin is not configured");

  const snap = await db.collection(CREATORS_COLLECTION).doc(creatorId).get();
  if (!snap.exists) throw new CreatorError("NOT_FOUND", "Creator not found");
  const creator = serializeDoc<Creator>(snap.id, snap.data()!);

  if (isStripeConnectReady(creator)) {
    throw new CreatorError(
      "VALIDATION_FAILED",
      "Creator is already ready for Stripe payouts"
    );
  }

  const email = creator.email?.trim();
  if (!email) {
    throw new CreatorError("VALIDATION_FAILED", "Creator has no email on file");
  }

  const { sent } = await sendCreatorConnectNudgeEmail({
    to: email,
    professionalName: creator.professionalName,
  });
  if (!sent) {
    throw new CreatorError(
      "NOT_CONFIGURED",
      "Could not send email — check RESEND_API_KEY / email configuration"
    );
  }

  await markConnectNudgeSent(creatorId);
  const refreshed = await db.collection(CREATORS_COLLECTION).doc(creatorId).get();
  return {
    sent: true,
    creator: serializeDoc<Creator>(refreshed.id, refreshed.data()!),
  };
}

/**
 * Best-effort auto nudge when assigning compensated work and Connect isn't ready.
 * Debounced to once per 7 days. Never throws.
 */
export async function maybeAutoNudgeCreatorStripeConnect(
  creator: Creator
): Promise<{ sent: boolean }> {
  try {
    if (isStripeConnectReady(creator)) return { sent: false };
    if (!creator.email?.trim()) return { sent: false };
    if (nudgeIsFresh(creator.stripeConnectNudgeSentAt)) return { sent: false };

    const { sent } = await sendCreatorConnectNudgeEmail({
      to: creator.email,
      professionalName: creator.professionalName,
    });
    if (sent) await markConnectNudgeSent(creator.id);
    return { sent };
  } catch (err) {
    console.error("[creators] auto Connect nudge failed", err);
    return { sent: false };
  }
}

export function buildCreatorPayoutReversedEmail(params: {
  professionalName: string;
  campaignName: string;
}): { subject: string; html: string; text: string } {
  const name = params.professionalName.trim() || "there";
  const subject = `Payment reversed · ${params.campaignName}`;
  const portalUrl = `${appBaseUrl()}/creator-portal/campaigns`;

  const text = `Hi ${name},

A Stripe payment for "${params.campaignName}" was reversed, so this assignment shows as unpaid again in the creator portal.

View your campaigns:
${portalUrl}

Questions? Reply to this email or write to contact@insightmediagroupllc.com.

— ${PRODUCER_LEGAL_NAME}`;

  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.55;color:#0f172a;max-width:560px;">
      <p style="margin:0 0 16px;">Hi ${escapeHtml(name)},</p>
      <p style="margin:0 0 16px;">
        A Stripe payment for <strong>${escapeHtml(params.campaignName)}</strong> was reversed,
        so this assignment shows as unpaid again in the creator portal.
      </p>
      <p style="margin:0 0 24px;">
        <a href="${portalUrl}" style="color:#0284c7;">View your campaigns</a>
      </p>
      <p style="margin:0;color:#64748b;font-size:13px;">— ${escapeHtml(PRODUCER_LEGAL_NAME)}</p>
    </div>
  `;

  return { subject, html, text };
}

/** Best-effort — never throws. */
export async function sendCreatorPayoutReversedEmail(params: {
  to: string;
  professionalName: string;
  campaignName: string;
}): Promise<{ sent: boolean }> {
  const to = params.to.trim();
  if (!to) return { sent: false };
  const content = buildCreatorPayoutReversedEmail(params);
  try {
    const result = await sendTransactionalEmail({ to, ...content });
    return { sent: result.sent };
  } catch (err) {
    console.error("[creators] payout reversed email failed", err);
    return { sent: false };
  }
}

