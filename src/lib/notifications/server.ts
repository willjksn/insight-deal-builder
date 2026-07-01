import type { Firestore } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb, getAdminMessaging } from "@/lib/firebase/admin";
import { INSIGHT_MEDIA_GROUP_LLC } from "@/lib/utils/permissions";
import { resolveAgreementSignRecipients } from "@/lib/notifications/recipients";
import {
  buildAgreementSignedEmail,
  sendAgreementSignedEmails,
  sendAgreementSignedPush,
} from "@/lib/notifications/delivery";
import { Agreement, AgreementParty } from "@/lib/types";

async function notifyAdminsEmailDeliveryIssue(params: {
  db: Firestore;
  agreement: Agreement;
  reason: string;
}): Promise<void> {
  const { db, agreement, reason } = params;
  const project = agreement.projectDetails.projectName || agreement.title;
  await db.collection("notifications").add({
    type: "email_delivery_failed",
    agreementId: agreement.id,
    agreementTitle: agreement.title,
    projectName: project,
    message: reason,
    companyRecipient: INSIGHT_MEDIA_GROUP_LLC,
    read: false,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function deliverClientSignedNotifications(params: {
  agreement: Agreement;
  signingParty: AgreementParty;
  signerUserId?: string;
  appUrl: string;
}): Promise<{ inApp: number; emailsSent: number; pushSent: number }> {
  const { agreement, signingParty, signerUserId, appUrl } = params;
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin is not configured on the server");

  const existing = await db
    .collection("notifications")
    .where("agreementId", "==", agreement.id)
    .where("type", "==", "agreement_signed")
    .limit(1)
    .get();
  if (!existing.empty) {
    return { inApp: 0, emailsSent: 0, pushSent: 0 };
  }

  const payload = {
    type: "agreement_signed" as const,
    agreementId: agreement.id,
    agreementTitle: agreement.title,
    projectName: agreement.projectDetails.projectName,
    signerName: signingParty.signerName,
    read: false,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  const batch = db.batch();
  const companyRef = db.collection("notifications").doc();
  batch.set(companyRef, { ...payload, companyRecipient: INSIGHT_MEDIA_GROUP_LLC });

  let inApp = 1;
  const creatorId = agreement.createdBy?.trim();
  if (creatorId && creatorId !== signerUserId) {
    const creatorRef = db.collection("notifications").doc();
    batch.set(creatorRef, { ...payload, userId: creatorId });
    inApp++;
  }
  await batch.commit();

  const recipients = await resolveAgreementSignRecipients(db, agreement, signerUserId);
  const emailContent = buildAgreementSignedEmail({ agreement, signingParty, appUrl });
  const emailResult = await sendAgreementSignedEmails(recipients, emailContent);
  const emailsSent = emailResult.sent;

  const wantsEmail = recipients.some((r) => r.notifyEmail && r.email);
  if (wantsEmail && !emailResult.resendConfigured) {
    await notifyAdminsEmailDeliveryIssue({
      db,
      agreement,
      reason: "RESEND_API_KEY is not configured — signed agreement emails were not sent",
    });
  } else if (emailResult.failed > 0) {
    await notifyAdminsEmailDeliveryIssue({
      db,
      agreement,
      reason: `${emailResult.failed} signed agreement email(s) failed to send via Resend`,
    });
  }

  let pushSent = 0;
  const messaging = getAdminMessaging();
  if (messaging) {
    const project = agreement.projectDetails.projectName || agreement.title;
    const push = await sendAgreementSignedPush(messaging, recipients, {
      title: "Client signed agreement",
      body: `${signingParty.signerName} signed ${project}`,
      agreementId: agreement.id,
      appUrl,
    });
    pushSent = push.sent;
  }

  return { inApp, emailsSent, pushSent };
}

export async function verifyAuthToken(authHeader: string | null): Promise<string> {
  const adminAuth = getAdminAuth();
  if (!adminAuth) throw new Error("Firebase Admin Auth is not configured");

  const token = authHeader?.replace(/^Bearer\s+/i, "").trim();
  if (!token) throw new Error("Missing authorization token");

  const decoded = await adminAuth.verifyIdToken(token);
  return decoded.uid;
}

export function partyHasSignature(agreement: Agreement, partyId: string): boolean {
  return agreement.signatures.some((s) => s.partyId === partyId);
}
