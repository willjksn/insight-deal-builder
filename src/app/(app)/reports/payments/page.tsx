"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { InfoCallout } from "@/components/ui/PageSection";
import { useAgreements } from "@/hooks/useAgreements";
import { buildPayeeExportRows, downloadPayeeExportCsv } from "@/lib/export/payeeExport";
import { useAuth } from "@/contexts/AuthContext";
import { canEditQuotes, isInsightOrgUser } from "@/lib/utils/permissions";
import { Download } from "lucide-react";

export default function PaymentExportPage() {
  const { data, loading } = useAgreements();
  const { appUser } = useAuth();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(String(currentYear));

  const allowed = isInsightOrgUser(appUser) && canEditQuotes(appUser);

  const rows = useMemo(
    () => buildPayeeExportRows(data, Number(year)),
    [data, year]
  );

  if (!allowed) {
    return (
      <div className="py-20 text-center">
        <h2 className="text-xl font-semibold">Payment export</h2>
        <p className="mt-2 text-slate-500">Insight staff with edit access can export payee reports.</p>
      </div>
    );
  }

  if (loading) return <LoadingSpinner className="py-20" />;

  const yearOptions = Array.from({ length: 5 }, (_, i) => {
    const y = currentYear - i;
    return { value: String(y), label: String(y) };
  });

  const totalPaid = rows.reduce((sum, r) => sum + r.totalFee, 0);

  return (
    <div>
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
          Includes signed <strong>Talent</strong>, <strong>Contractor/Crew</strong>, <strong>Location/Prop</strong>, and <strong>Equipment Rental</strong> agreements
          for the selected year. Fill in tax / W-9 fields on each agreement for cleaner 1099 prep. This is not tax advice —
          confirm reporting requirements with your accountant.
        </InfoCallout>
      </div>

      <div className="mb-6 max-w-xs">
        <Select label="Tax year" value={year} onChange={(e) => setYear(e.target.value)} options={yearOptions} touch />
      </div>

      <div className="mb-4 flex gap-6 text-sm">
        <p><span className="text-slate-500">Agreements:</span> <strong>{rows.length}</strong></p>
        <p><span className="text-slate-500">Total fees:</span> <strong>${totalPaid.toLocaleString()}</strong></p>
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
