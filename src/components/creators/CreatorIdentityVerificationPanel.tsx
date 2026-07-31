"use client";

import { useState } from "react";
import { CheckCircle2, Clock, IdCard, XCircle } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import type { CreatorIdentityVerification } from "@/lib/creators/types";
import { formatDateTime } from "@/lib/utils/format";

type Props = {
  verification?: CreatorIdentityVerification;
  canEdit: boolean;
  canViewSensitive: boolean;
  saving?: boolean;
  onApprove: () => Promise<void>;
  onReject: (reason: string) => Promise<void>;
  onView: (side: "front" | "back") => Promise<void>;
};

export function CreatorIdentityVerificationPanel({
  verification,
  canEdit,
  canViewSensitive,
  saving,
  onApprove,
  onReject,
  onView,
}: Props) {
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const status = verification?.status ?? "none";

  const badge =
    status === "approved" ? (
      <Badge variant="success">Approved</Badge>
    ) : status === "pending" ? (
      <Badge variant="warning">Pending review</Badge>
    ) : status === "rejected" ? (
      <Badge variant="danger">Rejected</Badge>
    ) : (
      <Badge variant="default">Not submitted</Badge>
    );

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">ID verification</h2>
        {badge}
      </CardHeader>
      <CardBody className="space-y-3 text-sm text-slate-600">
        <p>
          Creators upload government ID in the portal. Approving marks onboarding “ID verification
          complete.”
        </p>

        {status === "none" ? (
          <p className="text-slate-500">No ID submitted yet.</p>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5 space-y-1">
            <div className="flex items-start gap-2">
              {status === "approved" ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              ) : status === "pending" ? (
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              ) : status === "rejected" ? (
                <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
              ) : (
                <IdCard className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              )}
              <div className="space-y-0.5">
                {verification?.submittedAt ? (
                  <p>Submitted {formatDateTime(verification.submittedAt)}</p>
                ) : null}
                {verification?.reviewedAt ? (
                  <p>
                    Reviewed {formatDateTime(verification.reviewedAt)}
                    {verification.reviewedByDisplayName
                      ? ` by ${verification.reviewedByDisplayName}`
                      : ""}
                  </p>
                ) : null}
                {verification?.rejectionReason ? (
                  <p className="text-red-700">Reason: {verification.rejectionReason}</p>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {(verification?.frontDocumentId || verification?.backDocumentId) && canViewSensitive ? (
          <div className="flex flex-wrap gap-2">
            {verification.frontDocumentId ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={saving}
                onClick={() => void onView("front")}
              >
                View front
              </Button>
            ) : null}
            {verification.backDocumentId ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={saving}
                onClick={() => void onView("back")}
              >
                View back
              </Button>
            ) : null}
          </div>
        ) : null}

        {canEdit && status === "pending" ? (
          <div className="space-y-2 pt-1">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                disabled={saving}
                onClick={() => void onApprove()}
              >
                Approve ID
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={saving}
                onClick={() => setShowReject((v) => !v)}
              >
                Reject
              </Button>
            </div>
            {showReject ? (
              <div className="space-y-2">
                <Input
                  label="Rejection reason"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Image too blurry — please resubmit"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="danger"
                  disabled={saving || rejectReason.trim().length < 3}
                  onClick={async () => {
                    await onReject(rejectReason.trim());
                    setShowReject(false);
                    setRejectReason("");
                  }}
                >
                  Confirm reject
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}
