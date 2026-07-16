"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { revenueListOpportunities } from "@/lib/revenueOpportunities/apiClient";
import type { RevenueOpportunity } from "@/lib/revenueOpportunities/types/opportunity";
import type { RevenuePipelineStage } from "@/lib/revenueOpportunities/types";
import { PIPELINE_STAGE_LABELS } from "@/lib/revenueOpportunities/labels";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Select } from "@/components/ui/Select";
import { OpportunityTable } from "@/components/revenue/OpportunityTable";

export default function RevenuePipelinePage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const initialStage = (searchParams.get("stage") as RevenuePipelineStage | null) ?? "";
  const [stage, setStage] = useState<RevenuePipelineStage | "">(initialStage);
  const [opportunities, setOpportunities] = useState<RevenueOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    revenueListOpportunities(() => user.getIdToken(), {
      pipelineStage: stage || undefined,
    })
      .then((res) => setOpportunities(res.opportunities))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [user, stage]);

  return (
    <>
      <Link href="/revenue" className="mb-4 inline-flex items-center text-sm text-sky-700 hover:underline">
        <ArrowLeft className="mr-1 h-4 w-4" />
        Command center
      </Link>
      <PageHeader
        title="Pipeline"
        subtitle="Filter opportunities by pipeline stage from new through won or lost."
      />
      <div className="mb-4 max-w-sm">
        <Select
          label="Pipeline stage"
          value={stage}
          onChange={(e) => setStage(e.target.value as RevenuePipelineStage | "")}
          options={[
            { value: "", label: "All stages" },
            ...Object.entries(PIPELINE_STAGE_LABELS).map(([value, label]) => ({ value, label })),
          ]}
        />
      </div>
      {loading && <LoadingSpinner />}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!loading && <OpportunityTable opportunities={opportunities} emptyMessage="No opportunities in this stage." />}
    </>
  );
}
