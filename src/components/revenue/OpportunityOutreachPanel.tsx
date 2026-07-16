"use client";

import { useEffect, useState } from "react";
import type { RevenueOpportunity } from "@/lib/revenueOpportunities/types/opportunity";
import type { RevenueOutreachActivity } from "@/lib/revenueOpportunities/types/outreach";
import { OUTREACH_CHANNEL_LABELS, OUTREACH_STATUS_LABELS } from "@/lib/revenueOpportunities/labels";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Textarea } from "@/components/ui/Textarea";

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
  onSaveDraft: (id: string, patch: { subject?: string; body?: string }) => Promise<void>;
  onCreateGmailDraft: (id: string) => Promise<void>;
}) {
  const approved = opportunity.workflow.approvalStatus === "approved";
  const pending = activities.filter((a) => a.status === "pending_review");

  return (
    <Card>
      <CardHeader>
        <h3 className="font-semibold text-slate-900">Outreach drafts</h3>
        <p className="text-xs text-slate-500">
          Generate email, LinkedIn, and Instagram drafts for human approval. Sending arrives in Phase 6.
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

function OutreachDraftCard({
  activity,
  canManage,
  busy,
  onApprove,
  onReject,
  onSave,
  onCreateGmailDraft,
}: {
  activity: RevenueOutreachActivity;
  canManage: boolean;
  busy?: boolean;
  onApprove: (id: string, notes?: string) => Promise<void>;
  onReject: (id: string, notes?: string) => Promise<void>;
  onSave: (id: string, patch: { subject?: string; body?: string }) => Promise<void>;
  onCreateGmailDraft: (id: string) => Promise<void>;
}) {
  const [subject, setSubject] = useState(activity.subject ?? "");
  const [body, setBody] = useState(activity.body);
  const [notes, setNotes] = useState("");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setSubject(activity.subject ?? "");
    setBody(activity.body);
    setDirty(false);
  }, [activity.id, activity.subject, activity.body]);

  const editable = canManage && activity.status === "pending_review";

  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-sm">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="font-medium text-slate-900">{OUTREACH_CHANNEL_LABELS[activity.channel]}</span>
        <Badge
          variant={
            activity.status === "approved"
              ? "success"
              : activity.status === "rejected"
                ? "danger"
                : activity.status === "pending_review"
                  ? "warning"
                  : "default"
          }
        >
          {OUTREACH_STATUS_LABELS[activity.status]}
        </Badge>
      </div>

      {activity.channel === "email" && (
        <input
          type="text"
          className="mb-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-100"
          value={subject}
          disabled={!editable}
          onChange={(e) => {
            setSubject(e.target.value);
            setDirty(true);
          }}
          placeholder="Email subject"
        />
      )}

      <Textarea
        value={body}
        disabled={!editable}
        onChange={(e) => {
          setBody(e.target.value);
          setDirty(true);
        }}
        rows={6}
        className="mb-2 font-mono text-xs"
      />

      {activity.recipientEmail && (
        <p className="mb-2 text-xs text-slate-500">To: {activity.recipientName ?? activity.recipientEmail}</p>
      )}

      {editable && (
        <>
          <Textarea
            label="Review notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="mb-2"
          />
          <div className="flex flex-wrap gap-2">
            {dirty && (
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => onSave(activity.id, { subject: subject || undefined, body })}
              >
                Save edits
              </Button>
            )}
            <Button size="sm" disabled={busy} onClick={() => onApprove(activity.id, notes || undefined)}>
              Approve draft
            </Button>
            <Button size="sm" variant="danger" disabled={busy} onClick={() => onReject(activity.id, notes || undefined)}>
              Reject
            </Button>
          </div>
        </>
      )}

      {canManage && activity.status === "approved" && activity.channel === "email" && (
        <Button size="sm" variant="secondary" disabled={busy} onClick={() => onCreateGmailDraft(activity.id)}>
          Create Gmail draft
        </Button>
      )}
    </div>
  );
}
