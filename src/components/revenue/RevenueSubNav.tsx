"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { REVENUE_NAV_ITEMS } from "@/lib/revenueOpportunities/nav";
import { cn } from "@/lib/utils/cn";

export function RevenueSubNav() {
  const pathname = usePathname();
  const activeRef = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: "smooth", inline: "nearest", block: "nearest" });
  }, [pathname]);

  return (
    <nav
      className="mb-6 rounded-xl border border-slate-200 bg-white p-2 shadow-sm"
      aria-label="Revenue and opportunities"
    >
      <ul className="flex flex-wrap gap-1">
        {REVENUE_NAV_ITEMS.map((item) => {
          const active =
            item.href === "/revenue"
              ? pathname === "/revenue"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                ref={active ? activeRef : undefined}
                href={item.href}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium whitespace-nowrap transition",
                  active
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
