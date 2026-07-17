"use client";

import Link from "next/link";
import type { RevenueOpportunityProposal } from "@/lib/revenueOpportunities/types/proposal";
import { PROPOSAL_STATUS_LABELS } from "@/lib/revenueOpportunities/labels";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils/format";

export function OpportunityProposalPanel({
  proposals,
  canManage,
  busy,
  onGenerate,
  onReload,
}: {
  proposals: RevenueOpportunityProposal[];
  canManage: boolean;
  busy?: boolean;
  onGenerate: () => Promise<void>;
  onReload: () => Promise<void>;
}) {
  const latest = proposals[0];

  return (
    <Card>
      <CardHeader>
        <h3 className="font-semibold text-slate-900">Proposals</h3>
        <p className="text-xs text-slate-500">Draft scope and investment, then open the agreement wizard with prefill.</p>
      </CardHeader>
      <CardBody className="space-y-4 text-sm">
        {canManage && (
          <Button size="touch" variant="secondary" disabled={busy} onClick={onGenerate}>
            Generate proposal draft
          </Button>
        )}

        {!latest && <p className="text-slate-600">No proposal drafts yet.</p>}

        {latest && (
          <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="font-medium text-slate-900">{latest.title}</span>
              <Badge variant="default">{PROPOSAL_STATUS_LABELS[latest.status]}</Badge>
            </div>
            <p className="mb-2 text-slate-700">{latest.executiveSummary}</p>
            <p className="mb-2 whitespace-pre-wrap text-slate-600">{latest.scopeOutline}</p>
            {(latest.investmentMin || latest.investmentMax) && (
              <p className="mb-2 font-medium text-slate-800">
                Investment:{" "}
                {latest.investmentMin && latest.investmentMax
                  ? `${formatCurrency(latest.investmentMin)} – ${formatCurrency(latest.investmentMax)}`
                  : formatCurrency(latest.investmentMin ?? latest.investmentMax ?? 0)}
              </p>
            )}
            {latest.deliverables.length > 0 && (
              <ul className="mb-3 list-inside list-disc text-slate-700">
                {latest.deliverables.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            )}
            {canManage && latest.agreementPrefill && (
              <Link href={`/agreements/new?revenueProposalId=${encodeURIComponent(latest.id)}`}>
                <Button size="sm" variant="outline">
                  Open in agreement wizard
                </Button>
              </Link>
            )}
          </div>
        )}

        {proposals.length > 0 && (
          <button type="button" className="text-xs text-sky-700 hover:underline" onClick={() => onReload()}>
            Refresh proposals
          </button>
        )}
      </CardBody>
    </Card>
  );
}
