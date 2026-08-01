"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  revenueGetTodayBrief,
  revenueRefreshDailyBrief,
} from "@/lib/revenueOpportunities/apiClient";
import type { RevenueDailyBrief } from "@/lib/revenueOpportunities/types/dailyBrief";
import { formatCurrency } from "@/lib/utils/format";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export function DailyBriefCard({
  getToken,
  canManage,
}: {
  getToken: () => Promise<string | null>;
  canManage: boolean;
}) {
  const [brief, setBrief] = useState<RevenueDailyBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await revenueGetTodayBrief(getToken);
      setBrief(res.brief);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load daily brief");
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const refresh = async () => {
    if (!canManage) return;
    setBusy(true);
    setError(null);
    try {
      const res = await revenueRefreshDailyBrief(getToken);
      setBrief(res.brief);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Refresh failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="mb-8 border-sky-100 bg-gradient-to-br from-sky-50/80 to-white">
      <CardHeader className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-slate-900">Today&apos;s brief</h3>
            {brief ? (
              <Badge variant={brief.source === "n8n" ? "warning" : "info"}>
                {brief.source === "n8n" ? "n8n" : "live"}
              </Badge>
            ) : null}
          </div>
          <p className="text-xs text-slate-500">
            Persisted priorities for {brief?.briefDate ?? "today"} — refresh after pipeline changes.
          </p>
        </div>
        {canManage ? (
          <Button size="sm" variant="outline" disabled={busy || loading} onClick={() => void refresh()}>
            {busy ? "Refreshing…" : "Refresh brief"}
          </Button>
        ) : null}
      </CardHeader>
      <CardBody className="space-y-3 text-sm">
        {loading && <p className="text-slate-500">Loading brief…</p>}
        {error && <p className="text-red-600">{error}</p>}
        {brief && !loading ? (
          <>
            <p className="text-base font-medium text-slate-900">{brief.headline}</p>
            <p className="text-slate-600">{brief.summary}</p>
            <ul className="space-y-1.5">
              {brief.priorities.map((p) => (
                <li key={p.id}>
                  {p.href ? (
                    <Link href={p.href} className="font-medium text-sky-700 hover:underline">
                      {p.count != null ? `${p.count} · ` : ""}
                      {p.label}
                    </Link>
                  ) : (
                    <span className="text-slate-700">
                      {p.count != null ? `${p.count} · ` : ""}
                      {p.label}
                    </span>
                  )}
                </li>
              ))}
            </ul>
            <p className="text-xs text-slate-500">
              Pipeline ~{formatCurrency(brief.metrics.estimatedPipelineValue)} ·{" "}
              {brief.metrics.openFollowUpTasks} open tasks · {brief.metrics.outreachReady} outreach-ready
            </p>
          </>
        ) : null}
      </CardBody>
    </Card>
  );
}
