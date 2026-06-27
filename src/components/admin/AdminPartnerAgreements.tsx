"use client";

import Link from "next/link";
import { PageSection } from "@/components/ui/PageSection";
import { Badge } from "@/components/ui/Badge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAgreements } from "@/hooks/useAgreements";
import { formatUsd } from "@/lib/analytics/adminMetrics";
import {
  listPartnerAgreements,
  partnerOutstanding,
  partnerTotalDue,
  partnerTotalPaid,
} from "@/lib/analytics/partnerPayoutTracking";
import { Users } from "lucide-react";

function partnerName(agreement: ReturnType<typeof listPartnerAgreements>[number]): string {
  const collaborator = agreement.parties.find((p) => !p.name.includes("Insight Media Group"));
  return collaborator?.name || "—";
}

export function AdminPartnerAgreements() {
  const { data: agreements, loading } = useAgreements();
  const partnerDeals = listPartnerAgreements(agreements);

  return (
    <PageSection
      className="mb-8"
      icon={Users}
      accent="violet"
      title="Partner agreements"
      description="Internal collaboration deals with production partners — all active statuses"
      action={
        <Link
          href="/agreements?type=internal_collaboration"
          className="text-sm font-medium text-violet-700 hover:underline"
        >
          Open in Agreements →
        </Link>
      }
    >
      {loading ? (
        <LoadingSpinner className="py-8" />
      ) : partnerDeals.length === 0 ? (
        <p className="py-6 text-sm text-slate-500">
          No partner / internal collaboration agreements yet. Create one from{" "}
          <Link href="/agreements/new" className="font-medium text-sky-700 hover:underline">
            New Agreement
          </Link>{" "}
          and choose <strong>Internal Collaboration Agreement</strong>.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Agreement</th>
                <th className="px-4 py-3">Partner</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Project fee</th>
                <th className="px-4 py-3">Partner due</th>
                <th className="px-4 py-3">Paid</th>
                <th className="px-4 py-3">Outstanding</th>
              </tr>
            </thead>
            <tbody>
              {partnerDeals.map((deal) => {
                const due = partnerTotalDue(deal);
                const paid = partnerTotalPaid(deal);
                const outstanding = partnerOutstanding(deal);
                const signed = ["signed", "completed", "partially_signed"].includes(deal.status);

                return (
                  <tr key={deal.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      <Link
                        href={`/agreements/${deal.id}`}
                        className="font-medium text-sky-700 hover:underline"
                      >
                        {deal.title}
                      </Link>
                      <p className="text-xs text-slate-500">{deal.projectDetails.projectName}</p>
                    </td>
                    <td className="px-4 py-3">{partnerName(deal)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={signed ? "success" : "default"}>
                        {deal.status.replace(/_/g, " ")}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {formatUsd(deal.payoutDetails?.totalProjectFee ?? deal.paymentTerms.totalFee ?? 0)}
                    </td>
                    <td className="px-4 py-3 tabular-nums">{signed ? formatUsd(due) : "—"}</td>
                    <td className="px-4 py-3 tabular-nums">{signed ? formatUsd(paid) : "—"}</td>
                    <td className="px-4 py-3 tabular-nums">
                      {signed ? formatUsd(outstanding) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </PageSection>
  );
}
