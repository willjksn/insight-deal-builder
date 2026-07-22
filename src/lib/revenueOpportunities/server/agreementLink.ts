import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { stripUndefined } from "@/lib/firebase/firestore";
import { newActivity } from "@/lib/revenueOpportunities/defaults";
import {
  REVENUE_OPPORTUNITIES_COLLECTION,
  REVENUE_OPPORTUNITY_PROPOSALS_COLLECTION,
} from "@/lib/revenueOpportunities/collections";
import { serializeDoc } from "@/lib/revenueOpportunities/server/serialize";
import type { RevenuePipelineStage } from "@/lib/revenueOpportunities/types";
import type { RevenueOpportunity } from "@/lib/revenueOpportunities/types/opportunity";
import type { RevenueOpportunityProposal } from "@/lib/revenueOpportunities/types/proposal";

/** A signed agreement should not regress an opportunity already won/converted/lost. */
export function shouldMarkOpportunityWon(stage: RevenuePipelineStage): boolean {
  return stage !== "won" && stage !== "converted_to_project" && stage !== "lost";
}

export interface AgreementRevenueLinkResult {
  matched: boolean;
  updatedProposal: boolean;
  updatedOpportunity: boolean;
}

/**
 * When a client signs an agreement, mark the linked proposal accepted and the
 * originating opportunity won. Best-effort and idempotent — safe to call from
 * the signature completion hook.
 */
export async function linkSignedAgreementToRevenue(
  db: Firestore,
  agreementId: string,
  signerUserId: string
): Promise<AgreementRevenueLinkResult> {
  const result: AgreementRevenueLinkResult = {
    matched: false,
    updatedProposal: false,
    updatedOpportunity: false,
  };

  const propSnap = await db
    .collection(REVENUE_OPPORTUNITY_PROPOSALS_COLLECTION)
    .where("agreementId", "==", agreementId)
    .limit(1)
    .get();
  if (propSnap.empty) return result;

  result.matched = true;
  const propDoc = propSnap.docs[0];
  const proposal = serializeDoc<RevenueOpportunityProposal>(propDoc.id, propDoc.data());

  if (proposal.status !== "accepted") {
    await propDoc.ref.update(
      stripUndefined({ status: "accepted", updatedAt: FieldValue.serverTimestamp() })
    );
    result.updatedProposal = true;
  }

  if (!proposal.opportunityId) return result;

  const oppRef = db.collection(REVENUE_OPPORTUNITIES_COLLECTION).doc(proposal.opportunityId);
  const oppSnap = await oppRef.get();
  if (!oppSnap.exists) return result;

  const opportunity = serializeDoc<RevenueOpportunity>(oppSnap.id, oppSnap.data()!);
  if (!shouldMarkOpportunityWon(opportunity.workflow.pipelineStage)) return result;

  const activity = newActivity(
    { id: signerUserId, displayName: "Client signature", email: "" },
    "agreement_signed",
    "Agreement signed — opportunity marked won",
    { agreementId }
  );

  await oppRef.update(
    stripUndefined({
      workflow: {
        ...opportunity.workflow,
        pipelineStage: "won",
        approvalStatus: "approved",
      },
      activityLog: [...opportunity.activityLog, activity],
      updatedAt: FieldValue.serverTimestamp(),
    })
  );
  result.updatedOpportunity = true;
  return result;
}
