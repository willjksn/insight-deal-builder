"use client";

import Link from "next/link";
import type { RevenueOpportunityProposal } from "@/lib/revenueOpportunities/types/proposal";
import { PROPOSAL_STATUS_LABELS } from "@/lib/revenueOpportunities/labels";
import { Badge } from "@/components/ui/Badge";
import { DataTable, DataRow } from "@/components/ui/DataTable";
import { formatCurrency } from "@/lib/utils/format";

export function ProposalTable({
  proposals,
  emptyMessage = "No proposals yet.",
}: {
  proposals: RevenueOpportunityProposal[];
  emptyMessage?: string;
}) {
  if (proposals.length === 0) {
    return <p className="text-sm text-slate-600">{emptyMessage}</p>;
  }

  return (
    <DataTable headers={["Title", "Opportunity", "Status", "Investment", "Updated"]}>
      {proposals.map((p) => {
        const valueLabel =
          p.investmentMin || p.investmentMax
            ? p.investmentMin && p.investmentMax
              ? `${formatCurrency(p.investmentMin)} – ${formatCurrency(p.investmentMax)}`
              : formatCurrency(p.investmentMin ?? p.investmentMax ?? 0)
            : "—";
        return (
          <DataRow
            key={p.id}
            href={`/revenue/opportunities/${p.opportunityId}`}
            cells={[
              <span key="title" className="font-medium">
                {p.title}
              </span>,
              <Link
                key="opp"
                href={`/revenue/opportunities/${p.opportunityId}`}
                className="text-sky-700 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {p.opportunitySubjectName ?? "View"}
              </Link>,
              <Badge key="status" variant={p.status === "approved" || p.status === "sent" ? "success" : "default"}>
                {PROPOSAL_STATUS_LABELS[p.status]}
              </Badge>,
              valueLabel,
              new Date(p.updatedAt).toLocaleDateString(),
            ]}
          />
        );
      })}
    </DataTable>
  );
}
