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
import { buildPayeeExportRows, downloadPayeeExportCsv } from "@/lib/export/payeeExport";
import { getAnalyticsYearOptions, parseYearParam } from "@/lib/analytics/yearFilter";
import { useAuth } from "@/contexts/AuthContext";
import { canAccessReports, isInsightOrgUser } from "@/lib/utils/permissions";
import { ArrowLeft, Download } from "lucide-react";

function PaymentExportContent() {
  const searchParams = useSearchParams();
  const { data, loading } = useAgreements();
  const { appUser } = useAuth();
  const currentYear = new Date().getFullYear();
  const initialYear = parseYearParam(searchParams.get("year"), currentYear);
  const [year, setYear] = useState(String(initialYear));

  const allowed = isInsightOrgUser(appUser) && canAccessReports(appUser);

  const rows = useMemo(() => buildPayeeExportRows(data, Number(year)), [data, year]);

  if (!allowed) {
    return (
      <div className="py-20 text-center">
        <h2 className="text-xl font-semibold">Payment export</h2>
        <p className="mt-2 text-slate-500">
          Insight staff with payment export permission can download payee reports.
        </p>
      </div>
    );
  }

  if (loading) return <LoadingSpinner className="py-20" />;

  const yearOptions = getAnalyticsYearOptions(currentYear);
  const totalPaid = rows.reduce((sum, r) => sum + r.paidAmount, 0);
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
        title="Payment Export"
        subtitle="Export signed talent, contractor, and rental payee data for your accountant or QuickBooks"
        action={
          <Button onClick={() => downloadPayeeExportCsv(rows, Number(year))} disabled={rows.length === 0}>
            <Download className="mr-2 h-5 w-5" /> Download CSV
          </Button>
        }
      />

      <div className="mb-6">
        <InfoCallout variant="sky">
          Includes signed agreements whose <strong>signature date</strong> falls in the selected
          year. <strong>Paid in year</strong> uses recorded payment dates; lifetime paid and
          outstanding are totals across all installments. Fill in tax / W-9 fields on each agreement
          for cleaner 1099 prep.
        </InfoCallout>
      </div>

      <div className="mb-6 max-w-xs">
        <Select
          label="Report year"
          value={year}
          onChange={(e) => setYear(e.target.value)}
          options={yearOptions}
          touch
        />
      </div>

      <div className="mb-4 flex flex-wrap gap-6 text-sm">
        <p>
          <span className="text-slate-500">Agreements:</span> <strong>{rows.length}</strong>
        </p>
        <p>
          <span className="text-slate-500">Total fees:</span>{" "}
          <strong>${rows.reduce((s, r) => s + r.totalFee, 0).toLocaleString()}</strong>
        </p>
        <p>
          <span className="text-slate-500">Paid in {year}:</span>{" "}
          <strong>${totalPaidInYear.toLocaleString()}</strong>
        </p>
        <p>
          <span className="text-slate-500">Lifetime paid:</span>{" "}
          <strong>${totalPaid.toLocaleString()}</strong>
        </p>
        <p>
          <span className="text-slate-500">Outstanding:</span>{" "}
          <strong>${totalOutstanding.toLocaleString()}</strong>
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="text-slate-500">No signed payee agreements found for {year}.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Payee</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Project</th>
                <th className="px-4 py-3">Fee</th>
                <th className="px-4 py-3">Paid ({year})</th>
                <th className="px-4 py-3">Outstanding</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">W-9</th>
                <th className="px-4 py-3">Signed</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.agreementId} className="border-t border-slate-100">
                  <td className="px-4 py-3">{row.payeeName}</td>
                  <td className="px-4 py-3">{row.agreementType}</td>
                  <td className="px-4 py-3">{row.projectName}</td>
                  <td className="px-4 py-3">${row.totalFee.toLocaleString()}</td>
                  <td className="px-4 py-3">${row.paidInYear.toLocaleString()}</td>
                  <td className="px-4 py-3">${row.outstanding.toLocaleString()}</td>
                  <td className="px-4 py-3">{row.paymentStatus}</td>
                  <td className="px-4 py-3">{row.w9OnFile}</td>
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

export default function PaymentExportPage() {
  return (
    <Suspense fallback={<LoadingSpinner className="py-20" />}>
      <PaymentExportContent />
    </Suspense>
  );
}
