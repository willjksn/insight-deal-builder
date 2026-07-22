import { Firestore, FieldValue } from "firebase-admin/firestore";
import { AppUser } from "@/lib/types";
import { EMPTY_PERMISSIONS } from "@/lib/constants/permissions";
import {
  PROJECT_MEMBERS_SUBCOLLECTION,
  RESOURCE_MEMBERS_SUBCOLLECTION,
} from "@/lib/projectAccess/server";
import { isUserArchived } from "@/lib/users/approval";
import {
  canArchivePartnerUser as validateArchivePartner,
  canRemoveUserAccess as validateRemoveAccess,
} from "@/lib/users/archivePartner";

export type ArchivePartnerResult = {
  userId: string;
  projectMembershipsRemoved: number;
  resourceSharesRemoved: number;
};

export { canArchivePartnerUser } from "@/lib/users/archivePartner";

export async function removeAllProjectMembershipsForUser(
  db: Firestore,
  userId: string
): Promise<number> {
  const snap = await db
    .collectionGroup(PROJECT_MEMBERS_SUBCOLLECTION)
    .where("userId", "==", userId)
    .get();

  if (snap.empty) return 0;

  const batch = db.batch();
  snap.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
  return snap.size;
}

export async function removeAllResourceSharesForUser(
  db: Firestore,
  userId: string
): Promise<number> {
  const snap = await db
    .collectionGroup(RESOURCE_MEMBERS_SUBCOLLECTION)
    .where("userId", "==", userId)
    .get();

  if (snap.empty) return 0;

  const batch = db.batch();
  snap.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
  return snap.size;
}

export async function archivePartnerUser(
  db: Firestore,
  targetUserId: string,
  adminUserId: string
): Promise<ArchivePartnerResult> {
  const userSnap = await db.collection("users").doc(targetUserId).get();
  if (!userSnap.exists) throw new Error("User not found");

  const target = { id: userSnap.id, ...userSnap.data() } as AppUser;
  const blockReason = validateArchivePartner(target, adminUserId);
  if (blockReason) throw new Error(blockReason);

  const [projectMembershipsRemoved, resourceSharesRemoved] = await Promise.all([
    removeAllProjectMembershipsForUser(db, targetUserId),
    removeAllResourceSharesForUser(db, targetUserId),
  ]);

  await db.collection("users").doc(targetUserId).update({
    approved: false,
    permissions: { ...EMPTY_PERMISSIONS },
    role: "member",
    archivedAt: new Date().toISOString(),
    archivedByUserId: adminUserId,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return {
    userId: targetUserId,
    projectMembershipsRemoved,
    resourceSharesRemoved,
  };
}

/**
 * Remove a user's access (archive-style, reversible). Works for any non-admin
 * account, not just partners. Revokes login + permissions and removes all
 * project/resource memberships; records on agreements are kept.
 */
export async function removeUserAccess(
  db: Firestore,
  targetUserId: string,
  adminUserId: string
): Promise<ArchivePartnerResult> {
  const userSnap = await db.collection("users").doc(targetUserId).get();
  if (!userSnap.exists) throw new Error("User not found");

  const target = { id: userSnap.id, ...userSnap.data() } as AppUser;
  const blockReason = validateRemoveAccess(target, adminUserId);
  if (blockReason) throw new Error(blockReason);

  const [projectMembershipsRemoved, resourceSharesRemoved] = await Promise.all([
    removeAllProjectMembershipsForUser(db, targetUserId),
    removeAllResourceSharesForUser(db, targetUserId),
  ]);

  await db.collection("users").doc(targetUserId).update({
    approved: false,
    permissions: { ...EMPTY_PERMISSIONS },
    role: "member",
    archivedAt: new Date().toISOString(),
    archivedByUserId: adminUserId,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { userId: targetUserId, projectMembershipsRemoved, resourceSharesRemoved };
}

export async function restorePartnerUser(
  db: Firestore,
  targetUserId: string,
  adminUserId: string
): Promise<{ userId: string }> {
  const userSnap = await db.collection("users").doc(targetUserId).get();
  if (!userSnap.exists) throw new Error("User not found");

  const target = { id: userSnap.id, ...userSnap.data() } as AppUser;
  if (!isUserArchived(target)) throw new Error("This user is not archived.");
  if (target.id === adminUserId) throw new Error("You cannot restore your own account.");

  await db.collection("users").doc(targetUserId).update({
    approved: false,
    permissions: { ...EMPTY_PERMISSIONS },
    role: "member",
    archivedAt: FieldValue.delete(),
    archivedByUserId: FieldValue.delete(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { userId: targetUserId };
}
