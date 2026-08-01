"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { RevenueOpportunity } from "@/lib/revenueOpportunities/types/opportunity";
import type { RevenueOpportunityProposal } from "@/lib/revenueOpportunities/types/proposal";
import {
  estimateProjectFee,
  extractTimelineDates,
  inferProjectType,
  inferShootType,
  opportunityLocation,
} from "@/lib/revenueOpportunities/opportunityToProjectPayload";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";

export function OpportunityConversionPanel({
  opportunity,
  latestProposal,
  canManage,
  busy,
  onConvert,
}: {
  opportunity: RevenueOpportunity;
  latestProposal?: RevenueOpportunityProposal;
  canManage: boolean;
  busy?: boolean;
  onConvert: (projectName?: string) => Promise<{
    projectId: string;
    alreadyConverted: boolean;
    productionBoardId?: string;
  }>;
}) {
  const converted = opportunity.projectConversion?.status === "converted";
  const projectId = opportunity.projectConversion?.shootSpineProjectId;
  const [projectName, setProjectName] = useState(
    latestProposal?.title ?? opportunity.subject.name
  );
  const [message, setMessage] = useState<string | null>(null);

  const preview = useMemo(() => {
    const dates = extractTimelineDates(latestProposal?.timelineNotes);
    const days = Math.min(
      Math.max(opportunity.campaignConcept?.estimatedProductionDays ?? 1, 1),
      14
    );
    return {
      projectType: inferProjectType(opportunity, latestProposal),
      shootType: inferShootType(opportunity, latestProposal),
      fee: estimateProjectFee(opportunity, latestProposal),
      location: opportunityLocation(opportunity),
      shootDate: dates.shootDate,
      deliveryDate: dates.deliveryDate,
      days,
      hasBrief: Boolean(
        latestProposal?.executiveSummary ||
          latestProposal?.agreementPrefill?.projectOverview ||
          opportunity.campaignConcept?.coreConcept ||
          opportunity.campaignConcept?.hook
      ),
      hasContact: Boolean(opportunity.contact?.email || opportunity.contact?.name),
    };
  }, [opportunity, latestProposal]);

  if (!canManage && !converted) return null;

  return (
    <Card>
      <CardHeader>
        <h3 className="font-semibold text-slate-900">ShootSpine project</h3>
        <p className="text-xs text-slate-500">
          Creates the project and seeds Prep (brief, scope, location, contact, shoot days) so
          production does not re-enter the won deal.
        </p>
      </CardHeader>
      <CardBody className="space-y-4 text-sm">
        {converted && projectId ? (
          <div className="space-y-3">
            <Badge variant="success">Converted</Badge>
            <Link href={`/projects/${projectId}`} className="block font-medium text-sky-700 hover:underline">
              Open project →
            </Link>
            <Link
              href={`/projects/${projectId}/production`}
              className="block font-medium text-sky-700 hover:underline"
            >
              Open Prep board (seeded brief) →
            </Link>
            {latestProposal?.agreementPrefill && !latestProposal.agreementId && (
              <Link
                href={`/agreements/new?revenueProposalId=${encodeURIComponent(latestProposal.id)}&projectId=${encodeURIComponent(projectId)}`}
              >
                <Button size="sm" variant="outline">
                  Create agreement from proposal
                </Button>
              </Link>
            )}
            {latestProposal?.agreementId && (
              <Link href={`/agreements/${latestProposal.agreementId}`} className="text-sky-700 hover:underline">
                View linked agreement →
              </Link>
            )}
          </div>
        ) : (
          <>
            {opportunity.projectConversion?.status === "failed" && (
              <p className="text-red-600">
                Last conversion failed: {opportunity.projectConversion.lastError ?? "Unknown error"}
              </p>
            )}
            <Input
              label="Project name"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
            />
            <ul className="space-y-1 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              <li>
                Package: {preview.projectType} · {preview.shootType}
              </li>
              {preview.fee > 0 ? <li>Fee ~${preview.fee.toLocaleString()}</li> : null}
              {preview.location ? <li>Location: {preview.location}</li> : null}
              {preview.shootDate || preview.deliveryDate ? (
                <li>
                  Dates: {[preview.shootDate && `shoot ${preview.shootDate}`, preview.deliveryDate && `delivery ${preview.deliveryDate}`]
                    .filter(Boolean)
                    .join(" · ")}
                </li>
              ) : null}
              <li>
                Prep seed: {preview.days} day{preview.days === 1 ? "" : "s"}
                {preview.hasBrief ? " · brief/notes" : ""}
                {preview.hasContact ? " · client contact" : ""}
              </li>
            </ul>
            <Button
              size="touch"
              disabled={busy || !projectName.trim()}
              onClick={async () => {
                setMessage(null);
                const res = await onConvert(projectName.trim());
                setMessage(
                  res.alreadyConverted
                    ? "Project already linked"
                    : "Project created — Prep board seeded from proposal"
                );
              }}
            >
              Create ShootSpine project
            </Button>
            {message && <p className="text-xs text-emerald-700">{message}</p>}
          </>
        )}
      </CardBody>
    </Card>
  );
}
