"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  revenueConnectGmail,
  revenueDisconnectGmail,
  revenueGetGmailStatus,
} from "@/lib/revenueOpportunities/apiClient";
import { canManageRevenueOpportunities } from "@/lib/utils/permissions";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export default function RevenueSettingsPage() {
  const { user, appUser } = useAuth();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<{
    configured: boolean;
    mode: "not_configured" | "mock" | "live";
    connected: boolean;
    email?: string;
  } | null>(null);
  const canManage = canManageRevenueOpportunities(appUser);
  const gmailParam = searchParams.get("gmail");

  const reload = async () => {
    if (!user) return;
    const res = await revenueGetGmailStatus(() => user.getIdToken());
    setStatus(res);
  };

  useEffect(() => {
    if (!user) return;
    reload()
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [user]);

  return (
    <>
      <Link href="/revenue" className="mb-4 inline-flex items-center text-sm text-sky-700 hover:underline">
        <ArrowLeft className="mr-1 h-4 w-4" />
        Command center
      </Link>
      <PageHeader title="Settings" subtitle="Gmail connection, approval modes, and integration status." />
      {gmailParam === "connected" && (
        <p className="mb-4 text-sm text-emerald-700">Gmail connected successfully.</p>
      )}
      {gmailParam === "error" && (
        <p className="mb-4 text-sm text-red-600">
          Gmail connection failed: {searchParams.get("reason") ?? "unknown error"}
        </p>
      )}
      {loading && <LoadingSpinner />}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {status && (
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-slate-900">Gmail</h3>
            <p className="text-xs text-slate-500">OAuth for inbox sync and draft creation. Sending stays human-approved.</p>
          </CardHeader>
          <CardBody className="space-y-4 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-slate-600">Mode:</span>
              <Badge variant={status.mode === "live" ? "success" : status.mode === "mock" ? "warning" : "default"}>
                {status.mode}
              </Badge>
              {status.connected && status.email && (
                <span className="text-slate-700">Connected as {status.email}</span>
              )}
            </div>
            {!status.configured && status.mode !== "mock" && (
              <p className="text-slate-600">
                Set <code className="text-xs">GOOGLE_CLIENT_ID</code>,{" "}
                <code className="text-xs">GOOGLE_CLIENT_SECRET</code>, and{" "}
                <code className="text-xs">GOOGLE_REDIRECT_URI</code> for live Gmail. Mock inbox works when{" "}
                <code className="text-xs">SCOUT_USE_MOCK_AI=true</code>.
              </p>
            )}
            {canManage && status.mode === "live" && (
              <div className="flex flex-wrap gap-3">
                {!status.connected ? (
                  <Button
                    size="touch"
                    disabled={busy || !status.configured}
                    onClick={async () => {
                      if (!user) return;
                      setBusy(true);
                      setError(null);
                      try {
                        const res = await revenueConnectGmail(() => user.getIdToken());
                        window.location.href = res.url;
                      } catch (e) {
                        setError(e instanceof Error ? e.message : "Connect failed");
                        setBusy(false);
                      }
                    }}
                  >
                    Connect Gmail
                  </Button>
                ) : (
                  <Button
                    size="touch"
                    variant="outline"
                    disabled={busy}
                    onClick={async () => {
                      if (!user) return;
                      setBusy(true);
                      setError(null);
                      try {
                        await revenueDisconnectGmail(() => user.getIdToken());
                        await reload();
                      } catch (e) {
                        setError(e instanceof Error ? e.message : "Disconnect failed");
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    Disconnect Gmail
                  </Button>
                )}
              </div>
            )}
          </CardBody>
        </Card>
      )}
    </>
  );
}
