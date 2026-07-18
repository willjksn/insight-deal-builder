"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { RevenueOpportunity } from "@/lib/revenueOpportunities/types/opportunity";
import type { RevenuePipelineStage } from "@/lib/revenueOpportunities/types";
import { PIPELINE_STAGE_LABELS, scorePriorityLabel } from "@/lib/revenueOpportunities/labels";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

/** Primary board columns — remaining stages still appear if they have cards. */
const PRIMARY_STAGES: RevenuePipelineStage[] = [
  "review_required",
  "ready_for_outreach",
  "contacted",
  "follow_up_due",
  "replied",
  "discovery_call",
  "proposal",
  "negotiating",
  "won",
  "converted_to_project",
  "lost",
  "revisit_later",
];

export function PipelineKanban({
  opportunities,
  canManage,
  busy,
  onMoveStage,
}: {
  opportunities: RevenueOpportunity[];
  canManage: boolean;
  busy?: boolean;
  onMoveStage: (opportunityId: string, stage: RevenuePipelineStage) => Promise<void>;
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropStage, setDropStage] = useState<RevenuePipelineStage | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);

  const stages = useMemo(() => {
    const present = new Set(opportunities.map((o) => o.workflow.pipelineStage));
    const ordered: RevenuePipelineStage[] = [...PRIMARY_STAGES];
    for (const stage of Object.keys(PIPELINE_STAGE_LABELS) as RevenuePipelineStage[]) {
      if (!ordered.includes(stage) && present.has(stage)) ordered.unshift(stage);
    }
    return ordered;
  }, [opportunities]);

  const byStage = useMemo(() => {
    const map = new Map<RevenuePipelineStage, RevenueOpportunity[]>();
    for (const stage of stages) map.set(stage, []);
    for (const opp of opportunities) {
      const list = map.get(opp.workflow.pipelineStage);
      if (list) list.push(opp);
      else map.set(opp.workflow.pipelineStage, [opp]);
    }
    return map;
  }, [opportunities, stages]);

  if (opportunities.length === 0) {
    return <p className="text-sm text-slate-600">No opportunities in the pipeline yet.</p>;
  }

  return (
    <div className="-mx-1 overflow-x-auto pb-2">
      <div className="flex min-w-max gap-3 px-1">
        {stages.map((stage) => {
          const cards = byStage.get(stage) ?? [];
          const isDropTarget = dropStage === stage && draggingId;
          return (
            <section
              key={stage}
              data-pipeline-stage={stage}
              className={cn(
                "flex w-72 shrink-0 flex-col rounded-2xl border bg-slate-50/80",
                isDropTarget ? "border-sky-400 bg-sky-50/70" : "border-slate-200"
              )}
              onDragOver={(e) => {
                if (!canManage || busy) return;
                e.preventDefault();
                setDropStage(stage);
              }}
              onDragLeave={() => {
                if (dropStage === stage) setDropStage(null);
              }}
              onDrop={async (e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData("text/opportunity-id") || draggingId;
                setDropStage(null);
                setDraggingId(null);
                if (!id || !canManage || busy) return;
                const opp = opportunities.find((o) => o.id === id);
                if (!opp || opp.workflow.pipelineStage === stage) return;
                setMovingId(id);
                try {
                  await onMoveStage(id, stage);
                } finally {
                  setMovingId(null);
                }
              }}
            >
              <header className="flex items-center justify-between gap-2 border-b border-slate-200/80 px-3 py-2.5">
                <h3 className="text-sm font-semibold text-slate-900">{PIPELINE_STAGE_LABELS[stage]}</h3>
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-600 shadow-sm">
                  {cards.length}
                </span>
              </header>
              <div className="flex max-h-[70vh] flex-col gap-2 overflow-y-auto p-2">
                {cards.length === 0 && (
                  <p className="px-1 py-6 text-center text-xs text-slate-400">Drop here</p>
                )}
                {cards.map((opp) => {
                  const score = opp.scoring?.totalScore ?? 0;
                  const min = opp.recommendation?.estimatedMinimumValue;
                  const max = opp.recommendation?.estimatedMaximumValue;
                  const value =
                    min || max
                      ? min && max
                        ? `${formatCurrency(min)} – ${formatCurrency(max)}`
                        : formatCurrency(min ?? max ?? 0)
                      : null;
                  return (
                    <article
                      key={opp.id}
                      draggable={canManage && !busy}
                      onDragStart={(e) => {
                        if (!canManage) return;
                        setDraggingId(opp.id);
                        e.dataTransfer.setData("text/opportunity-id", opp.id);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onDragEnd={() => {
                        setDraggingId(null);
                        setDropStage(null);
                      }}
                      className={cn(
                        "rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition",
                        canManage && !busy ? "cursor-grab active:cursor-grabbing" : "",
                        draggingId === opp.id || movingId === opp.id ? "opacity-50" : "hover:border-sky-200"
                      )}
                    >
                      <Link
                        href={`/revenue/opportunities/${opp.id}`}
                        className="block"
                        onClick={(e) => {
                          if (draggingId) e.preventDefault();
                        }}
                      >
                        <p className="font-medium text-slate-900">{opp.subject.name}</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {[opp.subject.city, opp.subject.state].filter(Boolean).join(", ") ||
                            opp.subject.industry ||
                            (opp.opportunityType === "stormi_brand" ? "Stormi" : "IMG")}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                          {score > 0 && (
                            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-medium">
                              {score} · {scorePriorityLabel(score)}
                            </span>
                          )}
                          {value && <span>{value}</span>}
                        </div>
                        {opp.workflow.nextAction && (
                          <p className="mt-2 line-clamp-2 text-xs text-slate-500">{opp.workflow.nextAction}</p>
                        )}
                      </Link>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
      {canManage && (
        <p className="mt-3 text-xs text-slate-500">Drag a card onto another column to change its pipeline stage.</p>
      )}
    </div>
  );
}
