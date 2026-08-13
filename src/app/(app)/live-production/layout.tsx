"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  canAccessRevenueOpportunities,
  isRevenueOpportunitiesFeatureEnabled,
} from "@/lib/utils/permissions";
import { cn } from "@/lib/utils/cn";

const LINKS = [
  { href: "/live-production", label: "Inbox", exact: true },
  { href: "/live-production/new", label: "Add opportunity" },
];

export default function LiveProductionLayout({ children }: { children: ReactNode }) {
  const { appUser } = useAuth();
  const pathname = usePathname();
  const allowed =
    isRevenueOpportunitiesFeatureEnabled() && canAccessRevenueOpportunities(appUser);

  if (!allowed) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600">
        Live Production Opportunities is available to users with Revenue & opportunities access.
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <nav className="mb-4 flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {LINKS.map((link) => {
          const active = link.exact
            ? pathname === link.href
            : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium",
                active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
}
