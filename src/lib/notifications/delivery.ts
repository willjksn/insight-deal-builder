import { Resend } from "resend";
import { Agreement, AgreementParty } from "@/lib/types";
import { INSIGHT_MEDIA_GROUP_LLC } from "@/lib/utils/permissions";
import { NotificationRecipient } from "@/lib/notifications/recipients";

/** Strip accidental "Bearer ", whitespace, and line breaks from pasted env values. */
function normalizeResendApiKey(raw: string | undefined): string | null {
  if (!raw) return null;
  const key = raw.replace(/^Bearer\s+/i, "").replace(/\s+/g, "").trim();
  return key.length > 0 ? key : null;
}

let resendClient: Resend | null | undefined;

function getResendClient(): Resend | null {
  if (resendClient !== undefined) return resendClient;
  const key = normalizeResendApiKey(process.env.RESEND_API_KEY);
  resendClient = key ? new Resend(key) : null;
  return resendClient;
}

const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || "Insight Deal Builder <notifications@insightmediagroup.com>";

export function buildAgreementSignedEmail(params: {
  agreement: Pick<Agreement, "id" | "title" | "projectDetails">;
  signingParty: AgreementParty;
  appUrl: string;
}): { subject: string; html: string; text: string } {
  const project = params.agreement.projectDetails.projectName || params.agreement.title;
  const subject = `Client signed: ${project}`;
  const agreementUrl = `${params.appUrl}/agreements/${params.agreement.id}`;

  const text = `${params.signingParty.signerName} signed the agreement for ${project}.

View the signed agreement: ${agreementUrl}

— ${INSIGHT_MEDIA_GROUP_LLC}`;

  const html = `
    <p><strong>${params.signingParty.signerName}</strong> signed the agreement for <strong>${project}</strong>.</p>
    <p><a href="${agreementUrl}">View the signed agreement</a></p>
    <p style="color:#64748b;font-size:12px;">${INSIGHT_MEDIA_GROUP_LLC}</p>
  `;

  return { subject, html, text };
}

export async function sendAgreementSignedEmails(
  recipients: NotificationRecipient[],
  emailContent: { subject: string; html: string; text: string }
): Promise<{ sent: number; skipped: number }> {
  const resend = getResendClient();
  if (!resend) {
    console.warn("RESEND_API_KEY not set — skipping agreement signed emails");
    return { sent: 0, skipped: recipients.length };
  }

  const emails = [
    ...new Set(
      recipients.filter((r) => r.notifyEmail && r.email).map((r) => r.email!.trim().toLowerCase())
    ),
  ];

  if (!emails.length) return { sent: 0, skipped: recipients.length };

  let sent = 0;
  for (const to of emails) {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    });
    if (error) {
      console.error("Resend error for", to, error);
    } else {
      sent++;
    }
  }

  return { sent, skipped: recipients.length - sent };
}

export async function sendClientAgreementEmail(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
  pdfFilename: string;
  pdfBase64: string;
}): Promise<void> {
  const resend = getResendClient();
  if (!resend) {
    throw new Error("RESEND_API_KEY is not configured — add it to .env.local to send emails");
  }

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: params.to.trim(),
    subject: params.subject,
    html: params.html,
    text: params.text,
    attachments: [
      {
        filename: params.pdfFilename,
        content: params.pdfBase64,
      },
    ],
  });

  if (error) {
    throw new Error(error.message || "Failed to send email");
  }
}

export async function sendAgreementSignedPush(
  messaging: import("firebase-admin/messaging").Messaging,
  recipients: NotificationRecipient[],
  payload: { title: string; body: string; agreementId: string; appUrl: string }
): Promise<{ sent: number; failed: number }> {
  const tokens = [
    ...new Set(
      recipients
        .filter((r) => r.notifyPush)
        .flatMap((r) => r.fcmTokens ?? [])
        .filter(Boolean)
    ),
  ];

  if (!tokens.length) return { sent: 0, failed: 0 };

  const response = await messaging.sendEachForMulticast({
    tokens,
    notification: {
      title: payload.title,
      body: payload.body,
    },
    data: {
      type: "agreement_signed",
      agreementId: payload.agreementId,
      url: `/agreements/${payload.agreementId}`,
    },
    webpush: {
      fcmOptions: {
        link: `${payload.appUrl}/agreements/${payload.agreementId}`,
      },
    },
  });

  return {
    sent: response.successCount,
    failed: response.failureCount,
  };
}

export async function sendSignupPendingEmails(
  recipients: NotificationRecipient[],
  emailContent: { subject: string; html: string; text: string }
): Promise<{ sent: number; skipped: number }> {
  return sendAgreementSignedEmails(recipients, emailContent);
}

export async function sendSignupPendingPush(
  messaging: import("firebase-admin/messaging").Messaging,
  recipients: NotificationRecipient[],
  payload: { title: string; body: string; appUrl: string }
): Promise<{ sent: number; failed: number }> {
  const tokens = [
    ...new Set(
      recipients
        .filter((r) => r.notifyPush)
        .flatMap((r) => r.fcmTokens ?? [])
        .filter(Boolean)
    ),
  ];

  if (!tokens.length) return { sent: 0, failed: 0 };

  const response = await messaging.sendEachForMulticast({
    tokens,
    notification: {
      title: payload.title,
      body: payload.body,
    },
    data: {
      type: "user_signup_pending",
      url: "/admin",
    },
    webpush: {
      fcmOptions: {
        link: `${payload.appUrl}/admin`,
      },
    },
  });

  return {
    sent: response.successCount,
    failed: response.failureCount,
  };
}
