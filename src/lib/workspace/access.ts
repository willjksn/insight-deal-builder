import { AppUser } from "@/lib/types";
import { canUseProductionTools } from "@/lib/utils/permissions";
import { Workspace } from "./types";

/**
 * Both workspaces are always available in the shell — each one filters its own
 * navigation by permission, so a user never loses access to a record they can
 * reach (e.g. a partner who can only open Projects + Agreements still sees both
 * a Production tab with Projects and a Business tab with Agreements).
 *
 * These helpers exist so future phases can gate the switcher if the product
 * decides to hide an empty workspace for a given role.
 */
export function canAccessProductionWorkspace(): boolean {
  return true;
}

export function canAccessBusinessWorkspace(): boolean {
  return true;
}

/**
 * Default landing workspace before the user has explicitly chosen one.
 * Inferred from permissions: production-tool users land in Production, everyone
 * else lands in Business (revenue / agreements are the broadest-access modules).
 */
export function defaultWorkspaceForUser(user: AppUser | null | undefined): Workspace {
  return canUseProductionTools(user) ? "production" : "business";
}
