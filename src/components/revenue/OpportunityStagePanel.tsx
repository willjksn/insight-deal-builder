"use client";

import { useEffect, useState } from "react";
import type { RevenueOpportunity } from "@/lib/revenueOpportunities/types/opportunity";
import type { RevenuePipelineStage } from "@/lib/revenueOpportunities/types";
import { PIPELINE_STAGE_OPTIONS, pipelineStageLabel } from "@/lib/revenueOpportunities/labels";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";

export function OpportunityStagePanel({
  opportunity,
  canManage,
  busy,
  onSetStage,
}: {
  opportunity: RevenueOpportunity;
  canManage: boolean;
  busy?: boolean;
  onSetStage: (stage: RevenuePipelineStage) => Promise<void>;
}) {
  const current = opportunity.workflow.pipelineStage;
  const [stage, setStage] = useState<RevenuePipelineStage>(current);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setStage(current);
  }, [current]);

  return (
    <Card>
      <CardHeader>
        <h3 className="font-semibold text-slate-900">Pipeline stage</h3>
        <p className="text-xs text-slate-500">
          Current: <span className="font-medium text-slate-700">{pipelineStageLabel(current)}</span>
          {opportunity.workflow.nextAction ? ` · Next: ${opportunity.workflow.nextAction}` : ""}
        </p>
      </CardHeader>
      <CardBody className="space-y-3">
        {canManage ? (
          <>
            <Select
              label="Move to stage"
              value={stage}
              touch
              disabled={busy || saving}
              onChange={(e) => setStage(e.target.value as RevenuePipelineStage)}
              options={PIPELINE_STAGE_OPTIONS}
            />
            <Button
              size="touch"
              variant="secondary"
              disabled={busy || saving || stage === current}
              onClick={async () => {
                setSaving(true);
                try {
                  await onSetStage(stage);
                } finally {
                  setSaving(false);
                }
              }}
            >
              {saving ? "Updating…" : "Update stage"}
            </Button>
          </>
        ) : (
          <p className="text-sm text-slate-600">View-only — managers can change the stage.</p>
        )}
      </CardBody>
    </Card>
  );
}
