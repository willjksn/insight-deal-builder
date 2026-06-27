"use client";

import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { InfoCallout, PageSection } from "@/components/ui/PageSection";
import { useAuth } from "@/contexts/AuthContext";
import { canAccessReports } from "@/lib/utils/permissions";
import { AdminAnalytics } from "@/components/admin/AdminAnalytics";
import { AdminPartnerAgreements } from "@/components/admin/AdminPartnerAgreements";
import { BarChart3, Download, Users } from "lucide-react";

export default function ReportsPage() {
  const { appUser } = useAuth();
  const allowed = canAccessReports(appUser);

  if (!allowed) {
    return (
      <div className="py-20 text-center">
        <h2 className="text-xl font-semibold">Reports</h2>
        <p className="mt-2 text-slate-500">
          Insight staff with payment export permission can view cash flow and download reports.
        </p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Cash flow, partner payouts, and CSV exports for accounting"
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <Link
          href="/reports/payments"
          className="group rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-md ring-1 ring-slate-100 transition-all hover:border-sky-300 hover:ring-sky-200"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-blue-500 text-white">
              <Download className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-slate-900 group-hover:text-sky-800">Payee export</p>
              <p className="text-sm text-slate-600">Talent, crew, location, and rental payees</p>
            </div>
          </div>
        </Link>
        <Link
          href="/reports/partners"
          className="group rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-md ring-1 ring-slate-100 transition-all hover:border-violet-300 hover:ring-violet-200"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-400 to-purple-500 text-white">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-slate-900 group-hover:text-violet-800">
                Partner payout export
              </p>
              <p className="text-sm text-slate-600">Internal collaboration collaborator payouts</p>
            </div>
          </div>
        </Link>
      </div>

      <InfoCallout variant="sky">
        Record client payments and partner payouts on each signed agreement. Analytics below
        separates <strong>booked revenue</strong> (signed in the selected year) from{" "}
        <strong>cash movement</strong> (payment dates in the year).
      </InfoCallout>

      <AdminAnalytics variant="reports" />

      <PageSection
        className="mb-8 mt-8"
        icon={BarChart3}
        accent="violet"
        title="Exports"
        description="Download CSV files for your accountant or QuickBooks"
      />

      <AdminPartnerAgreements variant="reports" signedOutstandingOnly />
    </div>
  );
}
