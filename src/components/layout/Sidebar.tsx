"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  LogOut,
  Shield,
  BarChart3,
  Clapperboard,
  ScrollText,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useAuth } from "@/contexts/AuthContext";
import {
  APP_NAME,
  APP_SHORT_TAGLINE,
} from "@/lib/brand";
import {
  canCreateQuotes,
  canManageClients,
  canManageCompanies,
  canManageCrew,
  canManageProjects,
  canManageTemplates,
  canManageUsers,
  canAccessReports,
  canUseShotScout,
} from "@/lib/utils/permissions";
import { AppUser } from "@/lib/types";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  canAccess?: (user: AppUser | null) => boolean;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [{ href: "/dashboard", label: "Command center", icon: LayoutDashboard }],
  },
  {
    label: "Production",
    items: [
      {
        href: "/projects",
        label: "Projects",
        icon: FolderKanban,
        canAccess: canManageProjects,
      },
      {
        href: "/script-writer",
        label: "Script writer",
        icon: ScrollText,
        canAccess: canUseShotScout,
      },
      {
        href: "/scout",
        label: "Shot Scout",
        icon: Clapperboard,
        canAccess: canUseShotScout,
      },
    ],
  },
  {
    label: "Business",
    items: [
      { href: "/agreements", label: "Agreements", icon: FileText },
      {
        href: "/templates",
        label: "Templates",
        icon: FileStack,
        canAccess: canManageTemplates,
      },
      {
        href: "/reports",
        label: "Reports",
        icon: BarChart3,
        canAccess: canAccessReports,
      },
    ],
  },
  {
    label: "Catalogs",
    items: [
      {
        href: "/companies",
        label: "Companies",
        icon: Building2,
        canAccess: canManageCompanies,
      },
      {
        href: "/clients",
        label: "Clients",
        icon: Users,
        canAccess: canManageClients,
      },
      {
        href: "/crew",
        label: "Crew",
        icon: UserCircle,
        canAccess: canManageCrew,
      },
      {
        href: "/packages",
        label: "Packages",
        icon: Package,
        canAccess: canManageProjects,
      },
      {
        href: "/equipment",
        label: "Equipment",
        icon: HardDrive,
        canAccess: canManageProjects,
      },
      {
        href: "/locations",
        label: "Locations",
        icon: MapPin,
        canAccess: canManageProjects,
      },
    ],
  },
];

function NavLink({
  item,
  active,
}: {
  item: NavItem;
  active: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
        active
          ? "bg-slate-800 text-white shadow-inner ring-1 ring-sky-400/30"
          : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
      )}
    >
      <Icon className={cn("h-5 w-5 shrink-0", active && "text-sky-400")} />
      {item.label}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { appUser, signOut } = useAuth();

  const visibleGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.canAccess || item.canAccess(appUser)),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-slate-900 text-white shadow-xl shadow-slate-900/20">
      <div className="flex flex-col flex-1 min-h-0">
        <div className="px-6 py-6 border-b border-slate-700/80">
          <div className="mb-3 h-1 w-8 rounded-full bg-gradient-to-r from-sky-400 to-violet-500" />
          <h1 className="text-lg font-bold tracking-tight leading-tight">{APP_NAME}</h1>
          <p className="mt-1.5 text-[11px] text-slate-400 leading-snug">{APP_SHORT_TAGLINE}</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
          {visibleGroups.map((group) => (
            <div key={group.label}>
              <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.href}
                    item={item}
                    active={
                      item.href === "/dashboard"
                        ? pathname === "/dashboard"
                        : pathname.startsWith(item.href)
                    }
                  />
                ))}
              </div>
            </div>
          ))}

          <div>
            <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              System
            </p>
            <div className="space-y-0.5">
              <NavLink item={{ href: "/settings", label: "Settings", icon: Settings }} active={pathname.startsWith("/settings")} />
              {canManageUsers(appUser) ? (
                <NavLink item={{ href: "/admin", label: "Admin", icon: Shield }} active={pathname.startsWith("/admin")} />
              ) : null}
            </div>
          </div>
        </nav>

        <div className="border-t border-slate-700 p-4">
          {appUser && (
            <div className="mb-3 px-2">
              <p className="text-sm font-medium truncate">{appUser.displayName}</p>
              <p className="text-xs text-slate-400 truncate">
                {appUser.company || "No organization"}
                {canCreateQuotes(appUser) ? " · can create quotes" : ""}
              </p>
            </div>
          )}
          <button
            onClick={() => signOut()}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <LogOut className="h-5 w-5" />
            Sign Out
          </button>
        </div>
      </div>
    </aside>
  );
}
