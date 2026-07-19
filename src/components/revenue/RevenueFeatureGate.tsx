"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import {
  canAccessRevenueOpportunities,
  isRevenueOpportunitiesFeatureEnabled,
} from "@/lib/utils/permissions";

export function RevenueFeatureGate({ children }: { children: ReactNode }) {
  const { appUser } = useAuth();
  const enabled = isRevenueOpportunitiesFeatureEnabled();
  const allowed = canAccessRevenueOpportunities(appUser);

  if (!enabled) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
        <h2 className="text-lg font-semibold text-slate-900">Revenue & opportunities is disabled</h2>
        <p className="mt-2 text-sm text-slate-600">
          Revenue is off by default so the shoot spine stays focused. Set{" "}
          <code className="text-xs">REVENUE_OPPORTUNITIES_ENABLED</code> is set to{" "}
          <code className="text-xs">false</code>. Remove it or set{" "}
          <code className="text-xs">true</code> to enable.
        </p>
        <Link href="/dashboard" className="mt-4 inline-block text-sm font-medium text-sky-700 hover:underline">
          Back to command center
        </Link>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <h2 className="text-lg font-semibold text-slate-900">Access required</h2>
        <p className="mt-2 text-sm text-slate-600">
          Revenue & opportunities requires Insight Media Group permissions. Ask an admin to grant access.
        </p>
        <Link href="/dashboard" className="mt-4 inline-block text-sm font-medium text-sky-700 hover:underline">
          Back to command center
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
