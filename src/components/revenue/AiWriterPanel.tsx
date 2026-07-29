"use client";

import { useState } from "react";
import type { RevenueOutreachActivity } from "@/lib/revenueOpportunities/types/outreach";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { OutreachDraftCard } from "@/components/revenue/OutreachDraftCard";

export function AiWriterPanel({
  canManage,
  busy,
  drafts,
  onGenerate,
  onApprove,
  onReject,
  onSave,
  onCreateGmailDraft,
}: {
  canManage: boolean;
  busy?: boolean;
  drafts: RevenueOutreachActivity[];
  onGenerate: (input: {
    brief: string;
    toEmail?: string;
    toName?: string;
    subjectHint?: string;
    tone?: "professional" | "warm" | "concise";
  }) => Promise<void>;
  onApprove: (id: string, notes?: string) => Promise<void>;
  onReject: (id: string, notes?: string) => Promise<void>;
  onSave: (
    id: string,
    patch: { subject?: string; body?: string; recipientName?: string; recipientEmail?: string }
  ) => Promise<void>;
  onCreateGmailDraft: (id: string) => Promise<void>;
}) {
  const [brief, setBrief] = useState("");
  const [toName, setToName] = useState("");
  const [toEmail, setToEmail] = useState("");
  const [subjectHint, setSubjectHint] = useState("");
  const [tone, setTone] = useState<"professional" | "warm" | "concise">("professional");
  const [localError, setLocalError] = useState<string | null>(null);

  if (!canManage) {
    return null;
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <h2 className="font-semibold text-slate-900">AI Writer</h2>
        <p className="text-xs text-slate-500">
          Describe what you want written. AI drafts the email — you edit, approve, then create a Gmail draft.
        </p>
      </CardHeader>
      <CardBody className="space-y-4">
        <Textarea
          label="What should this email say?"
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          rows={5}
          placeholder="e.g. Follow up with the hotel marketing lead about last week’s discovery call. Thank them, recap the brand-film idea, and ask for a 15-minute slot next week."
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input label="To name (optional)" value={toName} onChange={(e) => setToName(e.target.value)} />
          <Input
            label="To email (optional)"
            type="email"
            value={toEmail}
            onChange={(e) => setToEmail(e.target.value)}
            helperText="You can add this before Gmail draft"
          />
          <Input
            label="Subject hint (optional)"
            value={subjectHint}
            onChange={(e) => setSubjectHint(e.target.value)}
          />
          <Select
            label="Tone"
            value={tone}
            onChange={(e) => setTone(e.target.value as "professional" | "warm" | "concise")}
            options={[
              { value: "professional", label: "Professional" },
              { value: "warm", label: "Warm" },
              { value: "concise", label: "Concise" },
            ]}
          />
        </div>
        {localError && <p className="text-sm text-red-600">{localError}</p>}
        <Button
          size="touch"
          disabled={busy || !brief.trim()}
          onClick={async () => {
            setLocalError(null);
            try {
              await onGenerate({
                brief: brief.trim(),
                toName: toName.trim() || undefined,
                toEmail: toEmail.trim() || undefined,
                subjectHint: subjectHint.trim() || undefined,
                tone,
              });
            } catch (e) {
              setLocalError(e instanceof Error ? e.message : "Failed to draft email");
            }
          }}
        >
          {busy ? "Writing…" : "Craft email"}
        </Button>

        {drafts.length > 0 && (
          <div className="space-y-3 border-t border-slate-100 pt-4">
            <p className="text-sm font-medium text-slate-800">Your drafts to approve</p>
            {drafts.map((a) => (
              <OutreachDraftCard
                key={a.id}
                activity={a}
                canManage={canManage}
                busy={busy}
                onApprove={onApprove}
                onReject={onReject}
                onSave={onSave}
                onCreateGmailDraft={onCreateGmailDraft}
              />
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
