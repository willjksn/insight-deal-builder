"use client";

import { useEffect, useState } from "react";
import type { RevenueOutreachActivity } from "@/lib/revenueOpportunities/types/outreach";
import { OUTREACH_CHANNEL_LABELS, OUTREACH_STATUS_LABELS } from "@/lib/revenueOpportunities/labels";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";

export function OutreachDraftCard({
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
  onSave: (
    id: string,
    patch: { subject?: string; body?: string; recipientName?: string; recipientEmail?: string }
  ) => Promise<void>;
  onCreateGmailDraft: (id: string) => Promise<void>;
}) {
  const [subject, setSubject] = useState(activity.subject ?? "");
  const [body, setBody] = useState(activity.body);
  const [recipientName, setRecipientName] = useState(activity.recipientName ?? "");
  const [recipientEmail, setRecipientEmail] = useState(activity.recipientEmail ?? "");
  const [notes, setNotes] = useState("");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setSubject(activity.subject ?? "");
    setBody(activity.body);
    setRecipientName(activity.recipientName ?? "");
    setRecipientEmail(activity.recipientEmail ?? "");
    setDirty(false);
  }, [activity.id, activity.subject, activity.body, activity.recipientName, activity.recipientEmail]);

  const editable = canManage && activity.status === "pending_review";
  const needsRecipient = activity.channel === "email" && !recipientEmail.trim();

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
        {activity.source === "ai_writer" ? (
          <Badge variant="info">AI Writer</Badge>
        ) : null}
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

      {activity.channel === "email" && (
        <div className="mb-2 grid gap-2 sm:grid-cols-2">
          <Input
            label="Recipient name"
            value={recipientName}
            disabled={!editable && activity.status !== "approved"}
            onChange={(e) => {
              setRecipientName(e.target.value);
              setDirty(true);
            }}
          />
          <Input
            label="Recipient email"
            type="email"
            value={recipientEmail}
            disabled={!editable && activity.status !== "approved"}
            onChange={(e) => {
              setRecipientEmail(e.target.value);
              setDirty(true);
            }}
            helperText={needsRecipient ? "Required before Create Gmail draft" : undefined}
          />
        </div>
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
                onClick={() =>
                  onSave(activity.id, {
                    subject: subject || undefined,
                    body,
                    recipientName: recipientName || undefined,
                    recipientEmail: recipientEmail || undefined,
                  })
                }
              >
                Save edits
              </Button>
            )}
            <Button size="sm" disabled={busy} onClick={() => onApprove(activity.id, notes || undefined)}>
              Approve draft
            </Button>
            <Button
              size="sm"
              variant="danger"
              disabled={busy}
              onClick={() => onReject(activity.id, notes || undefined)}
            >
              Reject
            </Button>
          </div>
        </>
      )}

      {canManage && activity.status === "approved" && activity.channel === "email" && (
        <div className="mt-2 space-y-2">
          {dirty && (
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() =>
                onSave(activity.id, {
                  subject: subject || undefined,
                  body,
                  recipientName: recipientName || undefined,
                  recipientEmail: recipientEmail || undefined,
                })
              }
            >
              Save recipient
            </Button>
          )}
          <Button
            size="sm"
            variant="secondary"
            disabled={busy || needsRecipient || dirty}
            onClick={() => onCreateGmailDraft(activity.id)}
          >
            Create Gmail draft
          </Button>
          {dirty ? (
            <p className="text-xs text-amber-800">Save recipient changes before creating the Gmail draft.</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
