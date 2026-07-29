"use client";

import type { RevenueOpportunity } from "@/lib/revenueOpportunities/types/opportunity";
import type { RevenueOutreachActivity } from "@/lib/revenueOpportunities/types/outreach";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { OutreachDraftCard } from "@/components/revenue/OutreachDraftCard";

export function OpportunityOutreachPanel({
  opportunity,
  canManage,
  busy,
  activities,
  onGenerate,
  onReload,
  onApprove,
  onReject,
  onSaveDraft,
  onCreateGmailDraft,
}: {
  opportunity: RevenueOpportunity;
  canManage: boolean;
  busy?: boolean;
  activities: RevenueOutreachActivity[];
  onGenerate: () => Promise<void>;
  onReload: () => Promise<void>;
  onApprove: (id: string, notes?: string) => Promise<void>;
  onReject: (id: string, notes?: string) => Promise<void>;
  onSaveDraft: (
    id: string,
    patch: { subject?: string; body?: string; recipientName?: string; recipientEmail?: string }
  ) => Promise<void>;
  onCreateGmailDraft: (id: string) => Promise<void>;
}) {
  const approved = opportunity.workflow.approvalStatus === "approved";
  const pending = activities.filter((a) => a.status === "pending_review");

  return (
    <Card>
      <CardHeader>
        <h3 className="font-semibold text-slate-900">Outreach drafts</h3>
        <p className="text-xs text-slate-500">
          Generate email, LinkedIn, and Instagram drafts for human approval. Create a Gmail draft when ready — you
          send from Gmail.
        </p>
      </CardHeader>
      <CardBody className="space-y-4">
        {canManage && approved && (
          <Button size="touch" variant="secondary" disabled={busy} onClick={onGenerate}>
            Generate outreach drafts
          </Button>
        )}
        {!approved && canManage && (
          <p className="text-sm text-amber-800">Approve this opportunity before generating outreach.</p>
        )}

        {activities.length === 0 ? (
          <p className="text-sm text-slate-600">No drafts yet.</p>
        ) : (
          <div className="space-y-4">
            {activities.map((a) => (
              <OutreachDraftCard
                key={a.id}
                activity={a}
                canManage={canManage}
                busy={busy}
                onApprove={onApprove}
                onReject={onReject}
                onSave={onSaveDraft}
                onCreateGmailDraft={onCreateGmailDraft}
              />
            ))}
          </div>
        )}

        {pending.length > 0 && (
          <button type="button" className="text-xs text-sky-700 hover:underline" onClick={() => onReload()}>
            Refresh drafts
          </button>
        )}
      </CardBody>
    </Card>
  );
}
