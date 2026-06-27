import { FieldValue, Firestore } from "firebase-admin/firestore";
import { AppUser } from "@/lib/types";
import { INSIGHT_MEDIA_GROUP_LLC, isLegacyInsightAdmin, resolvePermissions } from "@/lib/utils/permissions";
import {
  NotificationRecipient,
  recipientFromUser,
  dedupeRecipients,
} from "@/lib/notifications/recipients";
import {
  sendSignupPendingEmails,
  sendSignupPendingPush,
} from "@/lib/notifications/delivery";
import { getAdminMessaging } from "@/lib/firebase/admin";

export async function resolveUserAdminRecipients(db: Firestore): Promise<NotificationRecipient[]> {
  const snap = await db.collection("users").where("company", "==", INSIGHT_MEDIA_GROUP_LLC).get();
  const recipients: NotificationRecipient[] = [];

  for (const doc of snap.docs) {
    const user = { id: doc.id, ...doc.data() } as AppUser & {
      fcmTokens?: string[];
      notifyEmail?: boolean;
      notifyPush?: boolean;
    };
    const permissions = resolvePermissions(user);
    if (permissions.manageUsers || isLegacyInsightAdmin(user)) {
      recipients.push(recipientFromUser(user));
    }
  }

  return dedupeRecipients(recipients);
}

export async function notifyAdminsOfSignup(params: {
  db: Firestore;
  pendingUser: Pick<AppUser, "id" | "email" | "displayName">;
  appUrl: string;
}): Promise<{ notified: number }> {
  const { db, pendingUser, appUrl } = params;

  const existing = await db
    .collection("notifications")
    .where("type", "==", "user_signup_pending")
    .where("pendingUserId", "==", pendingUser.id)
    .limit(1)
    .get();
  if (!existing.empty) return { notified: 0 };

  const admins = await resolveUserAdminRecipients(db);
  if (!admins.length) return { notified: 0 };

  const batch = db.batch();
  const name = pendingUser.displayName?.trim() || pendingUser.email;
  const payload = {
    type: "user_signup_pending" as const,
    pendingUserId: pendingUser.id,
    pendingUserEmail: pendingUser.email,
    pendingUserName: name,
    read: false,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  for (const admin of admins) {
    const ref = db.collection("notifications").doc();
    batch.set(ref, { ...payload, userId: admin.userId });
  }
  await batch.commit();

  const emailContent = {
    subject: `New signup pending approval: ${name}`,
    html: `<p><strong>${name}</strong> (${pendingUser.email}) signed up and is waiting for access.</p><p><a href="${appUrl}/admin">Review in Admin</a></p>`,
    text: `${name} (${pendingUser.email}) signed up and is waiting for access.\n\nReview in Admin: ${appUrl}/admin`,
  };
  await sendSignupPendingEmails(admins, emailContent);

  const messaging = getAdminMessaging();
  if (messaging) {
    await sendSignupPendingPush(messaging, admins, {
      title: "New signup pending approval",
      body: `${name} is waiting for access`,
      appUrl,
    });
  }

  return { notified: admins.length };
}
