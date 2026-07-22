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
  onCampaignConcept,
  onVerify,
  onFindContact,
  onResolveContact,
}: {
  opportunity: RevenueOpportunity;
  canManage: boolean;
  busy?: boolean;
  onQualityReview: () => Promise<void>;
  onRevision: () => Promise<void>;
  onCampaignConcept: () => Promise<void>;
  onVerify?: () => Promise<void>;
  onFindContact?: () => Promise<void>;
  onResolveContact?: (action: "apply" | "dismiss") => Promise<void>;
}) {
  const review = opportunity.qualityReview;
  const revision = opportunity.revisionSuggestion;
  const verification = opportunity.verification;
  const contactSuggestion = opportunity.contactSuggestion;

  return (
    <Card>
      <CardHeader>
        <h3 className="font-semibold text-slate-900">AI agents</h3>
        <p className="text-xs text-slate-500">
          Quality review and revision use Gemini when live AI is configured; otherwise rule checks.
        </p>
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
            <Button size="touch" variant="outline" disabled={busy} onClick={onCampaignConcept}>
              Generate campaign concept
            </Button>
            {onVerify && (
              <Button size="touch" variant="outline" disabled={busy} onClick={onVerify}>
                Verify evidence
              </Button>
            )}
            {onFindContact && (
              <Button size="touch" variant="outline" disabled={busy} onClick={onFindContact}>
                Find decision-maker contact
              </Button>
            )}
          </div>
        )}

        {verification && (
          <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-sm">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="font-medium text-slate-900">Verification</span>
              <Badge
                variant={
                  verification.status === "verified"
                    ? "success"
                    : verification.status === "unverified"
                      ? "danger"
                      : "warning"
                }
              >
                {verification.status}
              </Badge>
              <Badge variant="info">{verification.verificationScore}/100</Badge>
              <Badge variant={verification.source === "ai" ? "info" : "default"}>
                {verification.source}
              </Badge>
            </div>
            <p className="text-slate-600">
              {verification.verifiedClaims.length} verified · {verification.unverifiedClaims.length}{" "}
              unverified · {verification.sourceDomains.length} source domain(s)
            </p>
            {verification.warnings.length > 0 && (
              <ul className="mt-2 list-inside list-disc text-amber-900">
                {verification.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {contactSuggestion && (
          <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-sm">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="font-medium text-slate-900">Suggested contact</span>
              <Badge
                variant={
                  contactSuggestion.status === "applied"
                    ? "success"
                    : contactSuggestion.status === "dismissed"
                      ? "default"
                      : "warning"
                }
              >
                {contactSuggestion.status}
              </Badge>
              <Badge variant={contactSuggestion.source === "ai" ? "info" : "default"}>
                {contactSuggestion.source}
              </Badge>
            </div>
            <p className="text-slate-700">
              {[
                contactSuggestion.contact.name,
                contactSuggestion.contact.title,
                contactSuggestion.contact.email,
                contactSuggestion.contact.phone,
              ]
                .filter(Boolean)
                .join(" · ") || "No details"}
            </p>
            {contactSuggestion.rationale && (
              <p className="mt-1 text-xs text-slate-500">{contactSuggestion.rationale}</p>
            )}
            {canManage && onResolveContact && contactSuggestion.status === "pending" && (
              <div className="mt-2 flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => onResolveContact("apply")}
                >
                  Apply to opportunity
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => onResolveContact("dismiss")}
                >
                  Dismiss
                </Button>
              </div>
            )}
            <p className="mt-2 text-xs text-slate-500">
              Applied only on approval — verify before outreach.
            </p>
          </div>
        )}

        {review && (
          <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-sm">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="font-medium text-slate-900">Latest quality review</span>
              <Badge variant={review.status === "passed" ? "success" : review.status === "failed" ? "danger" : "warning"}>
                {review.status ?? "pending"}
              </Badge>
              {review.source && (
                <Badge variant={review.source === "ai" ? "info" : "default"}>{review.source}</Badge>
              )}
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

        {revision && (
          <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-sm">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="font-medium text-slate-900">Revision suggestions</span>
              <Badge variant={revision.readyForReReview ? "success" : "warning"}>
                {revision.readyForReReview ? "ready for re-review" : "needs work"}
              </Badge>
              {revision.source && (
                <Badge variant={revision.source === "ai" ? "info" : "default"}>{revision.source}</Badge>
              )}
            </div>
            {revision.revisionNotes.length > 0 && (
              <ul className="mb-2 list-inside list-disc text-slate-700">
                {revision.revisionNotes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            )}
            {Object.keys(revision.suggestedFieldUpdates).length > 0 && (
              <div>
                <p className="mb-1 font-medium text-slate-800">Suggested field updates</p>
                <ul className="space-y-1 text-slate-700">
                  {Object.entries(revision.suggestedFieldUpdates).map(([field, value]) => (
                    <li key={field}>
                      <code className="text-xs text-sky-800">{field}</code>
                      <span className="text-slate-500"> → </span>
                      {value}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="mt-2 text-xs text-slate-500">Suggestions only — apply changes manually after review.</p>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
