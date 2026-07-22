"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { APP_SHORT_TAGLINE } from "@/lib/brand";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { LegalFooterLinks } from "@/components/legal/LegalFooterLinks";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import {
  canCreateQuotes,
  canManageProjects,
  canUseProductionTools,
} from "@/lib/utils/permissions";
import {
  NavItem,
  getVisibleNavGroups,
  isNavItemActive,
} from "@/lib/navigation/navConfig";

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
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
  const { workspace } = useWorkspace();

  const visibleGroups = getVisibleNavGroups(workspace, appUser);

  return (
    <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-slate-900 text-white shadow-xl shadow-slate-900/20">
      <div className="flex flex-col flex-1 min-h-0">
        <div className="px-6 py-6 border-b border-slate-700/80">
          <div className="mb-3 inline-flex rounded-lg border border-slate-600/60 bg-slate-200/90 px-3 py-2 shadow-sm">
            <BrandLogo variant="full" className="h-8 w-auto max-w-[180px]" priority />
          </div>
          <p className="text-[11px] text-slate-400 leading-snug">{APP_SHORT_TAGLINE}</p>
        </div>

        <div className="px-4 pt-4">
          <WorkspaceSwitcher variant="sidebar" />
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
                    active={isNavItemActive(item, pathname)}
                  />
                ))}
              </div>
            </div>
          ))}
          {!canManageProjects(appUser) &&
          !canUseProductionTools(appUser) &&
          !canCreateQuotes(appUser) ? (
            <p className="mx-3 rounded-lg border border-slate-700/80 bg-slate-800/60 px-3 py-2 text-[11px] leading-snug text-slate-400">
              Limited access — open <span className="text-slate-300">Projects</span> for jobs you
              were added to. Ask an admin if Coverage or call sheet is missing.
            </p>
          ) : null}
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
          <div className="mb-3 px-2">
            <LegalFooterLinks
              linkClassName="text-xs text-slate-500 hover:text-slate-300 transition-colors"
            />
          </div>
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
