"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { revenueListCampaigns, revenueListOpportunities } from "@/lib/revenueOpportunities/apiClient";
import type { RevenueOpportunity } from "@/lib/revenueOpportunities/types/opportunity";
import type { RevenueCampaign } from "@/lib/revenueOpportunities/types/campaign";
import { canManageRevenueOpportunities } from "@/lib/utils/permissions";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Select } from "@/components/ui/Select";
import { ListSearchField } from "@/components/ui/ListSearchField";
import { OpportunityTable } from "@/components/revenue/OpportunityTable";

export default function RevenueOpportunitiesPage() {
  const { user, appUser } = useAuth();
  const searchParams = useSearchParams();
  const [opportunities, setOpportunities] = useState<RevenueOpportunity[]>([]);
  const [campaigns, setCampaigns] = useState<RevenueCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approvalFilter, setApprovalFilter] = useState(searchParams.get("approval") ?? "");
  const [campaignFilter, setCampaignFilter] = useState(searchParams.get("campaignId") ?? "");
  const [search, setSearch] = useState("");
  const canManage = canManageRevenueOpportunities(appUser);

  useEffect(() => {
    if (!user) return;
    const token = () => user.getIdToken();
    setLoading(true);
    Promise.all([
      revenueListOpportunities(token, {
        campaignId: campaignFilter || undefined,
        approvalStatus: approvalFilter || undefined,
      }),
      revenueListCampaigns(token),
    ])
      .then(([oppRes, campRes]) => {
        setOpportunities(oppRes.opportunities);
        setCampaigns(campRes.campaigns);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [user, approvalFilter, campaignFilter]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return opportunities;
    return opportunities.filter((o) => {
      const haystack = [
        o.subject.name,
        o.subject.industry,
        o.subject.city,
        o.subject.state,
        o.subject.website,
        o.campaignName,
        o.contact?.name,
        o.contact?.email,
        o.workflow.nextAction,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [opportunities, search]);

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
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <ListSearchField
          label="Search opportunities"
          value={search}
          onChange={setSearch}
          placeholder="Search name, city, campaign…"
          className="mb-0 max-w-sm flex-1"
        />
        <div className="w-full max-w-xs">
          <Select
            label="Campaign"
            value={campaignFilter}
            onChange={(e) => setCampaignFilter(e.target.value)}
            options={[
              { value: "", label: "All campaigns" },
              ...campaigns.map((c) => ({ value: c.id, label: c.name })),
            ]}
          />
        </div>
        <div className="w-full max-w-xs">
          <Select
            label="Approval"
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
      </div>
      {loading && <LoadingSpinner />}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!loading && (
        <OpportunityTable
          opportunities={filtered}
          emptyMessage={
            search.trim() || campaignFilter || approvalFilter
              ? "No opportunities match these filters."
              : "No opportunities yet."
          }
        />
      )}
    </>
  );
}
