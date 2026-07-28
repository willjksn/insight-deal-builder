"use client";

import { useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import {
  CREATOR_APPLICATION_STATUS_LABELS,
  CREATOR_RELATIONSHIP_LABELS,
  isApprovedApplication,
  isOpenApplication,
  type Creator,
  type CreatorApplicationStatus,
  type CreatorRelationshipType,
} from "@/lib/creators/types";

const STATUS_OPTIONS = (
  Object.keys(CREATOR_APPLICATION_STATUS_LABELS) as CreatorApplicationStatus[]
).map((value) => ({ value, label: CREATOR_APPLICATION_STATUS_LABELS[value] }));

const PROMOTE_OPTIONS = (
  ["network", "represented", "ugc", "incubator", "campaign_only"] as CreatorRelationshipType[]
).map((value) => ({ value, label: CREATOR_RELATIONSHIP_LABELS[value] }));

type Props = {
  creator: Creator;
  canEdit: boolean;
  saving?: boolean;
  onSetStatus: (payload: {
    applicationStatus: CreatorApplicationStatus;
    reviewNotes?: string;
    promoteTo?: CreatorRelationshipType;
  }) => Promise<void>;
};

export function CreatorApplicationPanel({ creator, canEdit, saving, onSetStatus }: Props) {
  const [status, setStatus] = useState<CreatorApplicationStatus>(
    creator.applicationStatus ?? "submitted"
  );
  const [notes, setNotes] = useState(creator.applicationReviewNotes ?? "");
  const [promoteTo, setPromoteTo] = useState<CreatorRelationshipType>("network");
  const [busy, setBusy] = useState(false);

  if (!creator.applicationStatus && creator.relationshipType !== "applicant") {
    return null;
  }

  const open = isOpenApplication(creator.applicationStatus);
  const approved = isApprovedApplication(creator.applicationStatus);

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Application</h2>
        {creator.applicationStatus && (
          <Badge variant={approved ? "success" : open ? "info" : "default"}>
            {CREATOR_APPLICATION_STATUS_LABELS[creator.applicationStatus]}
          </Badge>
        )}
      </CardHeader>
      <CardBody className="space-y-4">
        {creator.applicationSubmittedAt && (
          <p className="text-sm text-slate-500">
            Submitted {new Date(creator.applicationSubmittedAt).toLocaleString()}
          </p>
        )}
        {canEdit ? (
          <>
            <Select
              label="Pipeline stage"
              value={status}
              options={STATUS_OPTIONS}
              onChange={(e) => setStatus(e.target.value as CreatorApplicationStatus)}
              touch
            />
            {isApprovedApplication(status) && (
              <Select
                label="Promote to"
                value={promoteTo}
                options={PROMOTE_OPTIONS}
                onChange={(e) => setPromoteTo(e.target.value as CreatorRelationshipType)}
                touch
              />
            )}
            <Textarea
              label="Review notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              touch
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="touch"
                disabled={busy || saving}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await onSetStatus({
                      applicationStatus: status,
                      reviewNotes: notes.trim() || undefined,
                      promoteTo: isApprovedApplication(status) ? promoteTo : undefined,
                    });
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {busy ? "Updating…" : "Update application"}
              </Button>
              {open && (
                <>
                  <Button
                    type="button"
                    size="touch"
                    variant="outline"
                    disabled={busy || saving}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        await onSetStatus({
                          applicationStatus: "approved",
                          reviewNotes: notes.trim() || undefined,
                          promoteTo,
                        });
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    Approve
                  </Button>
                  <Button
                    type="button"
                    size="touch"
                    variant="ghost"
                    disabled={busy || saving}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        await onSetStatus({
                          applicationStatus: "rejected",
                          reviewNotes: notes.trim() || undefined,
                        });
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    Reject
                  </Button>
                </>
              )}
            </div>
          </>
        ) : (
          creator.applicationReviewNotes && (
            <p className="text-sm text-slate-700 whitespace-pre-wrap">
              {creator.applicationReviewNotes}
            </p>
          )
        )}
      </CardBody>
    </Card>
  );
}
