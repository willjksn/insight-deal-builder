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
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useAuth } from "@/contexts/AuthContext";
import {
  canCreateQuotes,
  canManageClients,
  canManageCompanies,
  canManageCrew,
  canManageProjects,
  canManageTemplates,
  canManageUsers,
} from "@/lib/utils/permissions";
import { AppUser } from "@/lib/types";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  canAccess?: (user: AppUser | null) => boolean;
};

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
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
    href: "/projects",
    label: "Projects",
    icon: FolderKanban,
    canAccess: canManageProjects,
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
  { href: "/agreements", label: "Agreements", icon: FileText },
  {
    href: "/templates",
    label: "Templates",
    icon: FileStack,
    canAccess: canManageTemplates,
  },
  { href: "/settings", label: "Settings", icon: Settings },
  {
    href: "/admin",
    label: "Admin",
    icon: Shield,
    canAccess: canManageUsers,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { appUser, signOut } = useAuth();
  const visibleNavItems = navItems.filter(
    (item) => !item.canAccess || item.canAccess(appUser)
  );

  return (
    <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-slate-900 text-white shadow-xl shadow-slate-900/20">
      <div className="flex flex-col flex-1 min-h-0">
        <div className="px-6 py-6 border-b border-slate-700/80">
          <div className="mb-3 h-1 w-8 rounded-full bg-gradient-to-r from-sky-400 to-blue-500" />
          <h1 className="text-lg font-bold tracking-tight">Insight Deal Builder</h1>
          <p className="mt-1 text-xs text-slate-400 leading-snug">
            Production Agreements, Payouts, Gear Use, and Client Sign-Offs
          </p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
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
          })}
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
