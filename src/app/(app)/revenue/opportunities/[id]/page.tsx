"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  revenueApproveOpportunity,
  revenueApproveOutreach,
  revenueDeleteOpportunity,
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
  revenueSetOpportunityStage,
  revenueUpdateOutreach,
  revenueCreateGmailDraftFromOutreach,
  revenueConvertOpportunityToProject,
  revenueUpdateOpportunity,
  revenueUpdateProposal,
} from "@/lib/revenueOpportunities/apiClient";
import type { RevenueOpportunity } from "@/lib/revenueOpportunities/types/opportunity";
import type { RevenueOutreachActivity } from "@/lib/revenueOpportunities/types/outreach";
import type { RevenueDiscoverySession } from "@/lib/revenueOpportunities/types/discovery";
import type { RevenueOpportunityProposal } from "@/lib/revenueOpportunities/types/proposal";
import { canManageProjects, canManageRevenueOpportunities } from "@/lib/utils/permissions";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { OpportunityDetailView } from "@/components/revenue/OpportunityDetailView";
import { OpportunityApprovalPanel } from "@/components/revenue/OpportunityApprovalPanel";
import { OpportunityAgentPanel } from "@/components/revenue/OpportunityAgentPanel";
import { OpportunityStagePanel } from "@/components/revenue/OpportunityStagePanel";
import { OpportunitySubjectLinksPanel } from "@/components/revenue/OpportunitySubjectLinksPanel";
import { OpportunityOutreachPanel } from "@/components/revenue/OpportunityOutreachPanel";
import { OpportunityDiscoveryPanel } from "@/components/revenue/OpportunityDiscoveryPanel";
import { OpportunityProposalPanel } from "@/components/revenue/OpportunityProposalPanel";
import { OpportunityConversionPanel } from "@/components/revenue/OpportunityConversionPanel";

export default function OpportunityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, appUser } = useAuth();
  const [opportunity, setOpportunity] = useState<RevenueOpportunity | null>(null);
  const [outreach, setOutreach] = useState<RevenueOutreachActivity[]>([]);
  const [discoverySessions, setDiscoverySessions] = useState<RevenueDiscoverySession[]>([]);
  const [proposals, setProposals] = useState<RevenueOpportunityProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canManage = canManageRevenueOpportunities(appUser);
  const canConvert = canManage && canManageProjects(appUser);

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
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link href="/revenue/opportunities" className="inline-flex items-center text-sm text-sky-700 hover:underline">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Opportunities
        </Link>
        {canManage && (
          <Button
            size="touch"
            variant="outline"
            disabled={busy || deleting}
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="mr-2 h-4 w-4 text-red-500" />
            Delete
          </Button>
        )}
      </div>
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <OpportunityDetailView opportunity={opportunity} />
        </div>
        <div className="space-y-6">
          <OpportunityStagePanel
            opportunity={opportunity}
            canManage={canManage}
            busy={busy}
            onSetStage={async (pipelineStage) => {
              if (!user) return;
              setBusy(true);
              setError(null);
              try {
                const res = await revenueSetOpportunityStage(() => user.getIdToken(), id, pipelineStage);
                setOpportunity(res.opportunity);
              } catch (e) {
                setError(e instanceof Error ? e.message : "Failed to update stage");
              } finally {
                setBusy(false);
              }
            }}
          />
          <OpportunitySubjectLinksPanel
            opportunity={opportunity}
            canManage={canManage}
            busy={busy}
            onSave={async ({ website, socialLinks }) => {
              if (!user) return;
              setBusy(true);
              setError(null);
              try {
                const res = await revenueUpdateOpportunity(() => user.getIdToken(), id, {
                  subject: {
                    ...opportunity.subject,
                    website: website?.trim() || "",
                    socialLinks: socialLinks?.trim() || "",
                  },
                });
                setOpportunity(res.opportunity);
              } catch (e) {
                setError(e instanceof Error ? e.message : "Failed to save links");
                throw e;
              } finally {
                setBusy(false);
              }
            }}
          />
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
            projectId={opportunity.projectConversion?.shootSpineProjectId}
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
            onSave={async (proposalId, patch) => {
              if (!user) return;
              setBusy(true);
              setError(null);
              try {
                const existing = proposals.find((p) => p.id === proposalId);
                await revenueUpdateProposal(() => user.getIdToken(), proposalId, {
                  ...patch,
                  agreementPrefill: {
                    suggestedTitle: patch.title,
                    projectOverview: patch.executiveSummary,
                    deliverables: patch.deliverables,
                    estimatedFee: patch.investmentMin ?? patch.investmentMax,
                    paymentStructure:
                      patch.paymentStructureSuggestion ?? existing?.agreementPrefill?.paymentStructure,
                    scopeNotes: patch.scopeOutline,
                  },
                });
                await reload();
              } catch (e) {
                setError(e instanceof Error ? e.message : "Failed to save proposal");
                throw e;
              } finally {
                setBusy(false);
              }
            }}
          />
          <OpportunityConversionPanel
            opportunity={opportunity}
            latestProposal={proposals[0]}
            canManage={canConvert}
            busy={busy}
            onConvert={async (projectName) => {
              if (!user) return { projectId: "", alreadyConverted: false };
              setBusy(true);
              setError(null);
              try {
                const res = await revenueConvertOpportunityToProject(() => user.getIdToken(), id, {
                  projectName,
                  proposalId: proposals[0]?.id,
                });
                setOpportunity(res.opportunity);
                await reload();
                return { projectId: res.projectId, alreadyConverted: res.alreadyConverted };
              } catch (e) {
                setError(e instanceof Error ? e.message : "Conversion failed");
                throw e;
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
      <ConfirmDialog
        open={confirmDelete}
        title="Delete opportunity?"
        description={`Delete “${opportunity.subject.name}”? This cannot be undone.`}
        confirmLabel="Delete opportunity"
        loading={deleting}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => {
          if (!user) return;
          setDeleting(true);
          setError(null);
          try {
            await revenueDeleteOpportunity(() => user.getIdToken(), id);
            router.push("/revenue/opportunities");
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
