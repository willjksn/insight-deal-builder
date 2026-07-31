"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, ExternalLink } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import {
  getCreatorPortalStripeConnect,
  startCreatorPortalStripeConnect,
  openCreatorPortalStripeDashboard,
} from "@/lib/creators/apiClient";
import type { CreatorStripeConnectStatus } from "@/lib/creators/types";

export default function CreatorPortalPaymentPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const connectParam = searchParams.get("connect");

  const [connectConfigured, setConnectConfigured] = useState(false);
  const [connectReady, setConnectReady] = useState(false);
  const [connectAccountId, setConnectAccountId] = useState<string | null>(null);
  const [connectStatus, setConnectStatus] = useState<CreatorStripeConnectStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectBusy, setConnectBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectBanner, setConnectBanner] = useState<string | null>(null);

  const getToken = useCallback(async () => {
    if (!user) return null;
    return user.getIdToken();
  }, [user]);

  const reload = useCallback(async () => {
    const connect = await getCreatorPortalStripeConnect(getToken);
    setConnectConfigured(connect.configured);
    setConnectReady(connect.ready);
    setConnectAccountId(connect.accountId);
    setConnectStatus(connect.status ?? null);
  }, [getToken]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        if (connectParam === "return") {
          setConnectBanner("Welcome back — refreshing your Stripe Connect status…");
        } else if (connectParam === "refresh") {
          setConnectBanner("Your Stripe session expired. Continue onboarding below.");
        }
        await reload();
        if (connectParam === "return" && !cancelled) {
          setConnectBanner(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load payment setup");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, reload, connectParam]);

  const startConnect = async () => {
    setConnectBusy(true);
    setError(null);
    setConnectBanner(null);
    try {
      const { url } = await startCreatorPortalStripeConnect(getToken);
      window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start Stripe Connect");
      setConnectBusy(false);
    }
  };

  const openDashboard = async () => {
    setConnectBusy(true);
    setError(null);
    try {
      const { url } = await openCreatorPortalStripeDashboard(getToken);
      window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open Stripe dashboard");
      setConnectBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/creator-portal"
          className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-sky-700 hover:text-sky-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to portal
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Payment</h1>
        <p className="mt-1 text-sm text-slate-600">
          Connect Stripe so IMG can pay you. Bank and tax details stay with Stripe — ShootSpine does
          not store your banking information.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {connectBanner ? (
        <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          {connectBanner}
        </div>
      ) : null}

      {connectReady ? (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <p>Stripe Connect is ready for payouts.</p>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Stripe Connect</h2>
        </CardHeader>
        <CardBody className="space-y-3 text-sm text-slate-600">
          {!connectConfigured ? (
            <p>
              Stripe Connect is not configured for this environment yet. Ask IMG to enable it, then
              return here to connect.
            </p>
          ) : connectReady ? (
            <>
              <p>
                Your Express account is connected
                {connectAccountId ? (
                  <>
                    {" "}
                    (<span className="font-mono text-xs">{connectAccountId}</span>)
                  </>
                ) : null}
                . Manage bank and tax info in Stripe — not in ShootSpine.
              </p>
              <Button
                type="button"
                variant="outline"
                disabled={connectBusy}
                onClick={() => void openDashboard()}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                {connectBusy ? "Opening…" : "Open Stripe dashboard"}
              </Button>
            </>
          ) : (
            <>
              <p>
                Connect with Stripe Express. You&apos;ll complete identity and bank details on
                Stripe&apos;s site, then return here. IMG never sees or stores your bank account
                numbers.
              </p>
              {connectAccountId && !connectStatus?.detailsSubmitted ? (
                <p className="text-amber-800">
                  Onboarding started but not finished — continue to complete setup.
                </p>
              ) : null}
              <Button
                type="button"
                disabled={connectBusy}
                onClick={() => void startConnect()}
              >
                {connectBusy
                  ? "Redirecting…"
                  : connectAccountId
                    ? "Continue Stripe setup"
                    : "Connect with Stripe"}
              </Button>
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
