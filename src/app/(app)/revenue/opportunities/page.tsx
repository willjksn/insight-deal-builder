"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { revenueListOpportunities } from "@/lib/revenueOpportunities/apiClient";
import type { RevenueOpportunity } from "@/lib/revenueOpportunities/types/opportunity";
import { canManageRevenueOpportunities } from "@/lib/utils/permissions";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Select } from "@/components/ui/Select";
import { OpportunityTable } from "@/components/revenue/OpportunityTable";

export default function RevenueOpportunitiesPage() {
  const { user, appUser } = useAuth();
  const searchParams = useSearchParams();
  const [opportunities, setOpportunities] = useState<RevenueOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approvalFilter, setApprovalFilter] = useState(searchParams.get("approval") ?? "");
  const canManage = canManageRevenueOpportunities(appUser);
  const campaignId = searchParams.get("campaignId") ?? undefined;

  useEffect(() => {
    if (!user) return;
    revenueListOpportunities(() => user.getIdToken(), {
      campaignId,
      approvalStatus: approvalFilter || undefined,
    })
      .then((res) => setOpportunities(res.opportunities))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [user, approvalFilter, campaignId]);

  return (
    <>
      <Link href="/revenue" className="mb-4 inline-flex items-center text-sm text-sky-700 hover:underline">
        <ArrowLeft className="mr-1 h-4 w-4" />
        Command center
      </Link>
      <PageHeader
        title="Opportunities"
        subtitle="Review researched businesses and brands with evidence and scores."
        action={
          canManage ? (
            <Link href="/revenue/opportunities/new">
              <Button size="touch">
                <Plus className="mr-2 h-4 w-4" />
                Add manually
              </Button>
            </Link>
          ) : undefined
        }
      />
      <div className="mb-4 max-w-xs">
        <Select
          label="Approval filter"
          value={approvalFilter}
          onChange={(e) => setApprovalFilter(e.target.value)}
          options={[
            { value: "", label: "All" },
            { value: "pending", label: "Pending review" },
            { value: "approved", label: "Approved" },
            { value: "rejected", label: "Rejected" },
          ]}
        />
      </div>
      {loading && <LoadingSpinner />}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!loading && <OpportunityTable opportunities={opportunities} />}
    </>
  );
}
