"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { revenueListProposals } from "@/lib/revenueOpportunities/apiClient";
import type { RevenueOpportunityProposal } from "@/lib/revenueOpportunities/types/proposal";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Select } from "@/components/ui/Select";
import { ProposalTable } from "@/components/revenue/ProposalTable";

export default function RevenueProposalsPage() {
  const { user } = useAuth();
  const [proposals, setProposals] = useState<RevenueOpportunityProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    if (!user) return;
    revenueListProposals(() => user.getIdToken(), { status: statusFilter || undefined })
      .then((res) => setProposals(res.proposals))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [user, statusFilter]);

  return (
    <>
      <Link href="/revenue" className="mb-4 inline-flex items-center text-sm text-sky-700 hover:underline">
        <ArrowLeft className="mr-1 h-4 w-4" />
        Command center
      </Link>
      <PageHeader
        title="Proposals"
        subtitle="Draft proposals linked to ShootSpine agreements and quotes."
      />
      <div className="mb-4 max-w-xs">
        <Select
          label="Status filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={[
            { value: "", label: "All" },
            { value: "draft", label: "Draft" },
            { value: "review", label: "In review" },
            { value: "approved", label: "Approved" },
            { value: "sent", label: "Sent" },
          ]}
        />
      </div>
      {loading && <LoadingSpinner />}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!loading && (
        <ProposalTable
          proposals={proposals}
          emptyMessage={
            statusFilter
              ? "No proposals match this filter."
              : "No proposals yet. Run a discovery debrief, then generate a proposal from an opportunity."
          }
        />
      )}
    </>
  );
}
