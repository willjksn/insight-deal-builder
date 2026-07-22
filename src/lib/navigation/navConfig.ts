import {
  LayoutDashboard,
  Building2,
  Users,
  UserCircle,
  FolderKanban,
  FileText,
  FileStack,
  HardDrive,
  MapPin,
  Package,
  Settings,
  Shield,
  ScrollText,
  Calculator,
  BookOpen,
  CircleHelp,
  CalendarDays,
  Lightbulb,
  TrendingUp,
  LayoutGrid,
} from "lucide-react";
import { AppUser } from "@/lib/types";
import { Workspace } from "@/lib/workspace/types";
import {
  canCreateQuotes,
  canManageClients,
  canManageCompanies,
  canManageCrew,
  canManageProjects,
  canManageTemplates,
  canManageUsers,
  canAccessReports,
  canUseProductionTools,
  canAccessRevenueOpportunities,
  isRevenueOpportunitiesFeatureEnabled,
} from "@/lib/utils/permissions";
import { isContentIdeasNavEnabled } from "@/lib/contentIdeas/navFlag";
import { canAccessHowToUseGuide } from "@/lib/guide/access";

export type NavIcon = typeof LayoutDashboard;

/** A workspace-scoped tag. "shared" groups appear in every workspace. */
export type NavScope = Workspace | "shared";

export type NavItem = {
  href: string;
  label: string;
  icon: NavIcon;
  canAccess?: (user: AppUser | null) => boolean;
  /** Active only on an exact pathname match (e.g. /dashboard). */
  exact?: boolean;
  /** Extra pathname prefixes that should also mark this item active. */
  activePrefixes?: string[];
};

export type NavGroup = {
  label: string;
  scope: NavScope;
  items: NavItem[];
};

const contentIdeasAccess = (user: AppUser | null) =>
  isContentIdeasNavEnabled() && canUseProductionTools(user);

const revenueAccess = (user: AppUser | null) =>
  isRevenueOpportunitiesFeatureEnabled() && canAccessRevenueOpportunities(user);

/**
 * Single source of truth for the app sidebar + mobile nav, tagged by workspace.
 * Items only list routes that exist today; net-new v2 destinations (Meetings,
 * Recordings, Contacts, Follow-Ups, Deliverables, Client Approvals) are added in
 * their respective later phases.
 */
export const NAV_GROUPS: NavGroup[] = [
  // ---- Shared across both workspaces --------------------------------------
  {
    label: "Overview",
    scope: "shared",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
      { href: "/calendar", label: "Calendar", icon: CalendarDays },
    ],
  },

  // ---- Business workspace --------------------------------------------------
  {
    label: "Revenue",
    scope: "business",
    items: [
      {
        href: "/revenue",
        label: "Revenue & opportunities",
        icon: TrendingUp,
        canAccess: revenueAccess,
      },
      { href: "/quick-quote", label: "Quick quote", icon: Calculator, canAccess: canCreateQuotes },
      { href: "/agreements", label: "Agreements", icon: FileText },
      { href: "/templates", label: "Templates", icon: FileStack, canAccess: canManageTemplates },
      { href: "/reports", label: "Business reports", icon: FileStack, canAccess: canAccessReports },
    ],
  },
  {
    label: "Relationships",
    scope: "business",
    items: [
      { href: "/companies", label: "Companies", icon: Building2, canAccess: canManageCompanies },
      { href: "/clients", label: "Clients", icon: Users, canAccess: canManageClients },
    ],
  },

  // ---- Production workspace ------------------------------------------------
  {
    label: "Production",
    scope: "production",
    items: [
      { href: "/projects", label: "Projects", icon: FolderKanban },
      { href: "/script-writer", label: "Script writer", icon: ScrollText, canAccess: canUseProductionTools },
      { href: "/stage", label: "Stage planner", icon: LayoutGrid, canAccess: canUseProductionTools },
      { href: "/reference", label: "Reference guide", icon: BookOpen, canAccess: canUseProductionTools },
    ],
  },
  {
    label: "Content development",
    scope: "production",
    items: [
      { href: "/content", label: "Weekly idea engine", icon: Lightbulb, canAccess: contentIdeasAccess, activePrefixes: ["/content/ideas"] },
      { href: "/content/profiles", label: "Brand profiles", icon: UserCircle, canAccess: contentIdeasAccess },
      { href: "/content/ideas/bank", label: "Saved ideas", icon: FileText, canAccess: contentIdeasAccess },
    ],
  },
  {
    label: "Catalogs",
    scope: "production",
    items: [
      { href: "/crew", label: "Crew", icon: UserCircle, canAccess: canManageCrew },
      { href: "/packages", label: "Packages", icon: Package, canAccess: canManageProjects },
      { href: "/equipment", label: "Equipment", icon: HardDrive, canAccess: canManageProjects },
      { href: "/locations", label: "Locations", icon: MapPin, canAccess: canManageProjects },
    ],
  },

  // ---- Shared system group -------------------------------------------------
  {
    label: "System",
    scope: "shared",
    items: [
      { href: "/settings", label: "Settings", icon: Settings, exact: true },
      {
        href: "/admin",
        label: "Admin",
        icon: Shield,
        canAccess: (user) => canManageUsers(user) || canManageProjects(user),
      },
      { href: "/how-to-use", label: "How to use", icon: CircleHelp, canAccess: canAccessHowToUseGuide },
    ],
  },
];

/** True when the group belongs in the given workspace. */
export function isGroupInWorkspace(group: NavGroup, workspace: Workspace): boolean {
  return group.scope === "shared" || group.scope === workspace;
}

/** Groups for a workspace, with items filtered by the user's access. Empty groups dropped. */
export function getVisibleNavGroups(
  workspace: Workspace,
  user: AppUser | null
): NavGroup[] {
  return NAV_GROUPS.filter((group) => isGroupInWorkspace(group, workspace))
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.canAccess || item.canAccess(user)),
    }))
    .filter((group) => group.items.length > 0);
}

/** Shared active-route detection used by both desktop and mobile nav. */
export function isNavItemActive(item: NavItem, pathname: string): boolean {
  if (item.exact) return pathname === item.href;
  if (pathname === item.href || pathname.startsWith(`${item.href}/`)) return true;
  return (item.activePrefixes ?? []).some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

/**
 * Mobile navigation for a workspace: a short primary bottom bar plus the rest in
 * a scrollable "more" strip. Derived from the same config so it never drifts.
 */
export function getMobileNav(
  workspace: Workspace,
  user: AppUser | null
): { primary: NavItem[]; more: NavItem[] } {
  const groups = getVisibleNavGroups(workspace, user);
  const overview = groups.find((g) => g.label === "Overview")?.items ?? [];
  const system = groups.find((g) => g.label === "System")?.items ?? [];
  const settings = system.find((i) => i.href === "/settings");

  const dashboard = overview.find((i) => i.href === "/dashboard");
  const workspaceItems = groups
    .filter((g) => g.scope === workspace)
    .flatMap((g) => g.items);

  const primary: NavItem[] = [];
  if (dashboard) primary.push(dashboard);
  for (const item of workspaceItems) {
    if (primary.length >= 4) break;
    primary.push(item);
  }
  if (settings) primary.push(settings);

  const primaryHrefs = new Set(primary.map((i) => i.href));
  const more = groups
    .flatMap((g) => g.items)
    .filter((i) => !primaryHrefs.has(i.href));

  return { primary, more };
}
