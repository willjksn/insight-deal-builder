"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { revenueListDiscovery } from "@/lib/revenueOpportunities/apiClient";
import type { RevenueDiscoverySession } from "@/lib/revenueOpportunities/types/discovery";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Select } from "@/components/ui/Select";
import { DiscoveryTable } from "@/components/revenue/DiscoveryTable";

export default function RevenueDiscoveryPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<RevenueDiscoverySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    if (!user) return;
    revenueListDiscovery(() => user.getIdToken(), { status: statusFilter || undefined })
      .then((res) => setSessions(res.sessions))
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
        title="Discovery"
        subtitle="Pre-call briefs, call notes, and post-call debriefs before proposals."
      />
      <div className="mb-4 max-w-xs">
        <Select
          label="Status filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={[
            { value: "", label: "All" },
            { value: "scheduled", label: "Scheduled" },
            { value: "completed", label: "Completed" },
            { value: "cancelled", label: "Cancelled" },
          ]}
        />
      </div>
      {loading && <LoadingSpinner />}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!loading && (
        <DiscoveryTable
          sessions={sessions}
          emptyMessage={
            statusFilter
              ? "No discovery sessions match this filter."
              : "No discovery sessions yet. Generate call prep from an opportunity detail page."
          }
        />
      )}
    </>
  );
}
