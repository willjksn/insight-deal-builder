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

  return { sent: true, creator };
}
