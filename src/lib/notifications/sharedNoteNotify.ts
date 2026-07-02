import { FieldValue, Firestore } from "firebase-admin/firestore";
import { getAdminMessaging } from "@/lib/firebase/admin";
import { ScriptWriterSession } from "@/lib/scriptWriter/types";
import { ScoutProject } from "@/lib/scout/types";
import { recipientFromUser, NotificationRecipient } from "@/lib/notifications/recipients";
import {
  buildSharedResourceNoteEmail,
  sendSharedResourceNoteEmails,
  sendSharedResourceNotePush,
} from "@/lib/notifications/delivery";
import { AppUser } from "@/lib/types";
import { sharedNotePreview } from "@/lib/sharedNotes/initials";
import {
  resourceTitleForNotification,
  resourceUrlForNotification,
} from "@/lib/sharedNotes/server";
import { SharedResourceNote, SharedResourceType } from "@/lib/sharedNotes/types";

export async function notifyOwnerOfSharedResourceNote(params: {
  db: Firestore;
  resourceType: SharedResourceType;
  resource: ScriptWriterSession | ScoutProject;
  note: SharedResourceNote;
  authorAppUser: AppUser;
  appUrl: string;
}): Promise<{ notified: boolean }> {
  const { db, resourceType, resource, note, authorAppUser, appUrl } = params;
  const ownerUserId = resource.userId;
  if (ownerUserId === note.authorUserId) return { notified: false };

  const ownerDoc = await db.collection("users").doc(ownerUserId).get();
  if (!ownerDoc.exists) return { notified: false };

  const owner = { id: ownerDoc.id, ...ownerDoc.data() } as AppUser & {
    fcmTokens?: string[];
    notifyEmail?: boolean;
    notifyPush?: boolean;
  };

  const resourceTitle = resourceTitleForNotification(resourceType, resource);
  const resourcePath = resourceUrlForNotification(resourceType, resource.id);
  const authorName =
    note.authorDisplayName?.trim() || authorAppUser.displayName?.trim() || authorAppUser.email;
  const notePreview = sharedNotePreview(note.body);

  await db.collection("notifications").add({
    type: "shared_resource_note",
    userId: ownerUserId,
    resourceType,
    resourceId: resource.id,
    resourceTitle,
    noteAuthorUserId: note.authorUserId,
    noteAuthorInitials: note.authorInitials,
    noteAuthorName: authorName,
    notePreview,
    read: false,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const recipient: NotificationRecipient = recipientFromUser(owner);
  const emailContent = buildSharedResourceNoteEmail({
    resourceType,
    resourceTitle,
    authorName,
    notePreview,
    resourceUrl: `${appUrl.replace(/\/$/, "")}${resourcePath}`,
  });
  await sendSharedResourceNoteEmails([recipient], emailContent);

  const messaging = getAdminMessaging();
  if (messaging) {
    const label = resourceType === "script" ? "script" : "scout session";
    await sendSharedResourceNotePush(messaging, [recipient], {
      title: `New note on your ${label}`,
      body: `${note.authorInitials}: ${notePreview}`,
      resourcePath,
      appUrl,
    });
  }

  return { notified: true };
}
