"use client";

import Link from "next/link";
import { RevenueOpportunity } from "@/lib/revenueOpportunities/types/opportunity";
import { pipelineStageLabel, scorePriorityLabel } from "@/lib/revenueOpportunities/labels";
import { Badge } from "@/components/ui/Badge";
import { DataTable, DataRow } from "@/components/ui/DataTable";
import { formatCurrency } from "@/lib/utils/format";

function stageVariant(stage: string): "default" | "success" | "warning" | "danger" | "info" {
  if (stage === "won" || stage === "converted_to_project") return "success";
  if (stage === "lost") return "danger";
  if (stage === "review_required" || stage === "follow_up_due") return "warning";
  if (stage === "ready_for_outreach" || stage === "approved") return "info";
  return "default";
}

export function OpportunityTable({
  opportunities,
  emptyMessage = "No opportunities yet.",
}: {
  opportunities: RevenueOpportunity[];
  emptyMessage?: string;
}) {
  if (opportunities.length === 0) {
    return <p className="text-sm text-slate-600">{emptyMessage}</p>;
  }

  return (
    <DataTable headers={["Subject", "Type", "Score", "Stage", "Approval", "Est. value", "Next action"]}>
      {opportunities.map((o) => {
        const score = o.scoring?.totalScore ?? 0;
        const min = o.recommendation?.estimatedMinimumValue;
        const max = o.recommendation?.estimatedMaximumValue;
        const valueLabel =
          min || max
            ? min && max
              ? `${formatCurrency(min)} – ${formatCurrency(max)}`
              : formatCurrency(min ?? max ?? 0)
            : "—";

        return (
          <DataRow
            key={o.id}
            href={`/revenue/opportunities/${o.id}`}
            cells={[
              <div key="subject">
                <p>{o.subject.name}</p>
                <p className="text-xs font-normal text-slate-500">
                  {[o.subject.city, o.subject.state].filter(Boolean).join(", ") || o.subject.industry}
                </p>
              </div>,
              o.opportunityType === "stormi_brand" ? "Stormi brand" : "IMG client",
              <div key="score">
                <span className="font-semibold">{score || "—"}</span>
                {score > 0 && (
                  <p className="text-xs font-normal text-slate-500">{scorePriorityLabel(score)}</p>
                )}
              </div>,
              <Badge key="stage" variant={stageVariant(o.workflow.pipelineStage)}>
                {pipelineStageLabel(o.workflow.pipelineStage)}
              </Badge>,
              <Badge
                key="approval"
                variant={
                  o.workflow.approvalStatus === "approved"
                    ? "success"
                    : o.workflow.approvalStatus === "rejected"
                      ? "danger"
                      : "warning"
                }
              >
                {o.workflow.approvalStatus.replace(/_/g, " ")}
              </Badge>,
              valueLabel,
              o.workflow.nextAction ?? "—",
            ]}
          />
        );
      })}
    </DataTable>
  );
}

export function OpportunitySummaryCards({ count, label, href }: { count: number; label: string; href?: string }) {
  const inner = (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <p className="text-2xl font-bold text-slate-900">{count}</p>
      <p className="text-sm text-slate-600">{label}</p>
    </div>
  );
  if (href) {
    return (
      <Link href={href} className="block transition hover:border-sky-300">
        {inner}
      </Link>
    );
  }
  return inner;
}
