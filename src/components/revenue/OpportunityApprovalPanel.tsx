"use client";

import { useState } from "react";
import { RevenueOpportunity } from "@/lib/revenueOpportunities/types/opportunity";
import type { RevenueRejectionReason } from "@/lib/revenueOpportunities/types";
import { REJECTION_REASON_LABELS } from "@/lib/revenueOpportunities/labels";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";

export function OpportunityApprovalPanel({
  opportunity,
  canManage,
  onApprove,
  onReject,
  busy,
}: {
  opportunity: RevenueOpportunity;
  canManage: boolean;
  onApprove: (notes?: string) => Promise<void>;
  onReject: (reason: RevenueRejectionReason, notes?: string, revisitLater?: boolean) => Promise<void>;
  busy?: boolean;
}) {
  const [notes, setNotes] = useState("");
  const [reason, setReason] = useState<RevenueRejectionReason>("poor_fit");
  const [revisitLater, setRevisitLater] = useState(false);

  if (!canManage) return null;
  if (opportunity.workflow.approvalStatus !== "pending") {
    return (
      <Card>
        <CardBody className="text-sm text-slate-600">
          Approval status: <strong className="text-slate-900">{opportunity.workflow.approvalStatus}</strong>
          {opportunity.rejectionReason && (
            <p className="mt-1">Reason: {REJECTION_REASON_LABELS[opportunity.rejectionReason]}</p>
          )}
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <h3 className="font-semibold text-slate-900">Approval workspace</h3>
      </CardHeader>
      <CardBody className="space-y-4">
        <Textarea
          label="Review notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Why approve or reject this opportunity?"
        />
        <div className="flex flex-wrap gap-3">
          <Button size="touch" disabled={busy} onClick={() => onApprove(notes || undefined)}>
            Approve for outreach
          </Button>
        </div>
        <div className="border-t border-slate-100 pt-4">
          <Select
            label="Rejection reason"
            value={reason}
            onChange={(e) => setReason(e.target.value as RevenueRejectionReason)}
            options={Object.entries(REJECTION_REASON_LABELS).map(([value, label]) => ({ value, label }))}
          />
          <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={revisitLater}
              onChange={(e) => setRevisitLater(e.target.checked)}
              className="rounded border-slate-300"
            />
            Revisit later (keep in pipeline)
          </label>
          <Button
            variant="danger"
            className="mt-3"
            disabled={busy}
            onClick={() => onReject(reason, notes || undefined, revisitLater)}
          >
            Reject opportunity
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
