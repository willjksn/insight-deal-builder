import { Firestore } from "firebase-admin/firestore";
import { AppUser } from "@/lib/types";
import { INSIGHT_MEDIA_GROUP_LLC } from "@/lib/utils/permissions";

export interface NotificationRecipient {
  userId: string;
  email?: string;
  displayName?: string;
  fcmTokens?: string[];
  notifyEmail: boolean;
  notifyPush: boolean;
}

export function recipientFromUser(user: AppUser & { fcmTokens?: string[]; notifyEmail?: boolean; notifyPush?: boolean }): NotificationRecipient {
  return {
    userId: user.id,
    email: user.email,
    displayName: user.displayName,
    fcmTokens: user.fcmTokens ?? [],
    notifyEmail: user.notifyEmail !== false,
    notifyPush: user.notifyPush !== false,
  };
}

export function dedupeRecipients(recipients: NotificationRecipient[]): NotificationRecipient[] {
  const byId = new Map<string, NotificationRecipient>();
  for (const r of recipients) {
    const prev = byId.get(r.userId);
    if (!prev) {
      byId.set(r.userId, r);
      continue;
    }
    byId.set(r.userId, {
      ...prev,
      fcmTokens: [...new Set([...(prev.fcmTokens ?? []), ...(r.fcmTokens ?? [])])],
      notifyEmail: prev.notifyEmail || r.notifyEmail,
      notifyPush: prev.notifyPush || r.notifyPush,
    });
  }
  return Array.from(byId.values());
}

export async function resolveAgreementSignRecipients(
  db: Firestore,
  agreement: { createdBy?: string },
  signerUserId?: string
): Promise<NotificationRecipient[]> {
  const recipients: NotificationRecipient[] = [];

  const imgSnap = await db
    .collection("users")
    .where("company", "==", INSIGHT_MEDIA_GROUP_LLC)
    .get();

  for (const doc of imgSnap.docs) {
    const user = { id: doc.id, ...doc.data() } as AppUser & {
      fcmTokens?: string[];
      notifyEmail?: boolean;
      notifyPush?: boolean;
    };
    if (user.id === signerUserId) continue;
    recipients.push(recipientFromUser(user));
  }

  const creatorId = agreement.createdBy?.trim();
  if (creatorId && creatorId !== signerUserId) {
    const creatorDoc = await db.collection("users").doc(creatorId).get();
    if (creatorDoc.exists) {
      const user = { id: creatorDoc.id, ...creatorDoc.data() } as AppUser & {
        fcmTokens?: string[];
        notifyEmail?: boolean;
        notifyPush?: boolean;
      };
      recipients.push(recipientFromUser(user));
    }
  }

  return dedupeRecipients(recipients);
}
