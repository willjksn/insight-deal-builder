"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Search, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  revenueDeleteCampaign,
  revenueGetCampaign,
  revenueGetStatus,
  revenueListCampaignRuns,
  revenueRunCampaignResearch,
  revenueUpdateCampaign,
} from "@/lib/revenueOpportunities/apiClient";
import type { RevenueCampaign } from "@/lib/revenueOpportunities/types/campaign";
import type { RevenueCampaignRun } from "@/lib/revenueOpportunities/types/campaignRun";
import type { RevenueFeatureStatus } from "@/lib/revenueOpportunities/types";
import { canManageRevenueOpportunities } from "@/lib/utils/permissions";
import { formatDateTime } from "@/lib/utils/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { CampaignForm } from "@/components/revenue/CampaignForm";

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, appUser } = useAuth();
  const [campaign, setCampaign] = useState<RevenueCampaign | null>(null);
  const [runs, setRuns] = useState<RevenueCampaignRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [researching, setResearching] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [researchMessage, setResearchMessage] = useState<string | null>(null);
  const [featureStatus, setFeatureStatus] = useState<RevenueFeatureStatus | null>(null);
  const canManage = canManageRevenueOpportunities(appUser);
  const researchLive = featureStatus?.integrations.research === "live";

  useEffect(() => {
    if (!user || !id) return;
    Promise.all([
      revenueGetCampaign(() => user.getIdToken(), id),
      revenueListCampaignRuns(() => user.getIdToken(), id),
      revenueGetStatus(() => user.getIdToken()).catch(() => null),
    ])
      .then(([c, r, statusRes]) => {
        setCampaign(c.campaign);
        setRuns(r.runs);
        if (statusRes?.status) setFeatureStatus(statusRes.status);
      })
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
      <PageHeader
        title={campaign.name}
        subtitle={`${campaign.campaignType === "stormi_brand" ? "Stormi" : "IMG"} campaign`}
        action={
          canManage ? (
            <div className="flex flex-wrap gap-2">
              <Button
                size="touch"
                variant="outline"
                disabled={busy || researching || deleting}
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="mr-2 h-4 w-4 text-red-500" />
                Delete
              </Button>
              <Button
                size="touch"
                disabled={
                  researching ||
                  deleting ||
                  !campaign.active ||
                  (featureStatus != null && !researchLive)
                }
                title={
                  featureStatus != null && !researchLive
                    ? "Configure live research (Tavily + Gemini, SCOUT_USE_MOCK_AI=false)"
                    : undefined
                }
                onClick={async () => {
                  if (!user) return;
                  setResearching(true);
                  setError(null);
                  setResearchMessage(null);
                  try {
                    const res = await revenueRunCampaignResearch(() => user.getIdToken(), id);
                    setRuns((prev) => [res.campaignRun, ...prev]);
                    const live = res.campaignRun.usedLiveSearch ? "deep live" : "research";
                    setResearchMessage(
                      `${live} complete — ${res.opportunities.length} opportunit${res.opportunities.length === 1 ? "y" : "ies"} created.`
                    );
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Research failed");
                  } finally {
                    setResearching(false);
                  }
                }}
              >
                <Search className="mr-2 h-4 w-4" />
                {researching ? "Deep researching…" : "Run deep research"}
              </Button>
            </div>
          ) : undefined
        }
      />
      {featureStatus ? (
        <div
          className={
            researchLive
              ? "mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950"
              : "mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          }
        >
          {researchLive ? (
            <p>
              <strong>Live deep research ready</strong> — multi-query web search + Gemini qualify per
              prospect. Dummy data is disabled.
            </p>
          ) : (
            <p>
              <strong>Live research not configured.</strong> Set{" "}
              <code className="text-xs">SCOUT_USE_MOCK_AI=false</code>,{" "}
              <code className="text-xs">TAVILY_API_KEY</code>, and Gemini/Vertex. AI:{" "}
              {featureStatus.integrations.ai} · Search: {featureStatus.integrations.search}.
            </p>
          )}
        </div>
      ) : null}
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {researchMessage && <p className="mb-4 text-sm text-emerald-700">{researchMessage}</p>}

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

      {runs.length > 0 && (
        <Card className="mt-8">
          <CardBody>
            <h3 className="mb-3 font-semibold text-slate-900">Research runs</h3>
            <div className="space-y-2 text-sm">
              {runs.map((run) => (
                <div key={run.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2 last:border-0">
                  <div>
                    <p className="font-medium text-slate-900">
                      {run.opportunitiesCreated} created · {run.searchQuery ?? "Research pass"}
                    </p>
                    <p className="text-xs text-slate-500">{formatDateTime(run.createdAt)}</p>
                  </div>
                  <Badge variant={run.status === "completed" ? "success" : run.status === "failed" ? "danger" : "warning"}>
                    {run.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      <Link
        href={`/revenue/opportunities?campaignId=${campaign.id}`}
        className="mt-6 inline-block text-sm font-medium text-sky-700 hover:underline"
      >
        View campaign opportunities →
      </Link>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete campaign?"
        description={`Delete “${campaign.name}” and all related opportunities, research runs, outreach, discovery, and proposals? This cannot be undone.`}
        confirmLabel="Delete campaign"
        loading={deleting}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => {
          if (!user) return;
          setDeleting(true);
          setError(null);
          try {
            await revenueDeleteCampaign(() => user.getIdToken(), id);
            router.push("/revenue/campaigns");
          } catch (e) {
            setError(e instanceof Error ? e.message : "Delete failed");
            setDeleting(false);
            setConfirmDelete(false);
          }
        }}
      />
    </>
  );
}
