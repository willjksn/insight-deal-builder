"use client";

import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Agreement } from "@/lib/types";
import { getPartnerPayoutBreakdown } from "@/lib/analytics/partnerPayoutTracking";
import { Users } from "lucide-react";

function formatMoney(amount: number): string {
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function InternalPayoutBreakdown({ agreement }: { agreement: Agreement }) {
  if (agreement.agreementType !== "internal_collaboration" || !agreement.payoutDetails) {
    return null;
  }

  const payout = agreement.payoutDetails;
  const lines = getPartnerPayoutBreakdown(payout);
  const payables = lines.filter((line) => !line.retained);

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-violet-600" />
          <h2 className="text-lg font-semibold">Payout breakdown</h2>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Project fee {formatMoney(payout.totalProjectFee)} — Insight retention and collaborator splits.
        </p>
      </CardHeader>
      <CardBody>
        {lines.length === 0 ? (
          <p className="text-sm text-slate-500">
            No payout splits configured. Complete the payout step in the wizard before signing.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {lines.map((line) => (
              <li key={line.label} className="flex items-center justify-between py-2 text-sm">
                <span className={line.retained ? "text-slate-600" : "font-medium text-slate-900"}>
                  {line.label}
                  {line.retained && (
                    <span className="ml-2 text-xs font-normal text-slate-400">(retained)</span>
                  )}
                </span>
                <span className="tabular-nums">{formatMoney(line.amount)}</span>
              </li>
            ))}
          </ul>
        )}
        {payables.length === 0 && lines.length > 0 && (
          <p className="mt-3 text-xs text-amber-700">
            No collaborator payout amounts on this deal — only Insight&apos;s fee is set.
          </p>
        )}
      </CardBody>
    </Card>
  );
}
