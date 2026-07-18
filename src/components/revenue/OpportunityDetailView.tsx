"use client";

import Link from "next/link";
import { RevenueOpportunity } from "@/lib/revenueOpportunities/types/opportunity";
import { pipelineStageLabel } from "@/lib/revenueOpportunities/labels";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { formatCurrency, formatDate } from "@/lib/utils/format";

export function OpportunityDetailView({ opportunity }: { opportunity: RevenueOpportunity }) {
  const score = opportunity.scoring?.totalScore ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{opportunity.subject.name}</h2>
          <p className="text-sm text-slate-600">
            {[opportunity.subject.industry, opportunity.subject.city, opportunity.subject.state]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {opportunity.subject.website &&
            /^https?:\/\//i.test(opportunity.subject.website) && (
            <a
              href={opportunity.subject.website}
              target="_blank"
              rel="noreferrer"
              className="block text-sm text-sky-700 hover:underline"
            >
              {opportunity.subject.website}
            </a>
          )}
          {opportunity.subject.socialLinks?.trim() && (
            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">
              {opportunity.subject.socialLinks.trim()}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="info">{pipelineStageLabel(opportunity.workflow.pipelineStage)}</Badge>
          {score > 0 && <Badge variant="success">Score {score}</Badge>}
        </div>
      </div>

      {opportunity.campaignName && (
        <p className="text-sm text-slate-600">
          Campaign: <span className="font-medium text-slate-800">{opportunity.campaignName}</span>
        </p>
      )}

      {opportunity.clientId && (
        <p className="text-sm">
          Linked client:{" "}
          <Link href={`/clients`} className="font-medium text-sky-700 hover:underline">
            View clients
          </Link>
        </p>
      )}

      {opportunity.projectConversion?.shootSpineProjectId && (
        <p className="text-sm">
          ShootSpine project:{" "}
          <Link
            href={`/projects/${opportunity.projectConversion.shootSpineProjectId}`}
            className="font-medium text-sky-700 hover:underline"
          >
            Open project
          </Link>
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-slate-900">Recommendation</h3>
          </CardHeader>
          <CardBody className="space-y-2 text-sm text-slate-700">
            <p>
              <span className="font-medium">Service:</span> {opportunity.recommendation?.serviceName ?? "—"}
            </p>
            <p>
              <span className="font-medium">Est. value:</span>{" "}
              {opportunity.recommendation?.estimatedMinimumValue
                ? `${formatCurrency(opportunity.recommendation.estimatedMinimumValue)} – ${formatCurrency(opportunity.recommendation.estimatedMaximumValue ?? opportunity.recommendation.estimatedMinimumValue)}`
                : "—"}
            </p>
            <p>{opportunity.recommendation?.rationale}</p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="font-semibold text-slate-900">Campaign concept</h3>
          </CardHeader>
          <CardBody className="space-y-2 text-sm text-slate-700">
            <p className="font-medium">{opportunity.campaignConcept?.title ?? "—"}</p>
            <p>{opportunity.campaignConcept?.coreConcept}</p>
            {opportunity.campaignConcept?.recommendedDeliverables?.length ? (
              <ul className="list-inside list-disc">
                {opportunity.campaignConcept.recommendedDeliverables.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            ) : null}
          </CardBody>
        </Card>
      </div>

      {opportunity.research && (
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-slate-900">Research summary</h3>
          </CardHeader>
          <CardBody className="grid gap-4 md:grid-cols-2 text-sm text-slate-700">
            {opportunity.research.observedFacts?.length ? (
              <div>
                <p className="mb-1 font-medium text-slate-900">Observed facts</p>
                <ul className="list-inside list-disc">
                  {opportunity.research.observedFacts.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {opportunity.research.marketingGaps?.length ? (
              <div>
                <p className="mb-1 font-medium text-slate-900">Marketing gaps</p>
                <ul className="list-inside list-disc">
                  {opportunity.research.marketingGaps.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardBody>
        </Card>
      )}

      {opportunity.scoring?.categoryScores && (
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-slate-900">Score breakdown</h3>
          </CardHeader>
          <CardBody>
            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 text-sm">
              {Object.entries(opportunity.scoring.categoryScores).map(([key, val]) => (
                <div key={key} className="flex justify-between rounded-lg bg-slate-50 px-3 py-2">
                  <span className="text-slate-600">{key.replace(/([A-Z])/g, " $1")}</span>
                  <span className="font-semibold text-slate-900">{val}</span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>
          <h3 className="font-semibold text-slate-900">Activity</h3>
        </CardHeader>
        <CardBody className="space-y-3">
          {opportunity.activityLog.length === 0 && (
            <p className="text-sm text-slate-500">No activity yet.</p>
          )}
          {[...opportunity.activityLog].reverse().map((entry) => (
            <div key={entry.id} className="border-b border-slate-100 pb-2 text-sm last:border-0">
              <p className="font-medium text-slate-900">{entry.message}</p>
              <p className="text-xs text-slate-500">
                {entry.userDisplayName ?? entry.userId} · {formatDate(entry.createdAt)}
              </p>
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
