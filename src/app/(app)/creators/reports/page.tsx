"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { DataTable, DataRow } from "@/components/ui/DataTable";
import { useAuth } from "@/contexts/AuthContext";
import { canManageCreators } from "@/lib/utils/permissions";
import { getCreatorReports } from "@/lib/creators/apiClient";
import { StatCard } from "@/components/dashboard/widgets";
import { formatCurrency } from "@/lib/utils/format";
import { CREATOR_CAMPAIGN_STATUS_LABELS, type CreatorCampaignStatus } from "@/lib/creators/opsTypes";

export default function CreatorReportsPage() {
  const { user, appUser } = useAuth();
  const canManage = canManageCreators(appUser);
  const [report, setReport] = useState<Awaited<
    ReturnType<typeof getCreatorReports>
  >["report"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getToken = useCallback(() => {
    if (!user) throw new Error("Not signed in");
    return user.getIdToken();
  }, [user]);

  useEffect(() => {
    if (!user || !canManage) return;
    getCreatorReports(getToken)
      .then((res) => setReport(res.report))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"))
      .finally(() => setLoading(false));
  }, [user, canManage, getToken]);

  if (!canManage) return <div className="p-6 text-sm">Not authorized.</div>;

  return (
    <div>
      <PageHeader
        title="Creator reports"
        subtitle="Network health, unpaid payouts, campaign economics, and pipeline rollups"
      />
      <Link href="/reports" className="mb-4 inline-block text-sm text-sky-700 hover:underline">
        ← Business reports
      </Link>
      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}
      {loading || !report ? (
        <LoadingSpinner className="py-20" />
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Active creators" value={report.network.totalActive} accent="sky" />
            <StatCard label="Campaign ready" value={report.network.campaignReady} accent="emerald" />
            <StatCard label="Campaigns" value={report.campaignCount} accent="violet" />
            <StatCard label="Shortlists" value={report.shortlistCount} accent="amber" />
          </div>
          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label="Client revenue"
              value={formatCurrency(report.economics.revenue)}
              accent="slate"
            />
            <StatCard
              label="Creator compensation"
              value={formatCurrency(report.economics.compensation)}
              accent="slate"
            />
            <StatCard
              label="Direct costs"
              value={formatCurrency(report.economics.costs)}
              accent="slate"
            />
            <StatCard
              label="Est. margin"
              value={formatCurrency(report.economics.estimatedMargin)}
              accent="emerald"
            />
          </div>

          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label="Unpaid assignments"
              value={report.unpaidPayouts?.unpaidCount ?? 0}
              accent="amber"
            />
            <StatCard
              label="Unpaid total"
              value={formatCurrency(report.unpaidPayouts?.unpaidTotal ?? 0)}
              accent="amber"
            />
            <StatCard
              label="Connect blocked"
              value={report.unpaidPayouts?.connectBlockedCount ?? 0}
              accent="violet"
            />
            <StatCard
              label="Blocked amount"
              value={formatCurrency(report.unpaidPayouts?.connectBlockedTotal ?? 0)}
              accent="violet"
            />
          </div>

          <Card className="mb-6">
            <CardHeader>
              <h2 className="font-semibold">Unpaid payouts</h2>
              <p className="text-xs font-normal text-slate-500">
                Assignments with compensation that are not marked paid. Open a campaign to pay via
                Stripe or mark paid.
              </p>
            </CardHeader>
            <CardBody className="p-0 sm:p-0">
              {(report.unpaidPayouts?.rows.length ?? 0) === 0 ? (
                <p className="px-4 py-6 text-sm text-slate-500">No unpaid compensated assignments.</p>
              ) : (
                <DataTable
                  headers={[
                    "Creator",
                    "Campaign",
                    "Amount",
                    "Connect",
                    "Status",
                    "Notes",
                  ]}
                >
                  {report.unpaidPayouts.rows.map((row) => (
                    <DataRow
                      key={`${row.campaignId}-${row.assignmentId}`}
                      cells={[
                        <Link
                          key="creator"
                          href={`/creators/${row.creatorId}`}
                          className="font-semibold text-sky-800 hover:underline"
                        >
                          {row.creatorName}
                        </Link>,
                        <div key="campaign">
                          <Link
                            href={`/creators/campaigns?open=${row.campaignId}`}
                            className="font-medium text-sky-800 hover:underline"
                          >
                            {row.campaignName}
                          </Link>
                          {row.brandName ? (
                            <div className="text-xs text-slate-500">{row.brandName}</div>
                          ) : null}
                          {row.role ? (
                            <div className="text-xs text-slate-500">{row.role}</div>
                          ) : null}
                        </div>,
                        formatCurrency(row.compensation),
                        row.connectReady ? (
                          <Badge key="ready" variant="success">
                            Ready
                          </Badge>
                        ) : (
                          <Badge key="blocked" variant="warning">
                            Not ready
                          </Badge>
                        ),
                        CREATOR_CAMPAIGN_STATUS_LABELS[
                          row.campaignStatus as CreatorCampaignStatus
                        ] ?? row.campaignStatus,
                        row.payoutError ? (
                          <span key="err" className="text-amber-800">
                            {row.payoutError}
                          </span>
                        ) : (
                          "—"
                        ),
                      ]}
                    />
                  ))}
                </DataTable>
              )}
            </CardBody>
          </Card>

          <div className="mb-6 grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <h2 className="font-semibold">Campaigns by status</h2>
              </CardHeader>
              <CardBody className="space-y-1 text-sm">
                {Object.entries(report.campaignsByStatus).map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span>
                      {CREATOR_CAMPAIGN_STATUS_LABELS[k as CreatorCampaignStatus] ?? k}
                    </span>
                    <span className="font-semibold">{v}</span>
                  </div>
                ))}
                {!Object.keys(report.campaignsByStatus).length && (
                  <p className="text-slate-500">No campaigns yet.</p>
                )}
              </CardBody>
            </Card>
            <Card>
              <CardHeader>
                <h2 className="font-semibold">Network niches</h2>
              </CardHeader>
              <CardBody className="space-y-1 text-sm">
                {Object.entries(report.network.byNiche)
                  .slice(0, 8)
                  .map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span>{k}</span>
                      <span className="font-semibold">{v}</span>
                    </div>
                  ))}
                {!Object.keys(report.network.byNiche).length && (
                  <p className="text-slate-500">No niche data yet.</p>
                )}
              </CardBody>
            </Card>
          </div>

          <DataTable headers={["Campaign", "Brand", "Status", "Creators", "Deliverables", "Margin"]}>
            {report.campaigns.map((c) => (
              <DataRow
                key={c.id}
                cells={[
                  <Link
                    key="n"
                    href={`/creators/campaigns?open=${c.id}`}
                    className="font-semibold text-sky-800"
                  >
                    {c.name}
                  </Link>,
                  c.brandName || "—",
                  CREATOR_CAMPAIGN_STATUS_LABELS[c.status as CreatorCampaignStatus] ?? c.status,
                  c.creatorCount,
                  c.deliverableCount,
                  c.estimatedMargin != null ? formatCurrency(c.estimatedMargin) : "—",
                ]}
              />
            ))}
          </DataTable>
        </>
      )}
    </div>
  );
}
