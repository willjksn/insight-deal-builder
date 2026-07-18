"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { revenueGetDashboard } from "@/lib/revenueOpportunities/apiClient";
import type { RevenueDashboardSummary } from "@/lib/revenueOpportunities/types/opportunity";
import { formatCurrency } from "@/lib/utils/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { OpportunitySummaryCards } from "@/components/revenue/OpportunityTable";

function rateLabel(rate: number | null): string {
  return rate == null ? "—" : `${rate}%`;
}

export default function RevenueAnalyticsPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<RevenueDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await revenueGetDashboard(() => user.getIdToken());
        if (!cancelled) setSummary(res.summary);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load analytics");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <>
      <Link href="/revenue" className="mb-4 inline-flex items-center text-sm text-sky-700 hover:underline">
        <ArrowLeft className="mr-1 h-4 w-4" />
        Command center
      </Link>
      <PageHeader
        title="Analytics"
        subtitle="Approval rates, reply rates, pipeline value, wins, and estimated AI spend."
      />

      {loading && <LoadingSpinner />}
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {!loading && summary && (
        <>
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <p className="text-2xl font-bold text-slate-900">{rateLabel(summary.approvalRate)}</p>
              <p className="text-sm text-slate-600">Approval rate</p>
              <p className="mt-1 text-xs text-slate-500">
                {summary.approvalApproved} approved · {summary.approvalRejected} rejected
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <p className="text-2xl font-bold text-slate-900">{rateLabel(summary.replyRate)}</p>
              <p className="text-sm text-slate-600">Reply rate</p>
              <p className="mt-1 text-xs text-slate-500">
                {summary.replySignals} reply signals · {summary.outreachSent} Gmail drafts sent
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <p className="text-2xl font-bold text-slate-900">
                {formatCurrency(summary.estimatedPipelineValue)}
              </p>
              <p className="text-sm text-slate-600">Estimated pipeline value</p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(summary.revenueWon)}</p>
              <p className="text-sm text-slate-600">Revenue won</p>
              <p className="mt-1 text-xs text-slate-500">
                {summary.won} won · {summary.convertedToProject} converted
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(summary.aiSpendUsd)}</p>
              <p className="text-sm text-slate-600">Estimated AI spend</p>
              <p className="mt-1 text-xs text-slate-500">From recent agent runs</p>
            </div>
            <OpportunitySummaryCards
              count={summary.totalOpportunities}
              label="Total opportunities"
              href="/revenue/opportunities"
            />
          </div>

          <Card>
            <CardHeader>
              <h3 className="font-semibold text-slate-900">Pipeline snapshot</h3>
              <p className="text-xs text-slate-500">Counts by stage from your opportunity database.</p>
            </CardHeader>
            <CardBody>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {(
                  [
                    ["Awaiting review", summary.awaitingReview, "/revenue/opportunities?approval=pending"],
                    ["Ready for outreach", summary.outreachReady, "/revenue/pipeline?stage=ready_for_outreach"],
                    ["Discovery calls", summary.discoveryCalls, "/revenue/pipeline?stage=discovery_call"],
                    ["Proposals", summary.proposalsPending, "/revenue/pipeline?stage=proposal"],
                    ["Follow-ups due", summary.followUpsDue, "/revenue/pipeline?stage=follow_up_due"],
                    ["Won", summary.won, "/revenue/pipeline?stage=won"],
                    ["Awaiting conversion", summary.awaitingProjectConversion, "/revenue/pipeline?stage=won"],
                    ["Converted", summary.convertedToProject, "/revenue/pipeline?stage=converted_to_project"],
                  ] as const
                ).map(([label, count, href]) => (
                  <OpportunitySummaryCards key={label} count={count} label={label} href={href} />
                ))}
              </div>
            </CardBody>
          </Card>
        </>
      )}
    </>
  );
}
