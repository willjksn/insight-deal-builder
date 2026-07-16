"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { REVENUE_NAV_ITEMS } from "@/lib/revenueOpportunities/nav";
import { cn } from "@/lib/utils/cn";

export function RevenueSubNav() {
  const pathname = usePathname();

  return (
    <nav
      className="mb-6 overflow-x-auto rounded-xl border border-slate-200 bg-white p-2 shadow-sm"
      aria-label="Revenue and opportunities"
    >
      <ul className="flex min-w-max gap-1">
        {REVENUE_NAV_ITEMS.map((item) => {
          const active =
            item.href === "/revenue"
              ? pathname === "/revenue"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium whitespace-nowrap transition",
                  active
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
