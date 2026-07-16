"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { revenueListOutreach } from "@/lib/revenueOpportunities/apiClient";
import type { RevenueOutreachActivity } from "@/lib/revenueOpportunities/types/outreach";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Select } from "@/components/ui/Select";
import { OutreachTable } from "@/components/revenue/OutreachTable";

export default function RevenueOutreachPage() {
  const { user } = useAuth();
  const [activities, setActivities] = useState<RevenueOutreachActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("pending_review");

  useEffect(() => {
    if (!user) return;
    revenueListOutreach(() => user.getIdToken(), { status: statusFilter || undefined })
      .then((res) => setActivities(res.activities))
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
        title="Outreach"
        subtitle="Review and approve personalized email, LinkedIn, and Instagram drafts before sending."
      />
      <div className="mb-4 max-w-xs">
        <Select
          label="Status filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={[
            { value: "", label: "All" },
            { value: "pending_review", label: "Pending review" },
            { value: "approved", label: "Approved" },
            { value: "rejected", label: "Rejected" },
            { value: "sent", label: "Sent" },
          ]}
        />
      </div>
      {loading && <LoadingSpinner />}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!loading && (
        <OutreachTable
          activities={activities}
          emptyMessage={
            statusFilter === "pending_review"
              ? "No drafts awaiting review. Generate outreach from an approved opportunity."
              : "No outreach activities match this filter."
          }
        />
      )}
    </>
  );
}
