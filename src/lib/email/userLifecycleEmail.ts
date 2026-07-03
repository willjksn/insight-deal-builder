import { APP_NAME } from "@/lib/brand";
import { INSIGHT_MEDIA_GROUP_LLC } from "@/lib/utils/permissions";
import { sendTransactionalEmail } from "@/lib/notifications/delivery";

export function buildSignupWelcomeEmail(params: {
  displayName: string;
  appUrl: string;
}): { subject: string; html: string; text: string } {
  const name = params.displayName.trim() || "there";
  const subject = `We received your ${APP_NAME} access request`;
  const text = `Hi ${name},

Thanks for signing up for ${APP_NAME}. Your account is pending approval from an admin on our team.

You will receive another email when your access is ready. After that, sign in at:
${params.appUrl}/login

— ${INSIGHT_MEDIA_GROUP_LLC}`;

  const html = `
    <p>Hi ${name},</p>
    <p>Thanks for signing up for <strong>${APP_NAME}</strong>. Your account is <strong>pending approval</strong> from an admin on our team.</p>
    <p>You will receive another email when your access is ready. After that, sign in here:</p>
    <p><a href="${params.appUrl}/login">Sign in to ${APP_NAME}</a></p>
    <p style="color:#64748b;font-size:12px;">${INSIGHT_MEDIA_GROUP_LLC}</p>
  `;

  return { subject, html, text };
}

export function buildUserApprovedEmail(params: {
  displayName: string;
  appUrl: string;
}): { subject: string; html: string; text: string } {
  const name = params.displayName.trim() || "there";
  const subject = `Your ${APP_NAME} account is ready`;
  const text = `Hi ${name},

Your ${APP_NAME} account has been approved. You can sign in now:
${params.appUrl}/login

Tip: On iPhone or iPad, add ${APP_NAME} to your Home Screen (Share → Add to Home Screen) to enable push notifications under the app icon.

— ${INSIGHT_MEDIA_GROUP_LLC}`;

  const html = `
    <p>Hi ${name},</p>
    <p>Your <strong>${APP_NAME}</strong> account has been approved. You can sign in now:</p>
    <p><a href="${params.appUrl}/login">Sign in to ${APP_NAME}</a></p>
    <p style="color:#64748b;font-size:13px;"><strong>Tip:</strong> On iPhone or iPad, open ${APP_NAME} in Safari, tap <strong>Share</strong>, then <strong>Add to Home Screen</strong>. Open the app from your home screen and enable push in Settings to get alerts under the app icon.</p>
    <p style="color:#64748b;font-size:12px;">${INSIGHT_MEDIA_GROUP_LLC}</p>
  `;

  return { subject, html, text };
}

export async function sendSignupWelcomeEmail(params: {
  to: string;
  displayName: string;
  appUrl: string;
}): Promise<{ sent: boolean }> {
  const content = buildSignupWelcomeEmail({
    displayName: params.displayName,
    appUrl: params.appUrl,
  });
  const result = await sendTransactionalEmail({
    to: params.to,
    ...content,
  });
  return { sent: result.sent };
}

export async function sendUserApprovedEmail(params: {
  to: string;
  displayName: string;
  appUrl: string;
}): Promise<{ sent: boolean }> {
  const content = buildUserApprovedEmail({
    displayName: params.displayName,
    appUrl: params.appUrl,
  });
  const result = await sendTransactionalEmail({
    to: params.to,
    ...content,
  });
  return { sent: result.sent };
}
