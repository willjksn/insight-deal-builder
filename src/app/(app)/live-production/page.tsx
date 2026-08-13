"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  liveConvertToProject,
  liveGetDashboard,
  liveListOpportunities,
  liveUpdateOpportunity,
  type LiveDashboardStats,
} from "@/lib/liveProduction/apiClient";
import type { LiveOpportunity } from "@/lib/liveProduction/types";
import { LIVE_OPPORTUNITY_STATUSES, LIVE_SOURCE_OPTIONS } from "@/lib/liveProduction/types";
import { formatCurrency } from "@/lib/utils/format";
import { canManageRevenueOpportunities } from "@/lib/utils/permissions";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { OpportunityCard } from "@/components/liveProduction/OpportunityCard";

export default function LiveProductionInboxPage() {
  const { user, appUser } = useAuth();
  const router = useRouter();
  const canManage = canManageRevenueOpportunities(appUser);
  const [stats, setStats] = useState<LiveDashboardStats | null>(null);
  const [rows, setRows] = useState<LiveOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [sourceFilter, setSourceFilter] = useState<string>("");
  const [minFit, setMinFit] = useState<string>("");

  const load = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const token = () => user.getIdToken();
      // Seed only via dashboard (once). Parallel seed+list caused duplicate Charlotte demos.
      const dash = await liveGetDashboard(token);
      const list = await liveListOpportunities(token);
      setStats(dash.stats);
      setRows(list.opportunities);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load opportunities");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [user]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter && r.status !== statusFilter) return false;
      if (sourceFilter && r.sourceKind !== sourceFilter) return false;
      if (minFit && r.fitScore.total < Number(minFit)) return false;
      return true;
    });
  }, [rows, statusFilter, sourceFilter, minFit]);

  const buildQuote = async (opp: LiveOpportunity) => {
    if (!user || !canManage) return;
    try {
      await liveUpdateOpportunity(() => user.getIdToken(), opp.id, {
        status: "quote_building",
      });
      router.push(
        `/quick-quote?liveOpportunityId=${encodeURIComponent(opp.id)}&title=${encodeURIComponent(opp.title)}`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open quote");
    }
  };

  const createProject = async (opp: LiveOpportunity) => {
    if (!user || !canManage) return;
    try {
      const result = await liveConvertToProject(() => user.getIdToken(), opp.id);
      router.push(`/projects/${result.projectId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create project");
    }
  };

  return (
    <>
      <PageHeader
        title="Live Production Opportunities"
        subtitle="Discover, score, and convert LED / AV / staging / live-event work into quotes and ShootSpine projects."
        action={
          canManage ? (
            <Link href="/live-production/new">
              <Button size="touch">
                <Plus className="mr-2 h-4 w-4" />
                Add opportunity
              </Button>
            </Link>
          ) : undefined
        }
      />

      {loading && <LoadingSpinner />}
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {stats && (
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Open", value: String(stats.openCount) },
            { label: "Active bids", value: String(stats.pursuingCount) },
            { label: "Pipeline", value: formatCurrency(stats.pipelineValue) },
            { label: "Weighted", value: formatCurrency(stats.weightedPipeline) },
            { label: "Won (tracked)", value: formatCurrency(stats.wonValue) },
            { label: "Avg fit", value: `${stats.averageFitScore}` },
            { label: "Qualified", value: String(stats.qualifiedCount) },
          ].map((s) => (
            <Card key={s.label}>
              <CardBody>
                <p className="text-xs uppercase tracking-wide text-slate-500">{s.label}</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">{s.value}</p>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {stats && stats.topEquipmentDemand.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <p className="font-medium text-slate-900">Top equipment demand</p>
            <p className="text-sm text-slate-600">
              From opportunity history — use when considering inventory investment.
            </p>
          </CardHeader>
          <CardBody className="flex flex-wrap gap-3">
            {stats.topEquipmentDemand.map((d) => (
              <div
                key={d.label}
                className="rounded-md bg-slate-50 px-3 py-2 text-sm ring-1 ring-slate-200"
              >
                <span className="font-medium text-slate-900">{d.label}</span>
                <span className="ml-2 text-slate-600">{d.count}</span>
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Select
          label="Status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={[
            { value: "", label: "All statuses" },
            ...LIVE_OPPORTUNITY_STATUSES.map((s) => ({ value: s.value, label: s.label })),
          ]}
          touch
        />
        <Select
          label="Source"
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          options={[
            { value: "", label: "All sources" },
            ...LIVE_SOURCE_OPTIONS.map((s) => ({ value: s.value, label: s.label })),
          ]}
          touch
        />
        <Select
          label="Min fit score"
          value={minFit}
          onChange={(e) => setMinFit(e.target.value)}
          options={[
            { value: "", label: "Any" },
            { value: "70", label: "70+" },
            { value: "80", label: "80+" },
            { value: "90", label: "90+" },
          ]}
          touch
        />
      </div>

      <div className="space-y-4">
        {filtered.map((opp) => (
          <OpportunityCard
            key={opp.id}
            opportunity={opp}
            onBuildQuote={canManage ? () => buildQuote(opp) : undefined}
            onCreateProject={canManage ? () => createProject(opp) : undefined}
          />
        ))}
        {!loading && filtered.length === 0 && (
          <Card>
            <CardBody className="text-sm text-slate-600">
              No opportunities match these filters.{" "}
              {canManage && (
                <Link href="/live-production/new" className="font-medium text-sky-800 underline">
                  Add one
                </Link>
              )}
            </CardBody>
          </Card>
        )}
      </div>
    </>
  );
}
