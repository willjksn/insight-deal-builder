import { AppUser } from "@/lib/types";
import { INSIGHT_MEDIA_GROUP_LLC, resolvePermissions } from "@/lib/utils/permissions";
import { isUserArchived } from "@/lib/users/approval";

export function canArchivePartnerUser(target: AppUser, adminUserId: string): string | null {
  if (target.id === adminUserId) return "You cannot archive your own account.";
  if (isUserArchived(target)) return "This user is already archived.";
  if (!target.company || target.company === INSIGHT_MEDIA_GROUP_LLC) {
    return "Only external partner accounts can be archived from here.";
  }
  if (resolvePermissions(target).manageUsers) {
    return "Cannot archive an account with user-management permission.";
  }
  return null;
}

export function canRestorePartnerUser(target: AppUser, adminUserId: string): string | null {
  if (target.id === adminUserId) return "You cannot restore your own account.";
  if (!isUserArchived(target)) return "This user is not archived.";
  return null;
}
