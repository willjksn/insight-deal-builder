"use client";

import { useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  isApprovedApplication,
  type Creator,
} from "@/lib/creators/types";

type Props = {
  creator: Creator;
  canEdit: boolean;
  onSendInvite: () => Promise<{ inviteUrl: string; expiresAt: string; emailSent: boolean }>;
  onCreatorRefresh?: (patch: Partial<Creator>) => void;
};

export function CreatorPortalInviteCard({
  creator,
  canEdit,
  onSendInvite,
  onCreatorRefresh,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    inviteUrl: string;
    expiresAt: string;
    emailSent: boolean;
  } | null>(null);

  const approved =
    isApprovedApplication(creator.applicationStatus) ||
    (creator.relationshipType !== "applicant" && creator.status === "active");

  if (!approved && !creator.linkedUserId) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">ShootSpine portal</h2>
        {creator.linkedUserId ? (
          <Badge variant="success">Linked</Badge>
        ) : creator.inviteSentAt ? (
          <Badge variant="info">Invite sent</Badge>
        ) : (
          <Badge>Not invited</Badge>
        )}
      </CardHeader>
      <CardBody className="space-y-3 text-sm text-slate-700">
        {creator.linkedUserId ? (
          <p>
            This creator has a linked ShootSpine account and can use the creator portal.
          </p>
        ) : (
          <>
            <p>
              After approval, send an invite so they can create a ShootSpine login and access
              their profile, campaigns, and onboarding checklist.
            </p>
            {creator.inviteSentAt && (
              <p className="text-slate-500">
                Last invite sent {new Date(creator.inviteSentAt).toLocaleString()}
                {creator.inviteExpiresAt
                  ? ` · expires ${new Date(creator.inviteExpiresAt).toLocaleDateString()}`
                  : ""}
              </p>
            )}
            {canEdit && (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="touch"
                  disabled={busy || !creator.email?.trim()}
                  onClick={async () => {
                    setBusy(true);
                    setError(null);
                    setResult(null);
                    try {
                      const res = await onSendInvite();
                      setResult(res);
                      onCreatorRefresh?.({
                        inviteSentAt: new Date().toISOString(),
                        inviteExpiresAt: res.expiresAt,
                      });
                    } catch (e) {
                      setError(e instanceof Error ? e.message : "Invite failed");
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  {busy
                    ? "Sending…"
                    : creator.inviteSentAt
                      ? "Resend ShootSpine invite"
                      : "Send ShootSpine invite"}
                </Button>
              </div>
            )}
            {!creator.email?.trim() && (
              <p className="text-amber-800">Add an email on this creator before inviting.</p>
            )}
          </>
        )}
        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-800">
            {error}
          </p>
        )}
        {result && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-900">
            <p>
              {result.emailSent
                ? "Invite email sent."
                : "Invite created (email not sent — check Resend config)."}
            </p>
            <p className="mt-1 break-all text-xs">
              Link:{" "}
              <a href={result.inviteUrl} className="underline" target="_blank" rel="noreferrer">
                {result.inviteUrl}
              </a>
            </p>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
