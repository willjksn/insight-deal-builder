"use client";

import Link from "next/link";
import type { RevenueDiscoverySession } from "@/lib/revenueOpportunities/types/discovery";
import { DISCOVERY_SESSION_STATUS_LABELS } from "@/lib/revenueOpportunities/labels";
import { Badge } from "@/components/ui/Badge";
import { DataTable, DataRow } from "@/components/ui/DataTable";

export function DiscoveryTable({
  sessions,
  emptyMessage = "No discovery sessions yet.",
}: {
  sessions: RevenueDiscoverySession[];
  emptyMessage?: string;
}) {
  if (sessions.length === 0) {
    return <p className="text-sm text-slate-600">{emptyMessage}</p>;
  }

  return (
    <DataTable headers={["Opportunity", "Status", "Prep", "Debrief", "Updated"]}>
      {sessions.map((s) => (
        <DataRow
          key={s.id}
          href={`/revenue/opportunities/${s.opportunityId}`}
          cells={[
            <div key="opp">
              <Link
                href={`/revenue/opportunities/${s.opportunityId}`}
                className="font-medium text-sky-700 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {s.opportunitySubjectName ?? "View opportunity"}
              </Link>
              {s.prepBrief?.summary && (
                <p className="line-clamp-1 text-xs font-normal text-slate-500">{s.prepBrief.summary}</p>
              )}
            </div>,
            <Badge key="status" variant={s.status === "completed" ? "success" : s.status === "cancelled" ? "default" : "info"}>
              {DISCOVERY_SESSION_STATUS_LABELS[s.status]}
            </Badge>,
            s.prepBrief ? "Ready" : "—",
            s.debrief ? "Done" : "—",
            new Date(s.updatedAt).toLocaleDateString(),
          ]}
        />
      ))}
    </DataTable>
  );
}
