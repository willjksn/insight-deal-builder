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
  Clapperboard,
  ScrollText,
  BookOpen,
  LayoutGrid,
  Package,
  HardDrive,
  MapPin,
  Calculator,
  BarChart3,
  CircleHelp,
  CalendarDays,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useAuth } from "@/contexts/AuthContext";
import { APP_NAME, APP_SHORT_TAGLINE } from "@/lib/brand";
import { BrandLogo } from "@/components/brand/BrandLogo";
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
} from "@/lib/utils/permissions";
import { canAccessHowToUseGuide } from "@/lib/guide/access";

type MoreNavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  canAccess?: (user: ReturnType<typeof useAuth>["appUser"]) => boolean;
};

export function MobileNav() {
  const pathname = usePathname();
  const { appUser } = useAuth();
  const showProduction = canUseProductionTools(appUser);

  const navItems = [
    { href: "/dashboard", label: "Home", icon: LayoutDashboard },
    { href: "/calendar", label: "Calendar", icon: CalendarDays },
    ...(canManageProjects(appUser)
      ? [{ href: "/projects", label: "Projects", icon: FolderKanban }]
      : []),
    ...(showProduction
      ? [
          { href: "/script-writer", label: "Script", icon: ScrollText },
          { href: "/stage", label: "Stage", icon: LayoutGrid },
          { href: "/reference", label: "Guide", icon: BookOpen },
        ]
      : []),
    { href: "/agreements", label: "Deals", icon: FileText },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  const moreItems: MoreNavItem[] = [
    { href: "/quick-quote", label: "Quick quote", icon: Calculator, canAccess: canCreateQuotes },
    { href: "/reports", label: "Reports", icon: BarChart3, canAccess: canAccessReports },
    { href: "/packages", label: "Packages", icon: Package, canAccess: canManageProjects },
    { href: "/equipment", label: "Equipment", icon: HardDrive, canAccess: canManageProjects },
    { href: "/locations", label: "Locations", icon: MapPin, canAccess: canManageProjects },
    { href: "/companies", label: "Companies", icon: Building2, canAccess: canManageCompanies },
    { href: "/clients", label: "Clients", icon: Users, canAccess: canManageClients },
    { href: "/crew", label: "Crew", icon: UserCircle, canAccess: canManageCrew },
    { href: "/templates", label: "Templates", icon: FileStack, canAccess: canManageTemplates },
    { href: "/admin", label: "Admin", icon: Shield, canAccess: canManageUsers },
    { href: "/how-to-use", label: "How to use", icon: CircleHelp, canAccess: canAccessHowToUseGuide },
  ];

  const visibleMoreItems = moreItems.filter(
    (item) => !item.canAccess || item.canAccess(appUser)
  );

  return (
    <>
      <header className="safe-area-pt lg:hidden sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-md shadow-sm">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <BrandLogo variant="icon" className="h-9 w-9 shrink-0" />
              <div className="min-w-0">
              <h1 className="truncate text-base font-bold text-slate-900">{APP_NAME}</h1>
              <p className="truncate text-[10px] font-medium text-sky-700/90">{APP_SHORT_TAGLINE}</p>
              </div>
            </div>
          </div>
          {visibleMoreItems.length > 0 ? (
            <nav className="mt-2 flex gap-1 overflow-x-auto pb-1 scrollbar-none">
              {visibleMoreItems.map((item) => {
                const Icon = item.icon;
                const active = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold transition-colors",
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
          ) : null}
        </div>
      </header>

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/80 bg-white/95 backdrop-blur-md safe-area-pb shadow-[0_-4px_20px_rgba(15,23,42,0.06)]">
        <div className="flex items-center justify-around px-1 py-2 overflow-x-auto scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex shrink-0 flex-col items-center gap-0.5 rounded-xl px-2 py-2 min-w-[52px] min-h-[52px] justify-center transition-colors",
                  active ? "text-sky-600" : "text-slate-400"
                )}
              >
                <Icon className={cn("h-5 w-5", active && "stroke-[2.5]")} />
                <span className="text-[9px] font-semibold">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
