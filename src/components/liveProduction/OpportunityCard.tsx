"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import {
  deadlineAlert,
  formatDeadline,
  formatValueRange,
  statusBadgeVariant,
  statusLabel,
} from "@/lib/liveProduction/format";
import type { LiveOpportunity } from "@/lib/liveProduction/types";

export function OpportunityCard({
  opportunity,
  onBuildQuote,
  onCreateProject,
}: {
  opportunity: LiveOpportunity;
  onBuildQuote?: () => void;
  onCreateProject?: () => void;
}) {
  const alert = deadlineAlert(opportunity);
  return (
    <Card className="min-w-0">
      <CardBody className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-base font-semibold text-slate-900">{opportunity.title}</p>
            <p className="text-sm text-slate-600">{opportunity.organizationName}</p>
          </div>
          <Badge variant={statusBadgeVariant(opportunity.status)}>
            {statusLabel(opportunity.status)}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Type</p>
            <p className="text-slate-800">{opportunity.opportunityType || "—"}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Location</p>
            <p className="text-slate-800">{opportunity.location || "—"}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Value</p>
            <p className="text-slate-800">
              {formatValueRange(opportunity.estimatedValueLow, opportunity.estimatedValueHigh)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Bid deadline</p>
            <p className="text-slate-800">{formatDeadline(opportunity.bidDeadline)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Equipment match</p>
            <p className="font-medium text-slate-900">{opportunity.equipmentMatchPct}%</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Owned coverage</p>
            <p className="font-medium text-slate-900">{opportunity.ownedCoveragePct}%</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Sub-rental</p>
            <p className="text-slate-800">{opportunity.subRentalSummary || "None identified"}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Fit score</p>
            <p className="font-semibold text-sky-800">{opportunity.fitScore.total} / 100</p>
          </div>
          {opportunity.isPartnerSubcontract && (
            <div>
              <Badge variant="info">Partner / subcontract</Badge>
            </div>
          )}
        </div>

        {alert && (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900 ring-1 ring-amber-200">
            {alert}
          </p>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          <Link href={`/live-production/${opportunity.id}`}>
            <Button size="touch" variant="primary">
              View opportunity
            </Button>
          </Link>
          {onBuildQuote && (
            <Button size="touch" variant="outline" onClick={onBuildQuote}>
              Build quote
            </Button>
          )}
          {onCreateProject && (
            <Button size="touch" variant="outline" onClick={onCreateProject}>
              Create project
            </Button>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
