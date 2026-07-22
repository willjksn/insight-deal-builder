"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Plus,
  FileText,
  TrendingUp,
  Target,
  Inbox,
  Handshake,
  Briefcase,
  Sparkles,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/Button";
import { useAgreements } from "@/hooks/useAgreements";
import { useAuth } from "@/contexts/AuthContext";
import { revenueGetDashboard } from "@/lib/revenueOpportunities/apiClient";
import type { RevenueDashboardSummary } from "@/lib/revenueOpportunities/types/opportunity";
import {
  canCreateQuotes,
  canAccessRevenueOpportunities,
  isRevenueOpportunitiesFeatureEnabled,
} from "@/lib/utils/permissions";
import { formatCurrency } from "@/lib/utils/format";
import { StatCard, QuickAction, SectionHeader, EmptyPanel } from "./widgets";
import { WORKSPACE_TAGLINES } from "@/lib/workspace/types";

export function BusinessDashboard() {
  const { user, appUser } = useAuth();
  const { data: agreements, loading: aLoading } = useAgreements();
  const revenueEnabled =
    isRevenueOpportunitiesFeatureEnabled() && canAccessRevenueOpportunities(appUser);

  const [summary, setSummary] = useState<RevenueDashboardSummary | null>(null);
  const [revenueLoading, setRevenueLoading] = useState(revenueEnabled);

  useEffect(() => {
    if (!user || !revenueEnabled) {
      setRevenueLoading(false);
      return;
    }
    setRevenueLoading(true);
    revenueGetDashboard(() => user.getIdToken())
      .then((res) => setSummary(res.summary))
      .catch(() => setSummary(null))
      .finally(() => setRevenueLoading(false));
  }, [user, revenueEnabled]);

  const loading = aLoading || revenueLoading;

  const draftDeals = agreements.filter((a) => a.status === "draft").length;
  const readyToSign = agreements.filter((a) => a.status === "ready_for_signature").length;

  return (
    <div className="pb-24 lg:pb-0">
      <PageHeader
        title="Business dashboard"
        subtitle={WORKSPACE_TAGLINES.business}
        action={
          canCreateQuotes(appUser) ? (
            <Link href="/agreements/new">
              <Button size="touch">
                <Plus className="mr-2 h-5 w-5" />
                New agreement
              </Button>
            </Link>
          ) : undefined
        }
      />

      {loading ? (
        <LoadingSpinner className="py-20" />
      ) : (
        <>
          {revenueEnabled && summary ? (
            <>
              <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard label="New opportunities" value={summary.newOpportunities} href="/revenue/opportunities?filter=new" accent="sky" />
                <StatCard label="Awaiting review" value={summary.awaitingReview} href="/revenue" accent="amber" />
                <StatCard label="Follow-ups due" value={summary.followUpsDue} href="/revenue/pipeline" accent="rose" />
                <StatCard label="Proposals pending" value={summary.proposalsPending} href="/revenue/proposals" accent="violet" />
              </div>

              <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard label="Pipeline value" value={formatCurrency(summary.estimatedPipelineValue)} href="/revenue/pipeline" accent="slate" />
                <StatCard label="Revenue won" value={formatCurrency(summary.revenueWon)} href="/revenue/pipeline?stage=won" accent="emerald" />
                <StatCard label="Draft deals" value={draftDeals} href="/agreements?status=draft" accent="slate" />
                <StatCard label="Ready to sign" value={readyToSign} href="/agreements?status=ready_for_signature" accent="sky" />
              </div>

              {summary.awaitingProjectConversion > 0 ? (
                <Card className="mb-8 ring-1 ring-emerald-200">
                  <CardBody className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md">
                        <Handshake className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">
                          {summary.awaitingProjectConversion} won{" "}
                          {summary.awaitingProjectConversion === 1 ? "opportunity" : "opportunities"} ready to convert
                        </p>
                        <p className="text-xs text-slate-500">Turn closed work into a production project.</p>
                      </div>
                    </div>
                    <Link href="/revenue/pipeline?stage=won">
                      <Button size="sm" variant="outline">Review</Button>
                    </Link>
                  </CardBody>
                </Card>
              ) : null}
            </>
          ) : (
            <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard label="Draft deals" value={draftDeals} href="/agreements?status=draft" accent="slate" />
              <StatCard label="Ready to sign" value={readyToSign} href="/agreements?status=ready_for_signature" accent="sky" />
              <StatCard
                label="Signed"
                value={agreements.filter((a) => a.status === "signed" || a.status === "completed").length}
                href="/agreements?status=signed"
                accent="emerald"
              />
              <StatCard label="Total deals" value={agreements.length} href="/agreements" accent="violet" />
            </div>
          )}

          <section className="mb-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Do next</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {revenueEnabled ? (
                <>
                  <QuickAction href="/revenue" icon={TrendingUp} label="Revenue & opportunities" description="Review the feed" accent="sky" />
                  <QuickAction href="/revenue/pipeline" icon={Target} label="Pipeline" description="Move deals forward" accent="violet" />
                  <QuickAction href="/revenue/inbox" icon={Inbox} label="Inbox" description="Replies & follow-ups" accent="indigo" />
                </>
              ) : null}
              <QuickAction href="/agreements/new" icon={FileText} label="New agreement" description="Draft a deal" accent="emerald" />
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            {revenueEnabled && summary ? (
              <Card>
                <CardBody>
                  <SectionHeader title="Recent activity" icon={Sparkles} href="/revenue" actionLabel="Revenue" />
                  {summary.recentActivity.length === 0 ? (
                    <EmptyPanel text="No opportunity activity yet. Run a campaign to start finding revenue." />
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {summary.recentActivity.slice(0, 6).map((entry, idx) => (
                        <li key={`${entry.createdAt}-${idx}`} className="py-3">
                          <p className="truncate text-sm font-medium text-slate-900">
                            {String(entry.metadata?.subjectName ?? "Opportunity")}
                          </p>
                          <p className="truncate text-xs text-slate-500">{entry.message || entry.type}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardBody>
              </Card>
            ) : null}

            <Card>
              <CardBody>
                <SectionHeader title="Recent agreements" icon={FileText} href="/agreements" actionLabel="All deals" />
                {agreements.length === 0 ? (
                  <EmptyPanel
                    text="No agreements yet."
                    action={
                      canCreateQuotes(appUser) ? (
                        <Link href="/agreements/new">
                          <Button size="sm" variant="outline">
                            <Plus className="mr-1.5 h-4 w-4" />
                            New agreement
                          </Button>
                        </Link>
                      ) : undefined
                    }
                  />
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {agreements.slice(0, 6).map((a) => (
                      <li key={a.id}>
                        <Link
                          href={`/agreements/${a.id}`}
                          className="flex items-center justify-between gap-2 py-3 hover:bg-slate-50 -mx-2 px-2 rounded-xl transition-colors"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-medium text-slate-900">{a.title}</p>
                            <p className="truncate text-sm text-slate-500">
                              {a.projectDetails?.projectName || "No project"}
                            </p>
                          </div>
                          <Badge>{a.status.replace(/_/g, " ")}</Badge>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>
          </div>

          <p className="mt-8 flex items-center gap-2 text-xs text-slate-400">
            <Briefcase className="h-4 w-4" />
            Business workspace — switch to Production to plan and deliver the work you win.
          </p>
        </>
      )}
    </div>
  );
}
