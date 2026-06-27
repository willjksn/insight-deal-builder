import {
  EMPTY_PERMISSIONS,
  FULL_IMG_PERMISSIONS,
  PermissionKey,
} from "@/lib/constants/permissions";
import { AppUser, UserPermissions, UserRole } from "@/lib/types";

export const INSIGHT_MEDIA_GROUP_LLC = "Insight Media Group LLC";

export function isPartnerOriginatedClient(clientOriginated?: string): boolean {
  if (!clientOriginated) return false;
  if (clientOriginated === "Joint" || clientOriginated === "Other") return false;
  return clientOriginated !== INSIGHT_MEDIA_GROUP_LLC;
}

/** Legacy docs: role admin + IMG company → full permissions */
export function isLegacyInsightAdmin(user: AppUser | null | undefined): boolean {
  if (!user) return false;
  return user.role === "admin" && user.company === INSIGHT_MEDIA_GROUP_LLC;
}

export function isInsightOrgUser(user: AppUser | null | undefined): boolean {
  return user?.company === INSIGHT_MEDIA_GROUP_LLC;
}

export function isPartnerOrgUser(user: AppUser | null | undefined): boolean {
  if (!user?.company) return false;
  return user.company !== INSIGHT_MEDIA_GROUP_LLC;
}

export function resolvePermissions(user: AppUser | null | undefined): UserPermissions {
  if (!user) return { ...EMPTY_PERMISSIONS };
  if (isLegacyInsightAdmin(user)) return { ...FULL_IMG_PERMISSIONS };
  return { ...EMPTY_PERMISSIONS, ...user.permissions };
}

export function hasPermission(
  user: AppUser | null | undefined,
  key: PermissionKey
): boolean {
  return resolvePermissions(user)[key];
}

export function canManageUsers(user: AppUser | null | undefined): boolean {
  return hasPermission(user, "manageUsers") || isLegacyInsightAdmin(user);
}

/** @deprecated use hasPermission(user, key) */
export function isInsightAdmin(user: AppUser | null | undefined): boolean {
  return canManageUsers(user);
}

export function canCreateQuotes(user: AppUser | null | undefined): boolean {
  return hasPermission(user, "createQuotes");
}

export function canEditQuotes(user: AppUser | null | undefined): boolean {
  return hasPermission(user, "editQuotes");
}

export function canDeleteQuotes(user: AppUser | null | undefined): boolean {
  return hasPermission(user, "deleteQuotes");
}

export function canDuplicateQuotes(user: AppUser | null | undefined): boolean {
  return hasPermission(user, "duplicateQuotes");
}

export function canSignQuotes(user: AppUser | null | undefined): boolean {
  return hasPermission(user, "signQuotes");
}

export function canDownloadPdf(user: AppUser | null | undefined): boolean {
  return hasPermission(user, "downloadPdf");
}

export function canEmailQuotes(user: AppUser | null | undefined): boolean {
  return hasPermission(user, "emailQuotes");
}

export function canViewAllOrgDeals(user: AppUser | null | undefined): boolean {
  return hasPermission(user, "viewAllOrgDeals") || canManageUsers(user);
}

export function canManageClients(user: AppUser | null | undefined): boolean {
  return isInsightOrgUser(user) && hasPermission(user, "manageClients");
}

export function canManageCompanies(user: AppUser | null | undefined): boolean {
  return isInsightOrgUser(user) && hasPermission(user, "manageCompanies");
}

export function canManageCrew(user: AppUser | null | undefined): boolean {
  return isInsightOrgUser(user) && hasPermission(user, "manageCrew");
}

export function canManageProjects(user: AppUser | null | undefined): boolean {
  return isInsightOrgUser(user) && hasPermission(user, "manageProjects");
}

export function canManageTemplates(user: AppUser | null | undefined): boolean {
  return isInsightOrgUser(user) && hasPermission(user, "manageTemplates");
}

export function canDeleteTemplates(user: AppUser | null | undefined): boolean {
  return isInsightOrgUser(user) && hasPermission(user, "deleteTemplates");
}

export function canLoadDemoData(user: AppUser | null | undefined): boolean {
  return isInsightOrgUser(user) && hasPermission(user, "loadDemoData");
}

export function canViewIdentityDocs(user: AppUser | null | undefined): boolean {
  return isInsightOrgUser(user) && (hasPermission(user, "viewIdentityDocs") || canManageUsers(user));
}

export function canCaptureIdentityDocs(user: AppUser | null | undefined): boolean {
  return (
    isInsightOrgUser(user) &&
    (canViewIdentityDocs(user) || hasPermission(user, "signQuotes") || hasPermission(user, "editQuotes"))
  );
}

/** Any permission that allows changing app data */
export function hasAnyWritePermission(user: AppUser | null | undefined): boolean {
  const p = resolvePermissions(user);
  return Object.values(p).some(Boolean);
}

export function canReadInsightData(user: AppUser | null | undefined): boolean {
  if (!isInsightOrgUser(user)) return false;
  return (
    canManageUsers(user) ||
    canManageClients(user) ||
    canManageCompanies(user) ||
    canManageCrew(user) ||
    canManageProjects(user) ||
    canCreateQuotes(user) ||
    canEditQuotes(user)
  );
}

/** @deprecated use specific permission helpers */
export function canWrite(user: AppUser | null | undefined): boolean {
  return canCreateQuotes(user) || canEditQuotes(user) || canManageUsers(user);
}

/** @deprecated use canDeleteQuotes or canDeleteTemplates */
export function canDelete(user: AppUser | null | undefined): boolean {
  return canDeleteQuotes(user) || canManageUsers(user);
}

export function canSeeAllAgreements(user: AppUser | null | undefined): boolean {
  return canManageUsers(user) || isLegacyInsightAdmin(user);
}

/** @deprecated use canDelete(user) */
export function canDeleteRole(role: UserRole): boolean {
  return role === "admin";
}

/** @deprecated use canDeleteTemplates(user) */
export function canDeleteTemplatesRole(role: UserRole): boolean {
  return role === "admin";
}

/** @deprecated use canManageUsers(user) */
export function canManageUsersRole(role: UserRole): boolean {
  return role === "admin";
}
