"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  revenueApproveOpportunity,
  revenueGetOpportunity,
  revenueRejectOpportunity,
} from "@/lib/revenueOpportunities/apiClient";
import type { RevenueOpportunity } from "@/lib/revenueOpportunities/types/opportunity";
import { canManageRevenueOpportunities } from "@/lib/utils/permissions";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { OpportunityDetailView } from "@/components/revenue/OpportunityDetailView";
import { OpportunityApprovalPanel } from "@/components/revenue/OpportunityApprovalPanel";

export default function OpportunityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, appUser } = useAuth();
  const [opportunity, setOpportunity] = useState<RevenueOpportunity | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canManage = canManageRevenueOpportunities(appUser);

  const reload = async () => {
    if (!user || !id) return;
    const res = await revenueGetOpportunity(() => user.getIdToken(), id);
    setOpportunity(res.opportunity);
  };

  useEffect(() => {
    if (!user || !id) return;
    reload()
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [user, id]);

  if (loading) return <LoadingSpinner />;
  if (!opportunity) {
    return <p className="text-sm text-red-600">{error ?? "Opportunity not found"}</p>;
  }

  return (
    <>
      <Link href="/revenue/opportunities" className="mb-4 inline-flex items-center text-sm text-sky-700 hover:underline">
        <ArrowLeft className="mr-1 h-4 w-4" />
        Opportunities
      </Link>
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <OpportunityDetailView opportunity={opportunity} />
        </div>
        <div>
          <OpportunityApprovalPanel
            opportunity={opportunity}
            canManage={canManage}
            busy={busy}
            onApprove={async (notes) => {
              if (!user) return;
              setBusy(true);
              setError(null);
              try {
                const res = await revenueApproveOpportunity(() => user.getIdToken(), id, notes);
                setOpportunity(res.opportunity);
              } catch (e) {
                setError(e instanceof Error ? e.message : "Approve failed");
              } finally {
                setBusy(false);
              }
            }}
            onReject={async (reason, notes, revisitLater) => {
              if (!user) return;
              setBusy(true);
              setError(null);
              try {
                const res = await revenueRejectOpportunity(() => user.getIdToken(), id, {
                  reason,
                  notes,
                  revisitLater,
                });
                setOpportunity(res.opportunity);
              } catch (e) {
                setError(e instanceof Error ? e.message : "Reject failed");
              } finally {
                setBusy(false);
              }
            }}
          />
        </div>
      </div>
    </>
  );
}
