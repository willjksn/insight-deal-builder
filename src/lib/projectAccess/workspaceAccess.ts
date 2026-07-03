import { AppUser } from "@/lib/types";
import { INSIGHT_MEDIA_GROUP_LLC, isPartnerOrgUser } from "@/lib/utils/permissions";

export type WorkspaceResourceType = "script";

export interface WorkspaceAccessOptions {
  /** Deliberate admin open (Option A — IMG internal owners only). */
  adminOpen?: boolean;
}

/** Option B — partner private workspace: no admin bypass unless shared/linked. */
export function canAdminOpenPrivateWorkspace(ownerCompany: string | undefined): boolean {
  if (!ownerCompany) return false;
  return ownerCompany === INSIGHT_MEDIA_GROUP_LLC;
}

export function isPartnerOrgUserByCompany(company: string | undefined): boolean {
  if (!company) return false;
  return company !== INSIGHT_MEDIA_GROUP_LLC;
}

export function ownerSummaryLabel(
  displayName: string | undefined,
  email: string,
  company: string | undefined
): string {
  const name = displayName?.trim() || email;
  if (company && company !== INSIGHT_MEDIA_GROUP_LLC) {
    return `${name} · ${company}`;
  }
  if (company === INSIGHT_MEDIA_GROUP_LLC) {
    return `${name} · IMG`;
  }
  return name;
}

export function workspaceOwnerKind(company: string | undefined): "img" | "partner" | "unknown" {
  if (!company) return "unknown";
  if (company === INSIGHT_MEDIA_GROUP_LLC) return "img";
  return "partner";
}

export function isInsightOrgAppUser(user: AppUser | null | undefined): boolean {
  return !isPartnerOrgUser(user);
}

export type WorkspaceListItem = {
  id: string;
  title: string;
  resourceType: WorkspaceResourceType;
  updatedAt?: unknown;
  linkedProjectId?: string | null;
  status?: string;
};
