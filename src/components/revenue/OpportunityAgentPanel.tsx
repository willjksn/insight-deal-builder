"use client";

import { RevenueOpportunity } from "@/lib/revenueOpportunities/types/opportunity";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export function OpportunityAgentPanel({
  opportunity,
  canManage,
  busy,
  onQualityReview,
  onRevision,
}: {
  opportunity: RevenueOpportunity;
  canManage: boolean;
  busy?: boolean;
  onQualityReview: () => Promise<void>;
  onRevision: () => Promise<void>;
}) {
  const review = opportunity.qualityReview;

  return (
    <Card>
      <CardHeader>
        <h3 className="font-semibold text-slate-900">AI agents</h3>
        <p className="text-xs text-slate-500">Phase 3 stub agents — rule-based until Phase 4 research integration.</p>
      </CardHeader>
      <CardBody className="space-y-4">
        {canManage && (
          <div className="flex flex-col gap-2">
            <Button size="touch" variant="secondary" disabled={busy} onClick={onQualityReview}>
              Run quality review
            </Button>
            <Button size="touch" variant="outline" disabled={busy} onClick={onRevision}>
              Get revision suggestions
            </Button>
          </div>
        )}

        {review && (
          <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-sm">
            <div className="mb-2 flex items-center gap-2">
              <span className="font-medium text-slate-900">Latest quality review</span>
              <Badge variant={review.status === "passed" ? "success" : review.status === "failed" ? "danger" : "warning"}>
                {review.status ?? "pending"}
              </Badge>
            </div>
            {review.issues?.length ? (
              <ul className="mb-2 list-inside list-disc text-red-800">
                {review.issues.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            ) : null}
            {review.verificationWarnings?.length ? (
              <ul className="mb-2 list-inside list-disc text-amber-900">
                {review.verificationWarnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            ) : null}
            {review.recommendedCorrections?.length ? (
              <div>
                <p className="font-medium text-slate-800">Recommended corrections</p>
                <ul className="list-inside list-disc text-slate-700">
                  {review.recommendedCorrections.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
