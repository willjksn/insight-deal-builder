"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCollection } from "@/hooks/useCollection";
import {
  revenueCreateOpportunity,
  revenueListCampaigns,
} from "@/lib/revenueOpportunities/apiClient";
import type { RevenueCampaign } from "@/lib/revenueOpportunities/types/campaign";
import { Client } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";

export default function NewOpportunityPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { data: clients } = useCollection<Client>("clients");
  const [campaigns, setCampaigns] = useState<RevenueCampaign[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [industry, setIndustry] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [description, setDescription] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [clientId, setClientId] = useState("");
  const [totalScore, setTotalScore] = useState(70);

  useEffect(() => {
    if (!user) return;
    revenueListCampaigns(() => user.getIdToken())
      .then((res) => setCampaigns(res.campaigns))
      .catch(() => undefined);
  }, [user]);

  return (
    <>
      <Link href="/revenue/opportunities" className="mb-4 inline-flex items-center text-sm text-sky-700 hover:underline">
        <ArrowLeft className="mr-1 h-4 w-4" />
        Opportunities
      </Link>
      <PageHeader title="Add opportunity" subtitle="Manual entry for prospects you already know." />
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      <form
        className="grid max-w-2xl gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!user) return;
          setBusy(true);
          setError(null);
          const campaign = campaigns.find((c) => c.id === campaignId);
          try {
            const res = await revenueCreateOpportunity(() => user.getIdToken(), {
              campaignId: campaignId || undefined,
              campaignName: campaign?.name,
              opportunityType: "img_client",
              clientId: clientId || undefined,
              subject: { name, website, industry, city, state, description },
              scoring: { totalScore, confidenceScore: Math.max(50, totalScore - 10) },
              workflow: {
                pipelineStage: "review_required",
                technicalStatus: "completed",
                approvalStatus: "pending",
                nextAction: "Review opportunity",
              },
            });
            router.push(`/revenue/opportunities/${res.opportunity.id}`);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Create failed");
            setBusy(false);
          }
        }}
      >
        <Input label="Business / brand name" value={name} onChange={(e) => setName(e.target.value)} required />
        <Input label="Website" value={website} onChange={(e) => setWebsite(e.target.value)} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Industry" value={industry} onChange={(e) => setIndustry(e.target.value)} />
          <Input label="City" value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
        <Input label="State" value={state} onChange={(e) => setState(e.target.value)} />
        <Textarea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
        <Select
          label="Campaign (optional)"
          value={campaignId}
          onChange={(e) => setCampaignId(e.target.value)}
          options={[{ value: "", label: "None" }, ...campaigns.map((c) => ({ value: c.id, label: c.name }))]}
        />
        <Select
          label="Link to client (optional)"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          options={[{ value: "", label: "None" }, ...clients.map((c) => ({ value: c.id, label: c.businessName }))]}
        />
        <Input
          label="Opportunity score (0–100)"
          type="number"
          min={0}
          max={100}
          value={totalScore}
          onChange={(e) => setTotalScore(Number(e.target.value))}
        />
        <Button type="submit" size="touch" disabled={busy}>
          Create opportunity
        </Button>
      </form>
    </>
  );
}
