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
  revenueListDiscovery,
  revenueListOutreach,
  revenueListProposals,
  revenueRejectOpportunity,
  revenueRejectOutreach,
  revenueRunCampaignConcept,
  revenueRunDiscoveryDebrief,
  revenueRunDiscoveryPrep,
  revenueUpdateDiscoverySession,
  revenueRunOutreachDraft,
  revenueRunProposalDraft,
  revenueRunQualityReview,
  revenueRunRevision,
  revenueUpdateOutreach,
  revenueCreateGmailDraftFromOutreach,
} from "@/lib/revenueOpportunities/apiClient";
import type { RevenueOpportunity } from "@/lib/revenueOpportunities/types/opportunity";
import type { RevenueOutreachActivity } from "@/lib/revenueOpportunities/types/outreach";
import type { RevenueDiscoverySession } from "@/lib/revenueOpportunities/types/discovery";
import type { RevenueOpportunityProposal } from "@/lib/revenueOpportunities/types/proposal";
import { canManageRevenueOpportunities } from "@/lib/utils/permissions";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { OpportunityDetailView } from "@/components/revenue/OpportunityDetailView";
import { OpportunityApprovalPanel } from "@/components/revenue/OpportunityApprovalPanel";
import { OpportunityAgentPanel } from "@/components/revenue/OpportunityAgentPanel";
import { OpportunityOutreachPanel } from "@/components/revenue/OpportunityOutreachPanel";
import { OpportunityDiscoveryPanel } from "@/components/revenue/OpportunityDiscoveryPanel";
import { OpportunityProposalPanel } from "@/components/revenue/OpportunityProposalPanel";

export default function OpportunityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, appUser } = useAuth();
  const [opportunity, setOpportunity] = useState<RevenueOpportunity | null>(null);
  const [outreach, setOutreach] = useState<RevenueOutreachActivity[]>([]);
  const [discoverySessions, setDiscoverySessions] = useState<RevenueDiscoverySession[]>([]);
  const [proposals, setProposals] = useState<RevenueOpportunityProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canManage = canManageRevenueOpportunities(appUser);

  const reload = async () => {
    if (!user || !id) return;
    const [oppRes, outreachRes, discoveryRes, proposalsRes] = await Promise.all([
      revenueGetOpportunity(() => user.getIdToken(), id),
      revenueListOutreach(() => user.getIdToken(), { opportunityId: id }),
      revenueListDiscovery(() => user.getIdToken(), { opportunityId: id }),
      revenueListProposals(() => user.getIdToken(), { opportunityId: id }),
    ]);
    setOpportunity(oppRes.opportunity);
    setOutreach(outreachRes.activities);
    setDiscoverySessions(discoveryRes.sessions);
    setProposals(proposalsRes.proposals);
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
          <OpportunityDiscoveryPanel
            sessions={discoverySessions}
            canManage={canManage}
            busy={busy}
            onGeneratePrep={async () => {
              if (!user) return;
              setBusy(true);
              setError(null);
              try {
                await revenueRunDiscoveryPrep(() => user.getIdToken(), id);
                await reload();
              } catch (e) {
                setError(e instanceof Error ? e.message : "Discovery prep failed");
              } finally {
                setBusy(false);
              }
            }}
            onSaveAnswers={async (sessionId, payload) => {
              if (!user) return;
              setBusy(true);
              setError(null);
              try {
                await revenueUpdateDiscoverySession(() => user.getIdToken(), sessionId, payload);
                await reload();
              } catch (e) {
                setError(e instanceof Error ? e.message : "Save failed");
              } finally {
                setBusy(false);
              }
            }}
            onRunDebrief={async (sessionId, payload) => {
              if (!user) return;
              setBusy(true);
              setError(null);
              try {
                await revenueRunDiscoveryDebrief(() => user.getIdToken(), sessionId, payload);
                await reload();
              } catch (e) {
                setError(e instanceof Error ? e.message : "Debrief failed");
              } finally {
                setBusy(false);
              }
            }}
            onReload={reload}
          />
          <OpportunityProposalPanel
            proposals={proposals}
            canManage={canManage}
            busy={busy}
            onGenerate={async () => {
              if (!user) return;
              setBusy(true);
              setError(null);
              try {
                const completedSession = discoverySessions.find((s) => s.status === "completed");
                await revenueRunProposalDraft(
                  () => user.getIdToken(),
                  id,
                  completedSession?.id ?? discoverySessions[0]?.id
                );
                await reload();
              } catch (e) {
                setError(e instanceof Error ? e.message : "Proposal draft failed");
              } finally {
                setBusy(false);
              }
            }}
            onReload={reload}
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
