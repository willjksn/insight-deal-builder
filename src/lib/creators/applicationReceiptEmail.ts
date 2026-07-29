import { PRODUCER_LEGAL_NAME } from "@/lib/constants/legalTerms";
import { sendTransactionalEmail } from "@/lib/notifications/delivery";

const IMG_SITE = "https://insightmediagroupllc.com/";

export function buildCreatorApplicationReceiptEmail(params: {
  professionalName: string;
}): { subject: string; html: string; text: string } {
  const name = params.professionalName.trim() || "there";
  const subject = `We received your ${PRODUCER_LEGAL_NAME} creator application`;

  const text = `Hi ${name},

Thanks for applying to the ${PRODUCER_LEGAL_NAME} Creator Network.

We've received your application and our team will review it. If you're a fit, someone from IMG will be in touch about next steps (which may include an interview).

No ShootSpine account is needed right now — we'll invite you to create one only if we bring you onto the network.

Questions? Reply to this email or write to contact@insightmediagroupllc.com.

— ${PRODUCER_LEGAL_NAME}
Charlotte, NC
${IMG_SITE}`;

  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.55;color:#0f172a;max-width:560px;">
      <p style="margin:0 0 16px;">Hi ${escapeHtml(name)},</p>
      <p style="margin:0 0 16px;">Thanks for applying to the <strong>${escapeHtml(PRODUCER_LEGAL_NAME)} Creator Network</strong>.</p>
      <p style="margin:0 0 16px;">We've received your application and our team will review it. If you're a fit, someone from IMG will be in touch about next steps (which may include an interview).</p>
      <p style="margin:0 0 16px;">No ShootSpine account is needed right now — we'll invite you to create one only if we bring you onto the network.</p>
      <p style="margin:0 0 24px;">Questions? Reply to this email or write to <a href="mailto:contact@insightmediagroupllc.com">contact@insightmediagroupllc.com</a>.</p>
      <p style="margin:0;color:#64748b;font-size:13px;">
        — ${escapeHtml(PRODUCER_LEGAL_NAME)}<br/>
        Charlotte, NC<br/>
        <a href="${IMG_SITE}" style="color:#0284c7;">insightmediagroupllc.com</a>
      </p>
    </div>
  `;

  return { subject, html, text };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Best-effort confirmation email — never throws (application already saved). */
export async function sendCreatorApplicationReceiptEmail(params: {
  to: string;
  professionalName: string;
}): Promise<{ sent: boolean }> {
  const content = buildCreatorApplicationReceiptEmail({
    professionalName: params.professionalName,
  });
  try {
    const result = await sendTransactionalEmail({
      to: params.to,
      ...content,
    });
    return { sent: result.sent };
  } catch (err) {
    console.error("[creators] application receipt email failed", err);
    return { sent: false };
  }
}
