"use client";

import { useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { InfoCallout } from "@/components/ui/PageSection";
import { useAgreements } from "@/hooks/useAgreements";
import {
  buildPartnerPayoutExportRows,
  downloadPartnerPayoutExportCsv,
} from "@/lib/export/partnerPayoutExport";
import { getAnalyticsYearOptions, parseYearParam } from "@/lib/analytics/yearFilter";
import { useAuth } from "@/contexts/AuthContext";
import { canAccessReports } from "@/lib/utils/permissions";
import { ArrowLeft, Download } from "lucide-react";

function PartnerExportContent() {
  const searchParams = useSearchParams();
  const { data, loading } = useAgreements();
  const { appUser } = useAuth();
  const currentYear = new Date().getFullYear();
  const initialYear = parseYearParam(searchParams.get("year"), currentYear);
  const [year, setYear] = useState(String(initialYear));
  const [outstandingOnly, setOutstandingOnly] = useState(true);

  const allowed = canAccessReports(appUser);

  const rows = useMemo(
    () => buildPartnerPayoutExportRows(data, Number(year), outstandingOnly),
    [data, year, outstandingOnly]
  );

  if (!allowed) {
    return (
      <div className="py-20 text-center">
        <h2 className="text-xl font-semibold">Partner payout export</h2>
        <p className="mt-2 text-slate-500">
          Insight staff with payment export permission can download partner payout reports.
        </p>
      </div>
    );
  }

  if (loading) return <LoadingSpinner className="py-20" />;

  const yearOptions = getAnalyticsYearOptions(currentYear);
  const totalDue = rows.reduce((sum, r) => sum + r.totalPartnerDue, 0);
  const totalPaidInYear = rows.reduce((sum, r) => sum + r.paidInYear, 0);
  const totalOutstanding = rows.reduce((sum, r) => sum + r.outstanding, 0);

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/reports"
          className="inline-flex items-center text-sm font-medium text-sky-700 hover:text-sky-900"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          All reports
        </Link>
      </div>

      <PageHeader
        title="Partner Payout Export"
        subtitle="Export collaborator payout data from signed internal collaboration deals"
        action={
          <Button onClick={() => downloadPartnerPayoutExportCsv(rows, Number(year))} disabled={rows.length === 0}>
            <Download className="mr-2 h-5 w-5" /> Download CSV
          </Button>
        }
      />

      <div className="mb-6">
        <InfoCallout variant="blue">
          Includes signed <strong>Internal Collaboration</strong> deals.{" "}
          <strong>Paid in year</strong> uses payout payment dates. Lifetime paid and outstanding
          reflect all recorded collaborator payouts (excludes Insight&apos;s retained fee).
        </InfoCallout>
      </div>

      <div className="mb-6 flex flex-wrap items-end gap-4">
        <div className="max-w-xs">
          <Select
            label="Report year"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            options={yearOptions}
            touch
          />
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={outstandingOnly}
            onChange={(e) => setOutstandingOnly(e.target.checked)}
            className="rounded border-slate-300"
          />
          Outstanding balances only
        </label>
      </div>

      <div className="mb-4 flex flex-wrap gap-6 text-sm">
        <p>
          <span className="text-slate-500">Deals:</span> <strong>{rows.length}</strong>
        </p>
        <p>
          <span className="text-slate-500">Partner due:</span>{" "}
          <strong>${totalDue.toLocaleString()}</strong>
        </p>
        <p>
          <span className="text-slate-500">Paid in {year}:</span>{" "}
          <strong>${totalPaidInYear.toLocaleString()}</strong>
        </p>
        <p>
          <span className="text-slate-500">Outstanding:</span>{" "}
          <strong>${totalOutstanding.toLocaleString()}</strong>
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="text-slate-500">No matching partner deals for {year}.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Partner</th>
                <th className="px-4 py-3">Agreement</th>
                <th className="px-4 py-3">Due</th>
                <th className="px-4 py-3">Paid ({year})</th>
                <th className="px-4 py-3">Outstanding</th>
                <th className="px-4 py-3">Signed</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.agreementId} className="border-t border-slate-100">
                  <td className="px-4 py-3">{row.partnerName}</td>
                  <td className="px-4 py-3">
                    <Link href={`/agreements/${row.agreementId}`} className="text-sky-700 hover:underline">
                      {row.agreementTitle}
                    </Link>
                  </td>
                  <td className="px-4 py-3">${row.totalPartnerDue.toLocaleString()}</td>
                  <td className="px-4 py-3">${row.paidInYear.toLocaleString()}</td>
                  <td className="px-4 py-3">${row.outstanding.toLocaleString()}</td>
                  <td className="px-4 py-3">{row.signedDate || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function PartnerExportPage() {
  return (
    <Suspense fallback={<LoadingSpinner className="py-20" />}>
      <PartnerExportContent />
    </Suspense>
  );
}
