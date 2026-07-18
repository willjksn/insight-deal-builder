"use client";

import { useEffect, useState } from "react";
import type { OpportunityContact, RevenueOpportunity } from "@/lib/revenueOpportunities/types/opportunity";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";

export type ContactSavePayload = {
  contact: OpportunityContact;
  publicEmail?: string;
  publicPhone?: string;
};

export function OpportunityContactPanel({
  opportunity,
  canManage,
  busy,
  onSave,
}: {
  opportunity: RevenueOpportunity;
  canManage: boolean;
  busy?: boolean;
  onSave: (patch: ContactSavePayload) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(opportunity.contact?.name ?? "");
  const [title, setTitle] = useState(opportunity.contact?.title ?? "");
  const [email, setEmail] = useState(opportunity.contact?.email ?? "");
  const [phone, setPhone] = useState(opportunity.contact?.phone ?? "");
  const [verificationStatus, setVerificationStatus] = useState<
    OpportunityContact["verificationStatus"]
  >(opportunity.contact?.verificationStatus ?? "unknown");
  const [publicEmail, setPublicEmail] = useState(opportunity.subject.publicEmail ?? "");
  const [publicPhone, setPublicPhone] = useState(opportunity.subject.publicPhone ?? "");

  useEffect(() => {
    setName(opportunity.contact?.name ?? "");
    setTitle(opportunity.contact?.title ?? "");
    setEmail(opportunity.contact?.email ?? "");
    setPhone(opportunity.contact?.phone ?? "");
    setVerificationStatus(opportunity.contact?.verificationStatus ?? "unknown");
    setPublicEmail(opportunity.subject.publicEmail ?? "");
    setPublicPhone(opportunity.subject.publicPhone ?? "");
    setEditing(false);
  }, [
    opportunity.id,
    opportunity.updatedAt,
    opportunity.contact?.name,
    opportunity.contact?.title,
    opportunity.contact?.email,
    opportunity.contact?.phone,
    opportunity.contact?.verificationStatus,
    opportunity.subject.publicEmail,
    opportunity.subject.publicPhone,
  ]);

  const contact = opportunity.contact;
  const hasContact =
    Boolean(contact?.name?.trim()) ||
    Boolean(contact?.email?.trim()) ||
    Boolean(contact?.phone?.trim()) ||
    Boolean(opportunity.subject.publicEmail?.trim()) ||
    Boolean(opportunity.subject.publicPhone?.trim());

  return (
    <Card>
      <CardHeader>
        <h3 className="font-semibold text-slate-900">Contact person</h3>
        <p className="text-xs text-slate-500">
          Decision-maker details for outreach and inbox matching.
        </p>
      </CardHeader>
      <CardBody className="space-y-3 text-sm">
        {!editing && (
          <>
            {!hasContact && <p className="text-slate-500">No contact on file yet.</p>}
            {hasContact && (
              <div className="space-y-2">
                <div>
                  <p className="text-xs font-medium text-slate-500">Decision maker</p>
                  <p className="text-slate-800">
                    {contact?.name?.trim() || "—"}
                    {contact?.title?.trim() ? ` · ${contact.title.trim()}` : ""}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Email</p>
                  <p className="text-slate-800">{contact?.email?.trim() || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Phone</p>
                  <p className="text-slate-800">{contact?.phone?.trim() || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Public company email / phone</p>
                  <p className="text-slate-800">
                    {[opportunity.subject.publicEmail, opportunity.subject.publicPhone]
                      .map((v) => v?.trim())
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </p>
                </div>
                {contact?.verificationStatus && contact.verificationStatus !== "unknown" && (
                  <p className="text-xs text-slate-500">
                    Verification: {contact.verificationStatus}
                  </p>
                )}
              </div>
            )}
            {canManage && (
              <Button size="sm" variant="outline" disabled={busy || saving} onClick={() => setEditing(true)}>
                Edit contact
              </Button>
            )}
          </>
        )}

        {editing && canManage && (
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              setSaving(true);
              try {
                await onSave({
                  contact: {
                    name: name.trim() || undefined,
                    title: title.trim() || undefined,
                    email: email.trim() || undefined,
                    phone: phone.trim() || undefined,
                    verificationStatus: verificationStatus ?? "unknown",
                    sourceUrl: opportunity.contact?.sourceUrl,
                  },
                  publicEmail: publicEmail.trim(),
                  publicPhone: publicPhone.trim(),
                });
                setEditing(false);
              } finally {
                setSaving(false);
              }
            }}
          >
            <Input label="Name" value={name} touch placeholder="Jordan Lee" onChange={(e) => setName(e.target.value)} />
            <Input
              label="Title"
              value={title}
              touch
              placeholder="Marketing Director"
              onChange={(e) => setTitle(e.target.value)}
            />
            <Input
              label="Email"
              type="email"
              value={email}
              touch
              placeholder="jordan@example.com"
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              label="Phone"
              value={phone}
              touch
              placeholder="(555) 555-0100"
              onChange={(e) => setPhone(e.target.value)}
            />
            <Select
              label="Verification"
              touch
              value={verificationStatus ?? "unknown"}
              onChange={(e) =>
                setVerificationStatus(e.target.value as OpportunityContact["verificationStatus"])
              }
              options={[
                { value: "unknown", label: "Unknown" },
                { value: "unverified", label: "Unverified" },
                { value: "verified", label: "Verified" },
              ]}
            />
            <Input
              label="Public company email"
              type="email"
              value={publicEmail}
              touch
              placeholder="hello@example.com"
              onChange={(e) => setPublicEmail(e.target.value)}
            />
            <Input
              label="Public company phone"
              value={publicPhone}
              touch
              placeholder="(555) 555-0199"
              onChange={(e) => setPublicPhone(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <Button type="submit" size="touch" disabled={busy || saving}>
                {saving ? "Saving…" : "Save contact"}
              </Button>
              <Button
                type="button"
                size="touch"
                variant="outline"
                disabled={saving}
                onClick={() => {
                  setName(opportunity.contact?.name ?? "");
                  setTitle(opportunity.contact?.title ?? "");
                  setEmail(opportunity.contact?.email ?? "");
                  setPhone(opportunity.contact?.phone ?? "");
                  setVerificationStatus(opportunity.contact?.verificationStatus ?? "unknown");
                  setPublicEmail(opportunity.subject.publicEmail ?? "");
                  setPublicPhone(opportunity.subject.publicPhone ?? "");
                  setEditing(false);
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
      </CardBody>
    </Card>
  );
}
