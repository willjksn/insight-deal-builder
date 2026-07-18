"use client";

import { useEffect, useState } from "react";
import type { RevenueOpportunity } from "@/lib/revenueOpportunities/types/opportunity";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";

function normalizeWebsite(value: string): string | undefined {
  const t = value.trim();
  if (!t) return undefined;
  if (/^https?:\/\//i.test(t)) return t;
  if (/^[a-z0-9][a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(t)) return `https://${t}`;
  return t;
}

export function OpportunitySubjectLinksPanel({
  opportunity,
  canManage,
  busy,
  onSave,
}: {
  opportunity: RevenueOpportunity;
  canManage: boolean;
  busy?: boolean;
  onSave: (patch: { website?: string; socialLinks?: string }) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [website, setWebsite] = useState(opportunity.subject.website ?? "");
  const [socialLinks, setSocialLinks] = useState(opportunity.subject.socialLinks ?? "");

  useEffect(() => {
    setWebsite(opportunity.subject.website ?? "");
    setSocialLinks(opportunity.subject.socialLinks ?? "");
    setEditing(false);
  }, [opportunity.id, opportunity.subject.website, opportunity.subject.socialLinks, opportunity.updatedAt]);

  const websiteDisplay =
    opportunity.subject.website && /^https?:\/\//i.test(opportunity.subject.website)
      ? opportunity.subject.website
      : null;
  const socialDisplay = opportunity.subject.socialLinks?.trim() || null;

  return (
    <Card>
      <CardHeader>
        <h3 className="font-semibold text-slate-900">Website & social</h3>
        <p className="text-xs text-slate-500">Add or correct links for outreach and research follow-up.</p>
      </CardHeader>
      <CardBody className="space-y-3 text-sm">
        {!editing && (
          <>
            <div>
              <p className="text-xs font-medium text-slate-500">Website</p>
              {websiteDisplay ? (
                <a
                  href={websiteDisplay}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all text-sky-700 hover:underline"
                >
                  {websiteDisplay}
                </a>
              ) : (
                <p className="text-slate-500">Not set</p>
              )}
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Social handles / links</p>
              {socialDisplay ? (
                <p className="whitespace-pre-wrap text-slate-800">{socialDisplay}</p>
              ) : (
                <p className="text-slate-500">Not set</p>
              )}
            </div>
            {canManage && (
              <Button size="sm" variant="outline" disabled={busy || saving} onClick={() => setEditing(true)}>
                Edit links
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
                  website: normalizeWebsite(website) ?? "",
                  socialLinks: socialLinks.trim(),
                });
                setEditing(false);
              } finally {
                setSaving(false);
              }
            }}
          >
            <Input
              label="Website"
              value={website}
              touch
              placeholder="https://example.com"
              onChange={(e) => setWebsite(e.target.value)}
            />
            <Textarea
              label="Social handles / links"
              value={socialLinks}
              touch
              rows={3}
              placeholder={"Instagram: @brand\nTikTok: @brand\nhttps://linkedin.com/company/..."}
              onChange={(e) => setSocialLinks(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <Button type="submit" size="touch" disabled={busy || saving}>
                {saving ? "Saving…" : "Save links"}
              </Button>
              <Button
                type="button"
                size="touch"
                variant="outline"
                disabled={saving}
                onClick={() => {
                  setWebsite(opportunity.subject.website ?? "");
                  setSocialLinks(opportunity.subject.socialLinks ?? "");
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
