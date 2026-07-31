"use client";

import { useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  isStripeConnectReady,
  type CreatorStripeConnectStatus,
} from "@/lib/creators/types";
import { formatDateTime } from "@/lib/utils/format";

type Props = {
  stripeConnectAccountId?: string;
  stripeConnect?: CreatorStripeConnectStatus;
  canManage: boolean;
  onSync: () => Promise<void>;
  onRemind?: () => Promise<void>;
};

export function CreatorStripeConnectPanel({
  stripeConnectAccountId,
  stripeConnect,
  canManage,
  onSync,
  onRemind,
}: Props) {
  const [syncing, setSyncing] = useState(false);
  const [reminding, setReminding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remindOk, setRemindOk] = useState<string | null>(null);
  const ready = isStripeConnectReady({ stripeConnectAccountId, stripeConnect });

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Stripe Connect</h2>
        {ready ? (
          <Badge variant="success">Ready for payouts</Badge>
        ) : stripeConnectAccountId ? (
          <Badge variant="warning">Onboarding incomplete</Badge>
        ) : (
          <Badge variant="default">Not connected</Badge>
        )}
      </CardHeader>
      <CardBody className="space-y-3 text-sm text-slate-600">
        <p>
          Creators connect an Express account in the portal so IMG can pay them via Stripe
          Transfers. Bank details stay with Stripe — ShootSpine does not collect payee or banking
          information.
        </p>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-800">
            {error}
          </div>
        ) : null}

        {stripeConnectAccountId ? (
          <div className="space-y-1 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5">
            <p className="font-medium text-slate-900">
              Account <span className="font-mono text-xs">{stripeConnectAccountId}</span>
            </p>
            <p>
              Details submitted: {stripeConnect?.detailsSubmitted ? "Yes" : "No"} · Payouts:{" "}
              {stripeConnect?.payoutsEnabled ? "Enabled" : "Not yet"} · Charges:{" "}
              {stripeConnect?.chargesEnabled ? "Enabled" : "Not yet"}
            </p>
            {stripeConnect?.disabledReason ? (
              <p className="text-amber-800">Disabled: {stripeConnect.disabledReason}</p>
            ) : null}
            {stripeConnect?.updatedAt ? (
              <p className="text-xs text-slate-400">
                Synced {formatDateTime(stripeConnect.updatedAt)}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-slate-500">Creator has not started Stripe Connect yet.</p>
        )}

        {remindOk ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-900">
            {remindOk}
          </div>
        ) : null}

        {canManage ? (
          <div className="flex flex-wrap gap-2">
            {stripeConnectAccountId ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={syncing || reminding}
                onClick={() => {
                  void (async () => {
                    setSyncing(true);
                    setError(null);
                    setRemindOk(null);
                    try {
                      await onSync();
                    } catch (e) {
                      setError(e instanceof Error ? e.message : "Sync failed");
                    } finally {
                      setSyncing(false);
                    }
                  })();
                }}
              >
                {syncing ? "Syncing…" : "Refresh from Stripe"}
              </Button>
            ) : null}
            {!ready && onRemind ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={syncing || reminding}
                onClick={() => {
                  void (async () => {
                    setReminding(true);
                    setError(null);
                    setRemindOk(null);
                    try {
                      await onRemind();
                      setRemindOk("Reminder email sent.");
                    } catch (e) {
                      setError(e instanceof Error ? e.message : "Could not send reminder");
                    } finally {
                      setReminding(false);
                    }
                  })();
                }}
              >
                {reminding ? "Sending…" : "Email Connect reminder"}
              </Button>
            ) : null}
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}
