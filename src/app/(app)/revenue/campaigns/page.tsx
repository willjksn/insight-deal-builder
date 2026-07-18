"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { revenueListCampaigns } from "@/lib/revenueOpportunities/apiClient";
import type { RevenueCampaign } from "@/lib/revenueOpportunities/types/campaign";
import { canManageRevenueOpportunities } from "@/lib/utils/permissions";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody } from "@/components/ui/Card";
import { DataTable, DataRow } from "@/components/ui/DataTable";

export default function RevenueCampaignsPage() {
  const { user, appUser } = useAuth();
  const [campaigns, setCampaigns] = useState<RevenueCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canManage = canManageRevenueOpportunities(appUser);

  useEffect(() => {
    if (!user) return;
    revenueListCampaigns(() => user.getIdToken())
      .then((res) => setCampaigns(res.campaigns))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [user]);

  return (
    <>
      <Link href="/revenue" className="mb-4 inline-flex items-center text-sm text-sky-700 hover:underline">
        <ArrowLeft className="mr-1 h-4 w-4" />
        Command center
      </Link>
      <PageHeader
        title="Campaigns"
        subtitle="IMG client and Stormi brand prospecting campaigns."
        action={
          canManage ? (
            <Link href="/revenue/campaigns/new">
              <Button size="touch">
                <Plus className="mr-2 h-4 w-4" />
                New campaign
              </Button>
            </Link>
          ) : undefined
        }
      />
      {loading && <LoadingSpinner />}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!loading && campaigns.length === 0 && canManage && (
        <Card className="border-dashed border-sky-200 bg-sky-50/40">
          <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-slate-900">No campaigns yet</p>
              <p className="mt-1 text-sm text-slate-600">
                Create a campaign with targeting rules, then run research to find opportunities.
              </p>
            </div>
            <Link href="/revenue/campaigns/new">
              <Button size="touch">
                <Plus className="mr-2 h-4 w-4" />
                Create campaign
              </Button>
            </Link>
          </CardBody>
        </Card>
      )}
      {!loading && campaigns.length === 0 && !canManage && (
        <p className="text-sm text-slate-600">No campaigns yet.</p>
      )}
      {campaigns.length > 0 && (
        <DataTable headers={["Name", "Type", "Status", "Target", "Min score", "Active"]}>
          {campaigns.map((c) => (
            <DataRow
              key={c.id}
              href={`/revenue/campaigns/${c.id}`}
              cells={[
                c.name,
                c.campaignType === "stormi_brand" ? "Stormi brand" : "IMG client",
                <Badge key="status" variant={c.status === "active" ? "success" : "default"}>
                  {c.status}
                </Badge>,
                c.img
                  ? `${c.img.industry ?? "—"} · ${c.img.city ?? ""}, ${c.img.state ?? ""}`
                  : c.stormi?.brandCategory ?? "—",
                c.minOpportunityScore,
                c.active ? "Yes" : "No",
              ]}
            />
          ))}
        </DataTable>
      )}
    </>
  );
}
