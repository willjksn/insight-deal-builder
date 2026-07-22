"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { revenueCreateCampaign, revenueListProfiles } from "@/lib/revenueOpportunities/apiClient";
import { PageHeader } from "@/components/ui/PageHeader";
import { CampaignForm, type CampaignProfileOption } from "@/components/revenue/CampaignForm";

export default function NewCampaignPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<CampaignProfileOption[]>([]);

  useEffect(() => {
    if (!user) return;
    revenueListProfiles(() => user.getIdToken())
      .then((res) =>
        setProfiles(
          res.profiles.map((p) => ({ id: p.id, name: p.name, profileType: p.profileType }))
        )
      )
      .catch(() => setProfiles([]));
  }, [user]);

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
        profiles={profiles}
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
