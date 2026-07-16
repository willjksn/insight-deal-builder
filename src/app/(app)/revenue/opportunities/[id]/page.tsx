"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  revenueApproveOpportunity,
  revenueApproveOutreach,
  revenueGetOpportunity,
  revenueListOutreach,
  revenueRejectOpportunity,
  revenueRejectOutreach,
  revenueRunCampaignConcept,
  revenueRunOutreachDraft,
  revenueRunQualityReview,
  revenueRunRevision,
  revenueUpdateOutreach,
  revenueCreateGmailDraftFromOutreach,
} from "@/lib/revenueOpportunities/apiClient";
import type { RevenueOpportunity } from "@/lib/revenueOpportunities/types/opportunity";
import type { RevenueOutreachActivity } from "@/lib/revenueOpportunities/types/outreach";
import { canManageRevenueOpportunities } from "@/lib/utils/permissions";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { OpportunityDetailView } from "@/components/revenue/OpportunityDetailView";
import { OpportunityApprovalPanel } from "@/components/revenue/OpportunityApprovalPanel";
import { OpportunityAgentPanel } from "@/components/revenue/OpportunityAgentPanel";
import { OpportunityOutreachPanel } from "@/components/revenue/OpportunityOutreachPanel";

export default function OpportunityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, appUser } = useAuth();
  const [opportunity, setOpportunity] = useState<RevenueOpportunity | null>(null);
  const [outreach, setOutreach] = useState<RevenueOutreachActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canManage = canManageRevenueOpportunities(appUser);

  const reload = async () => {
    if (!user || !id) return;
    const [oppRes, outreachRes] = await Promise.all([
      revenueGetOpportunity(() => user.getIdToken(), id),
      revenueListOutreach(() => user.getIdToken(), { opportunityId: id }),
    ]);
    setOpportunity(oppRes.opportunity);
    setOutreach(outreachRes.activities);
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
        <div className="space-y-6">
          <OpportunityAgentPanel
            opportunity={opportunity}
            canManage={canManage}
            busy={busy}
            onQualityReview={async () => {
              if (!user) return;
              setBusy(true);
              setError(null);
              try {
                const res = await revenueRunQualityReview(() => user.getIdToken(), id);
                setOpportunity(res.opportunity);
              } catch (e) {
                setError(e instanceof Error ? e.message : "Quality review failed");
              } finally {
                setBusy(false);
              }
            }}
            onRevision={async () => {
              if (!user) return;
              setBusy(true);
              setError(null);
              try {
                const res = await revenueRunRevision(() => user.getIdToken(), id);
                setOpportunity(res.opportunity);
              } catch (e) {
                setError(e instanceof Error ? e.message : "Revision failed");
              } finally {
                setBusy(false);
              }
            }}
            onCampaignConcept={async () => {
              if (!user) return;
              setBusy(true);
              setError(null);
              try {
                const res = await revenueRunCampaignConcept(() => user.getIdToken(), id);
                setOpportunity(res.opportunity);
              } catch (e) {
                setError(e instanceof Error ? e.message : "Campaign concept failed");
              } finally {
                setBusy(false);
              }
            }}
          />
          <OpportunityOutreachPanel
            opportunity={opportunity}
            canManage={canManage}
            busy={busy}
            activities={outreach}
            onGenerate={async () => {
              if (!user) return;
              setBusy(true);
              setError(null);
              try {
                await revenueRunOutreachDraft(() => user.getIdToken(), id);
                await reload();
              } catch (e) {
                setError(e instanceof Error ? e.message : "Outreach generation failed");
              } finally {
                setBusy(false);
              }
            }}
            onReload={reload}
            onApprove={async (outreachId, notes) => {
              if (!user) return;
              setBusy(true);
              setError(null);
              try {
                await revenueApproveOutreach(() => user.getIdToken(), outreachId, notes);
                await reload();
              } catch (e) {
                setError(e instanceof Error ? e.message : "Approve failed");
              } finally {
                setBusy(false);
              }
            }}
            onReject={async (outreachId, notes) => {
              if (!user) return;
              setBusy(true);
              setError(null);
              try {
                await revenueRejectOutreach(() => user.getIdToken(), outreachId, notes);
                await reload();
              } catch (e) {
                setError(e instanceof Error ? e.message : "Reject failed");
              } finally {
                setBusy(false);
              }
            }}
            onSaveDraft={async (outreachId, patch) => {
              if (!user) return;
              setBusy(true);
              setError(null);
              try {
                await revenueUpdateOutreach(() => user.getIdToken(), outreachId, patch);
                await reload();
              } catch (e) {
                setError(e instanceof Error ? e.message : "Save failed");
              } finally {
                setBusy(false);
              }
            }}
            onCreateGmailDraft={async (outreachId) => {
              if (!user) return;
              setBusy(true);
              setError(null);
              try {
                await revenueCreateGmailDraftFromOutreach(() => user.getIdToken(), outreachId);
                await reload();
              } catch (e) {
                setError(e instanceof Error ? e.message : "Gmail draft failed");
              } finally {
                setBusy(false);
              }
            }}
          />
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
