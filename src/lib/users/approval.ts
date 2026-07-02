import { AppUser, UserPermissions } from "@/lib/types";
import { canManageUsers, isLegacyInsightAdmin } from "@/lib/utils/permissions";

export function isUserArchived(user: AppUser | null | undefined): boolean {
  if (!user?.archivedAt) return false;
  return true;
}

/** Legacy profiles without `approved` are treated as already approved. */
export function isUserApproved(user: AppUser | null | undefined): boolean {
  if (!user) return false;
  if (isUserArchived(user)) return false;
  if (canManageUsers(user) || isLegacyInsightAdmin(user)) return true;
  if (user.approved === false) return false;
  return true;
}

export function isUserPendingApproval(user: AppUser | null | undefined): boolean {
  if (!user) return false;
  if (isUserArchived(user)) return false;
  return !isUserApproved(user);
}

/** Admin save approves when company and at least one permission are assigned. */
export function shouldApproveOnAdminSave(company: string, permissions: UserPermissions): boolean {
  return company.trim().length > 0 && Object.values(permissions).some(Boolean);
}
