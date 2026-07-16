"use client";

import type { RevenueEmailThread } from "@/lib/revenueOpportunities/types/emailThread";
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
  emptyMessage = "No email threads yet. Sync inbox to import Gmail threads.",
  selectedId,
  onSelect,
}: {
  threads: RevenueEmailThread[];
  emptyMessage?: string;
  selectedId?: string;
  onSelect?: (thread: RevenueEmailThread) => void;
}) {
  if (threads.length === 0) {
    return <p className="text-sm text-slate-600">{emptyMessage}</p>;
  }

  return (
    <DataTable headers={["Subject", "Participants", "Classification", "Status", "Last message"]}>
      {threads.map((t) => {
        const latest = t.messages[t.messages.length - 1];
        return (
          <DataRow
            key={t.id}
            onClick={onSelect ? () => onSelect(t) : undefined}
            cells={[
              <div key="subject">
                <p className="font-medium">{t.subject}</p>
                <p className="line-clamp-1 text-xs font-normal text-slate-500">{latest?.snippet ?? "—"}</p>
              </div>,
              t.participants.slice(0, 2).join(", ") || "—",
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
