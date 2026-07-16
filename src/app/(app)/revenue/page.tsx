"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Database, Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  revenueGetDashboard,
  revenueListOpportunities,
  revenueSeedDemo,
} from "@/lib/revenueOpportunities/apiClient";
import type { RevenueDashboardSummary } from "@/lib/revenueOpportunities/types/opportunity";
import { canManageRevenueOpportunities } from "@/lib/utils/permissions";
import { formatCurrency } from "@/lib/utils/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Card, CardBody } from "@/components/ui/Card";
import { OpportunitySummaryCards, OpportunityTable } from "@/components/revenue/OpportunityTable";

export default function RevenueCommandCenterPage() {
  const { user, appUser } = useAuth();
  const [summary, setSummary] = useState<RevenueDashboardSummary | null>(null);
  const [reviewQueue, setReviewQueue] = useState<Awaited<ReturnType<typeof revenueListOpportunities>>["opportunities"]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const canManage = canManageRevenueOpportunities(appUser);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const token = () => user.getIdToken();
      const [dash, review] = await Promise.all([
        revenueGetDashboard(token),
        revenueListOpportunities(token, { approvalStatus: "pending" }),
      ]);
      setSummary(dash.summary);
      setReviewQueue(review.opportunities.slice(0, 5));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [user]);

  const handleSeed = async () => {
    if (!user) return;
    setSeeding(true);
    setError(null);
    try {
      await revenueSeedDemo(() => user.getIdToken());
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Seed failed");
    } finally {
      setSeeding(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Revenue command center"
        subtitle="Pipeline overview, review queue, and activity from your opportunity database."
        action={
          canManage ? (
            <div className="flex flex-wrap gap-2">
              <Link href="/revenue/opportunities/new">
                <Button size="touch" variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Add opportunity
                </Button>
              </Link>
              <Link href="/revenue/campaigns/new">
                <Button size="touch">
                  <Plus className="mr-2 h-4 w-4" />
                  New campaign
                </Button>
              </Link>
            </div>
          ) : undefined
        }
      />

      {loading && <LoadingSpinner />}
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {!loading && summary && Object.values(summary.byStage).every((n) => n === 0) && canManage && (
        <Card className="mb-6 border-dashed border-sky-200 bg-sky-50/40">
          <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-slate-900">No opportunities yet</p>
              <p className="text-sm text-slate-600">
                Load demo Orlando hospitality opportunities to explore the manual workflow, or create your own.
              </p>
            </div>
            <Button size="touch" variant="secondary" disabled={seeding} onClick={handleSeed}>
              <Database className="mr-2 h-4 w-4" />
              {seeding ? "Loading demo…" : "Load demo data"}
            </Button>
          </CardBody>
        </Card>
      )}

      {summary && (
        <>
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <OpportunitySummaryCards
              count={summary.awaitingReview}
              label="Awaiting review"
              href="/revenue/opportunities?approval=pending"
            />
            <OpportunitySummaryCards
              count={summary.outreachReady}
              label="Ready for outreach"
              href="/revenue/pipeline?stage=ready_for_outreach"
            />
            <OpportunitySummaryCards
              count={summary.proposalsPending}
              label="Proposals in progress"
              href="/revenue/pipeline?stage=proposal"
            />
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(summary.estimatedPipelineValue)}</p>
              <p className="text-sm text-slate-600">Estimated pipeline value</p>
            </div>
          </div>

          <div className="mb-8 grid gap-4 lg:grid-cols-2">
            <Card>
              <CardBody>
                <h3 className="mb-3 font-semibold text-slate-900">Pipeline snapshot</h3>
                <div className="space-y-2 text-sm">
                  {Object.entries(summary.byStage)
                    .filter(([, count]) => count > 0)
                    .sort((a, b) => b[1] - a[1])
                    .map(([stage, count]) => (
                      <div key={stage} className="flex justify-between">
                        <Link href={`/revenue/pipeline?stage=${stage}`} className="text-sky-700 hover:underline">
                          {stage.replace(/_/g, " ")}
                        </Link>
                        <span className="font-medium text-slate-900">{count}</span>
                      </div>
                    ))}
                  {Object.keys(summary.byStage).length === 0 && (
                    <p className="text-slate-500">No stages populated yet.</p>
                  )}
                </div>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <h3 className="mb-3 font-semibold text-slate-900">Recent activity</h3>
                <div className="space-y-2 text-sm">
                  {summary.recentActivity.length === 0 && (
                    <p className="text-slate-500">Activity will appear as you review opportunities.</p>
                  )}
                  {summary.recentActivity.map((a) => (
                    <div key={a.id} className="border-b border-slate-100 pb-2 last:border-0">
                      <p className="text-slate-800">{a.message}</p>
                      <p className="text-xs text-slate-500">
                        {a.metadata?.subjectName ?? "Opportunity"} · {a.userDisplayName}
                      </p>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          </div>

          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Review queue</h2>
            <Link href="/revenue/opportunities" className="text-sm font-medium text-sky-700 hover:underline">
              View all
            </Link>
          </div>
          <OpportunityTable
            opportunities={reviewQueue}
            emptyMessage="No opportunities pending review."
          />
        </>
      )}
    </>
  );
}
