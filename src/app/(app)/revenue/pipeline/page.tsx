"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { revenueListOpportunities, revenueSetOpportunityStage } from "@/lib/revenueOpportunities/apiClient";
import type { RevenueOpportunity } from "@/lib/revenueOpportunities/types/opportunity";
import type { RevenuePipelineStage } from "@/lib/revenueOpportunities/types";
import { canManageRevenueOpportunities } from "@/lib/utils/permissions";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { PipelineKanban } from "@/components/revenue/PipelineKanban";

export default function RevenuePipelinePage() {
  const { user, appUser } = useAuth();
  const searchParams = useSearchParams();
  const focusStage = searchParams.get("stage") as RevenuePipelineStage | null;
  const [opportunities, setOpportunities] = useState<RevenueOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canManage = canManageRevenueOpportunities(appUser);

  const load = useCallback(async () => {
    if (!user) return;
    const res = await revenueListOpportunities(() => user.getIdToken());
    setOpportunities(res.opportunities);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    load()
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [user, load]);

  useEffect(() => {
    if (!focusStage || loading) return;
    const el = document.querySelector(`[data-pipeline-stage="${focusStage}"]`);
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [focusStage, loading, opportunities.length]);

  return (
    <>
      <Link href="/revenue" className="mb-4 inline-flex items-center text-sm text-sky-700 hover:underline">
        <ArrowLeft className="mr-1 h-4 w-4" />
        Command center
      </Link>
      <PageHeader
        title="Pipeline"
        subtitle="Kanban board of opportunities by stage. Drag cards to update stage."
      />
      {loading && <LoadingSpinner />}
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {!loading && (
        <PipelineKanban
          opportunities={opportunities}
          canManage={canManage}
          busy={busy}
          onMoveStage={async (opportunityId, stage) => {
            if (!user) return;
            setBusy(true);
            setError(null);
            try {
              const res = await revenueSetOpportunityStage(() => user.getIdToken(), opportunityId, stage);
              setOpportunities((prev) =>
                prev.map((o) => (o.id === opportunityId ? res.opportunity : o))
              );
            } catch (e) {
              setError(e instanceof Error ? e.message : "Failed to move opportunity");
            } finally {
              setBusy(false);
            }
          }}
        />
      )}
    </>
  );
}
