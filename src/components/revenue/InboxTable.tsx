"use client";

import type { RevenueEmailThread } from "@/lib/revenueOpportunities/types/emailThread";
import type { RevenueOpportunity } from "@/lib/revenueOpportunities/types/opportunity";
import { EMAIL_CLASSIFICATION_LABELS } from "@/lib/revenueOpportunities/labels";
import { Badge } from "@/components/ui/Badge";
import { DataTable, DataRow } from "@/components/ui/DataTable";

function statusVariant(status: string): "default" | "success" | "warning" | "danger" | "info" {
  if (status === "closed" || status === "archived") return "default";
  if (status === "awaiting_reply") return "warning";
  return "info";
}

export function InboxTable({
  threads,
  opportunities = [],
  emptyMessage = "No email threads yet. Sync inbox to import Gmail threads.",
  selectedId,
  onSelect,
}: {
  threads: RevenueEmailThread[];
  opportunities?: RevenueOpportunity[];
  emptyMessage?: string;
  selectedId?: string;
  onSelect?: (thread: RevenueEmailThread) => void;
}) {
  if (threads.length === 0) {
    return <p className="text-sm text-slate-600">{emptyMessage}</p>;
  }

  const nameById = new Map(opportunities.map((o) => [o.id, o.subject.name]));

  return (
    <DataTable headers={["Subject", "Opportunity", "Classification", "Status", "Last message"]}>
      {threads.map((t) => {
        const latest = t.messages[t.messages.length - 1];
        const oppName = t.opportunityId ? nameById.get(t.opportunityId) : undefined;
        return (
          <DataRow
            key={t.id}
            onClick={onSelect ? () => onSelect(t) : undefined}
            cells={[
              <div key="subject">
                <p className="font-medium">{t.subject}</p>
                <p className="line-clamp-1 text-xs font-normal text-slate-500">
                  {t.participants.slice(0, 2).join(", ") || latest?.snippet || "—"}
                </p>
              </div>,
              oppName ? (
                <span key="opp" className="text-slate-800">
                  {oppName}
                </span>
              ) : (
                <span key="opp" className="text-slate-400">
                  —
                </span>
              ),
              t.classification ? (
                <Badge key="class" variant="default">
                  {EMAIL_CLASSIFICATION_LABELS[t.classification]}
                </Badge>
              ) : (
                "—"
              ),
              <Badge key="status" variant={statusVariant(t.status)}>
                {t.status.replace(/_/g, " ")}
              </Badge>,
              new Date(t.lastMessageAt).toLocaleString(),
            ]}
          />
        );
      })}
    </DataTable>
  );
}
