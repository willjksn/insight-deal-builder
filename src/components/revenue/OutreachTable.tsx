"use client";

import Link from "next/link";
import type { RevenueOutreachActivity } from "@/lib/revenueOpportunities/types/outreach";
import { OUTREACH_CHANNEL_LABELS, OUTREACH_STATUS_LABELS } from "@/lib/revenueOpportunities/labels";
import { Badge } from "@/components/ui/Badge";
import { DataTable, DataRow } from "@/components/ui/DataTable";

function statusVariant(status: string): "default" | "success" | "warning" | "danger" | "info" {
  if (status === "approved" || status === "sent") return "success";
  if (status === "rejected") return "danger";
  if (status === "pending_review") return "warning";
  return "default";
}

export function OutreachTable({
  activities,
  emptyMessage = "No outreach drafts yet.",
  showOpportunity = true,
}: {
  activities: RevenueOutreachActivity[];
  emptyMessage?: string;
  showOpportunity?: boolean;
}) {
  if (activities.length === 0) {
    return <p className="text-sm text-slate-600">{emptyMessage}</p>;
  }

  const headers = showOpportunity
    ? ["Opportunity", "Channel", "Subject / preview", "Status", "Updated"]
    : ["Channel", "Subject / preview", "Status", "Updated"];

  return (
    <DataTable headers={headers}>
      {activities.map((a) => {
        const preview = a.subject ?? a.body.slice(0, 80) + (a.body.length > 80 ? "…" : "");
        const cells = [
          ...(showOpportunity
            ? [
                <div key="opp">
                  <Link
                    href={`/revenue/opportunities/${a.opportunityId}`}
                    className="font-medium text-sky-700 hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {a.opportunitySubjectName ?? "View opportunity"}
                  </Link>
                </div>,
              ]
            : []),
          OUTREACH_CHANNEL_LABELS[a.channel] ?? a.channel,
          <span key="preview" className="line-clamp-2 text-slate-700">
            {preview}
          </span>,
          <Badge key="status" variant={statusVariant(a.status)}>
            {OUTREACH_STATUS_LABELS[a.status] ?? a.status}
          </Badge>,
          new Date(a.updatedAt).toLocaleDateString(),
        ];

        return <DataRow key={a.id} href={`/revenue/opportunities/${a.opportunityId}`} cells={cells} />;
      })}
    </DataTable>
  );
}
