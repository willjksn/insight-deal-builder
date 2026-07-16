"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { revenueCreateCampaign } from "@/lib/revenueOpportunities/apiClient";
import { PageHeader } from "@/components/ui/PageHeader";
import { CampaignForm } from "@/components/revenue/CampaignForm";

export default function NewCampaignPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <Link href="/revenue/campaigns" className="mb-4 inline-flex items-center text-sm text-sky-700 hover:underline">
        <ArrowLeft className="mr-1 h-4 w-4" />
        Campaigns
      </Link>
      <PageHeader title="New campaign" subtitle="Define targeting, thresholds, and approval mode." />
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      <CampaignForm
        busy={busy}
        submitLabel="Create campaign"
        onSubmit={async (data) => {
          if (!user) return;
          setBusy(true);
          setError(null);
          try {
            const res = await revenueCreateCampaign(() => user.getIdToken(), data);
            router.push(`/revenue/campaigns/${res.campaign.id}`);
          } catch (e) {
            setError(e instanceof Error ? e.message : "Create failed");
            setBusy(false);
          }
        }}
      />
    </>
  );
}
