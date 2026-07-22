"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { APP_NAME } from "@/lib/brand";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { getMobileNav, isNavItemActive } from "@/lib/navigation/navConfig";

export function MobileNav() {
  const pathname = usePathname();
  const { appUser } = useAuth();
  const { workspace } = useWorkspace();

  const { primary, more } = getMobileNav(workspace, appUser);

  return (
    <>
      <header className="safe-area-pt lg:hidden sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-md shadow-sm">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <BrandLogo variant="icon" className="h-9 w-9 shrink-0" />
              <div className="min-w-0">
                <h1 className="truncate text-base font-bold text-slate-900">{APP_NAME}</h1>
              </div>
            </div>
            <WorkspaceSwitcher variant="mobile" className="w-[188px] shrink-0" />
          </div>
          {more.length > 0 ? (
            <nav className="mt-2 flex gap-1 overflow-x-auto pb-1 scrollbar-none">
              {more.map((item) => {
                const Icon = item.icon;
                const active = isNavItemActive(item, pathname);
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
          {primary.map((item) => {
            const Icon = item.icon;
            const active = isNavItemActive(item, pathname);
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
