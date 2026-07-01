import { GuideCategory, GuideSection } from "@/lib/guide/types";
import { isUserApproved } from "@/lib/users/approval";
import { AppUser } from "@/lib/types";
import { canManageUsers } from "@/lib/utils/permissions";

export function canAccessHowToUseGuide(user: AppUser | null): boolean {
  return isUserApproved(user);
}

/** @deprecated use canAccessHowToUseGuide */
export function canAccessWhatsIncluded(user: AppUser | null): boolean {
  return canAccessHowToUseGuide(user);
}

/** @deprecated use canAccessHowToUseGuide */
export function canAccessHowItWorks(user: AppUser | null): boolean {
  return canAccessHowToUseGuide(user);
}

export function filterGuideCategories(
  categories: GuideCategory[],
  user: AppUser | null
): GuideCategory[] {
  return categories
    .filter((cat) => cat.canAccess(user))
    .map((cat) => ({
      ...cat,
      sections: cat.sections.filter((s) => s.canAccess(user)),
    }))
    .filter((cat) => cat.sections.length > 0);
}

export function flatGuideSections(categories: GuideCategory[]): GuideSection[] {
  return categories.flatMap((c) => c.sections);
}

export function isGuideAdminView(user: AppUser | null): boolean {
  return canManageUsers(user);
}

export function guideAudienceLabel(user: AppUser | null): string {
  if (!user) return "Signed-in member";
  if (canManageUsers(user)) return "Admin — full guide";
  if (user.company && user.company !== "Insight Media Group LLC") {
    return `Partner — ${user.company}`;
  }
  return user.company ? `${user.company} team` : "Your role";
}
