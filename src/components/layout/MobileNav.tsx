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
  Settings,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useAuth } from "@/contexts/AuthContext";
import {
  canManageClients,
  canManageCompanies,
  canManageCrew,
  canManageProjects,
  canManageTemplates,
  canManageUsers,
} from "@/lib/utils/permissions";

const navItems = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderKanban, canAccess: canManageProjects },
  { href: "/agreements", label: "Agreements", icon: FileText },
  { href: "/clients", label: "Clients", icon: Users, canAccess: canManageClients },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();
  const { appUser } = useAuth();

  const visibleNavItems = navItems.filter(
    (item) => !("canAccess" in item && item.canAccess) || item.canAccess!(appUser)
  );

  const visibleMoreItems = [
    { href: "/companies", label: "Companies", icon: Building2, canAccess: canManageCompanies },
    { href: "/crew", label: "Crew", icon: UserCircle, canAccess: canManageCrew },
    { href: "/templates", label: "Templates", icon: FileStack, canAccess: canManageTemplates },
    { href: "/admin", label: "Admin", icon: Shield, canAccess: canManageUsers },
  ].filter((item) => !item.canAccess || item.canAccess(appUser));

  return (
    <>
      <header className="lg:hidden sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur-md shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-slate-900">Insight Deal Builder</h1>
            <p className="text-xs text-sky-600/90 font-medium">Production Agreements</p>
          </div>
          <nav className="hidden md:flex items-center gap-1">
            {visibleMoreItems.map((item) => {
              const Icon = item.icon;
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors",
                    active
                      ? "bg-sky-50 text-sky-900 ring-1 ring-sky-200"
                      : "text-slate-500 hover:bg-slate-100"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/80 bg-white/95 backdrop-blur-md safe-area-pb shadow-[0_-4px_20px_rgba(15,23,42,0.06)]">
        <div className="flex items-center justify-around px-2 py-2">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-xl px-3 py-2 min-w-[64px] min-h-[52px] justify-center transition-colors",
                  active ? "text-sky-600" : "text-slate-400"
                )}
              >
                <Icon className={cn("h-6 w-6", active && "stroke-[2.5]")} />
                <span className="text-[10px] font-semibold">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
