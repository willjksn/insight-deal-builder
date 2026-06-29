import {
  EMPTY_PROJECT_ACCESS,
  FULL_PROJECT_ACCESS,
  ProjectAccessArea,
  ProjectAccessPermissions,
  ProjectMember,
} from "@/lib/projectAccess/types";
import { AppUser } from "@/lib/types";
import { canManageProjects, canManageUsers } from "@/lib/utils/permissions";

export function hasGlobalProjectAdmin(appUser: AppUser | null | undefined): boolean {
  if (!appUser) return false;
  return canManageProjects(appUser) || canManageUsers(appUser);
}

export function effectiveProjectPermissions(
  appUser: AppUser | null | undefined,
  member: ProjectMember | null | undefined,
  isOwner: boolean
): ProjectAccessPermissions {
  if (hasGlobalProjectAdmin(appUser) || isOwner) return { ...FULL_PROJECT_ACCESS };
  return member?.permissions ?? { ...EMPTY_PROJECT_ACCESS };
}

export function canAccessProjectArea(
  appUser: AppUser | null | undefined,
  member: ProjectMember | null | undefined,
  isOwner: boolean,
  area: ProjectAccessArea
): boolean {
  return effectiveProjectPermissions(appUser, member, isOwner)[area];
}

export function canManageProjectTeamClient(
  appUser: AppUser | null | undefined,
  ownerUserId: string | undefined,
  uid: string | undefined
): boolean {
  if (!appUser || !uid) return false;
  if (hasGlobalProjectAdmin(appUser)) return true;
  return ownerUserId === uid;
}
