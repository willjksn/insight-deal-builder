"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { revenueGetCampaign, revenueUpdateCampaign } from "@/lib/revenueOpportunities/apiClient";
import type { RevenueCampaign } from "@/lib/revenueOpportunities/types/campaign";
import { canManageRevenueOpportunities } from "@/lib/utils/permissions";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { CampaignForm } from "@/components/revenue/CampaignForm";

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, appUser } = useAuth();
  const [campaign, setCampaign] = useState<RevenueCampaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canManage = canManageRevenueOpportunities(appUser);

  useEffect(() => {
    if (!user || !id) return;
    revenueGetCampaign(() => user.getIdToken(), id)
      .then((res) => setCampaign(res.campaign))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [user, id]);

  if (loading) return <LoadingSpinner />;
  if (!campaign) {
    return <p className="text-sm text-red-600">{error ?? "Campaign not found"}</p>;
  }

  const { id: _id, organizationCompany, ownerUserId, createdAt, updatedAt, ...editable } = campaign;

  return (
    <>
      <Link href="/revenue/campaigns" className="mb-4 inline-flex items-center text-sm text-sky-700 hover:underline">
        <ArrowLeft className="mr-1 h-4 w-4" />
        Campaigns
      </Link>
      <PageHeader title={campaign.name} subtitle={`${campaign.campaignType === "stormi_brand" ? "Stormi" : "IMG"} campaign`} />
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {canManage ? (
        <CampaignForm
          initial={editable}
          busy={busy}
          submitLabel="Save changes"
          onSubmit={async (data) => {
            if (!user) return;
            setBusy(true);
            setError(null);
            try {
              const res = await revenueUpdateCampaign(() => user.getIdToken(), id, data);
              setCampaign(res.campaign);
            } catch (e) {
              setError(e instanceof Error ? e.message : "Update failed");
            } finally {
              setBusy(false);
            }
          }}
        />
      ) : (
        <p className="text-sm text-slate-600">View-only access.</p>
      )}
      <Link
        href={`/revenue/opportunities?campaignId=${campaign.id}`}
        className="mt-6 inline-block text-sm font-medium text-sky-700 hover:underline"
      >
        View campaign opportunities →
      </Link>
    </>
  );
}
