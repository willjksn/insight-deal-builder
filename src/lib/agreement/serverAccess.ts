import { getAdminDb } from "@/lib/firebase/admin";
import { userCanAccessAgreement } from "@/lib/agreement/access";
import { canManageUsers } from "@/lib/utils/permissions";
import { Agreement, AppUser } from "@/lib/types";

export function assertCanAccessAgreement(appUser: AppUser, agreement: Agreement): void {
  const isAdmin = canManageUsers(appUser);
  if (
    !userCanAccessAgreement(
      agreement.accessKeys,
      appUser.email,
      appUser.company,
      isAdmin
    )
  ) {
    throw new Error("Not authorized to access this agreement");
  }
}

export async function loadAgreementForUser(
  agreementId: string,
  appUser: AppUser
): Promise<Agreement> {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin is not configured");

  const snap = await db.collection("agreements").doc(agreementId).get();
  if (!snap.exists) throw new Error("Agreement not found");

  const agreement = { id: snap.id, ...snap.data() } as Agreement;
  assertCanAccessAgreement(appUser, agreement);
  return agreement;
}
