import Stripe from "stripe";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { stripUndefined } from "@/lib/firebase/firestore";
import { CreatorError } from "@/lib/creators/errors";
import { sendCreatorPaidEmail } from "@/lib/creators/creatorPayoutEmail";
import { getCreator } from "@/lib/creators/server";
import {
  getCreatorCampaign,
  updateCreatorCampaign,
} from "@/lib/creators/opsServer";
import { isStripeConnectReady } from "@/lib/creators/types";
import {
  CREATOR_CAMPAIGNS_COLLECTION,
  type CreatorCampaign,
  type CreatorCampaignAssignment,
} from "@/lib/creators/opsTypes";
import { isStripeConfigured } from "@/lib/stripe/config";
import { getStripeConnectSetupRequiredMessage } from "@/lib/stripe/creatorConnect";
import { getStripe } from "@/lib/stripe/server";
import { serializeDoc } from "@/lib/revenueOpportunities/server/serialize";
import { AppUser } from "@/lib/types";

function dollarsToCents(amount: number): number {
  return Math.round(amount * 100);
}

/**
 * Pay a campaign assignment via Stripe Transfer to the creator's Connect Express account.
 * Amount defaults to assignment.compensation (USD).
 */
export async function payCreatorCampaignAssignmentViaStripe(
  appUser: AppUser,
  campaignId: string,
  assignmentId: string,
  opts?: { amount?: number }
): Promise<CreatorCampaign> {
  if (!isStripeConfigured()) {
    throw new CreatorError("NOT_CONFIGURED", "Stripe is not configured");
  }
  const stripe = getStripe();

  const campaign = await getCreatorCampaign(appUser, campaignId);
  const existing = (campaign.assignments ?? []).find((a) => a.id === assignmentId);
  if (!existing) throw new CreatorError("NOT_FOUND", "Assignment not found");

  if (existing.stripeTransferId || existing.paidAt) {
    throw new CreatorError(
      "VALIDATION_FAILED",
      "This assignment is already marked paid"
    );
  }

  const amount =
    typeof opts?.amount === "number" && Number.isFinite(opts.amount)
      ? opts.amount
      : existing.compensation;
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
    throw new CreatorError(
      "VALIDATION_FAILED",
      "Set a positive compensation amount before paying via Stripe"
    );
  }

  const amountCents = dollarsToCents(amount);
  if (amountCents < 1) {
    throw new CreatorError("VALIDATION_FAILED", "Amount is too small to transfer");
  }

  const creator = await getCreator(appUser, existing.creatorId);
  if (!isStripeConnectReady(creator)) {
    throw new CreatorError(
      "VALIDATION_FAILED",
      `${existing.creatorName} is not ready for Stripe payouts (Connect onboarding incomplete)`
    );
  }

  const destination = creator.stripeConnectAccountId!.trim();
  const paidAt = new Date().toISOString();

  try {
    const transfer = await stripe.transfers.create({
      amount: amountCents,
      currency: "usd",
      destination,
      transfer_group: `creator_campaign_${campaignId}`,
      metadata: {
        shootspine_creator_id: creator.id,
        shootspine_campaign_id: campaignId,
        shootspine_assignment_id: assignmentId,
        organization_company: campaign.organizationCompany,
      },
      description: `ShootSpine · ${campaign.name} · ${existing.creatorName}`,
    });

    const assignments = (campaign.assignments ?? []).map((a) => {
      if (a.id !== assignmentId) return a;
      const {
        payoutError: _err,
        lastStripeTransferId: _last,
        ...base
      } = a;
      void _err;
      void _last;
      return {
        ...base,
        paidAt,
        paidAmount: amount,
        paidVia: "stripe" as const,
        stripeTransferId: transfer.id,
        paidByUserId: appUser.id,
        paidByDisplayName: appUser.displayName || appUser.email || undefined,
        status: "paid",
      };
    });

    const updated = await updateCreatorCampaign(appUser, campaignId, { assignments });
    if (creator.email?.trim()) {
      await sendCreatorPaidEmail({
        to: creator.email,
        professionalName: creator.professionalName,
        campaignName: campaign.name,
        amount,
        paidVia: "stripe",
      });
    }
    return updated;
  } catch (err) {
    if (err instanceof CreatorError) throw err;
    const setup = getStripeConnectSetupRequiredMessage(err);
    if (setup) throw new CreatorError("NOT_CONFIGURED", setup);

    const msg = err instanceof Error ? err.message : "Stripe transfer failed";
    const lower = msg.toLowerCase();
    if (lower.includes("insufficient") && lower.includes("balance")) {
      throw new CreatorError(
        "VALIDATION_FAILED",
        "Platform Stripe balance is too low for this transfer. Add funds in Stripe, then try again."
      );
    }
    throw new CreatorError("INTERNAL", msg);
  }
}

/** Clears Stripe paid markers after a full transfer reversal (exported for tests). */
export function clearStripePaidFields(
  assignment: CreatorCampaignAssignment,
  transferId: string,
  errorMessage: string
): CreatorCampaignAssignment {
  const {
    paidAt: _paidAt,
    paidAmount: _paidAmount,
    paidVia: _paidVia,
    stripeTransferId: _stripeTransferId,
    paidByUserId: _paidByUserId,
    paidByDisplayName: _paidByDisplayName,
    ...rest
  } = assignment;
  void _paidAt;
  void _paidAmount;
  void _paidVia;
  void _stripeTransferId;
  void _paidByUserId;
  void _paidByDisplayName;
  return {
    ...rest,
    lastStripeTransferId: transferId,
    payoutError: errorMessage,
    status: assignment.status === "paid" ? "assigned" : assignment.status,
  };
}

async function findCampaignAssignmentForTransfer(
  transfer: Stripe.Transfer
): Promise<{
  campaignId: string;
  assignmentId: string;
  campaign: CreatorCampaign;
} | null> {
  const db = getAdminDb();
  if (!db) return null;

  const metaCampaignId = transfer.metadata?.shootspine_campaign_id?.trim();
  const metaAssignmentId = transfer.metadata?.shootspine_assignment_id?.trim();

  if (metaCampaignId && metaAssignmentId) {
    const snap = await db.collection(CREATOR_CAMPAIGNS_COLLECTION).doc(metaCampaignId).get();
    if (!snap.exists) return null;
    const campaign = serializeDoc<CreatorCampaign>(snap.id, snap.data()!);
    const assignment = (campaign.assignments ?? []).find((a) => a.id === metaAssignmentId);
    if (!assignment) return null;
    return { campaignId: campaign.id, assignmentId: assignment.id, campaign };
  }

  // Fallback: locate by stored transfer id (metadata missing on older transfers).
  const org = transfer.metadata?.organization_company?.trim();
  let query: FirebaseFirestore.Query = db.collection(CREATOR_CAMPAIGNS_COLLECTION);
  if (org) {
    query = query.where("organizationCompany", "==", org);
  }
  const snap = await query.limit(200).get();
  for (const doc of snap.docs) {
    const campaign = serializeDoc<CreatorCampaign>(doc.id, doc.data());
    const assignment = (campaign.assignments ?? []).find(
      (a) => a.stripeTransferId === transfer.id || a.lastStripeTransferId === transfer.id
    );
    if (assignment) {
      return { campaignId: campaign.id, assignmentId: assignment.id, campaign };
    }
  }
  return null;
}

/**
 * Webhook: transfer.reversed — modern Stripe does not emit transfer.failed
 * (Connect transfers succeed/fail synchronously). Reversals clear paid state
 * so staff can pay again.
 */
export async function handleStripeTransferReversed(
  transfer: Stripe.Transfer
): Promise<{ updated: boolean; campaignId?: string; assignmentId?: string }> {
  const amount = transfer.amount ?? 0;
  const reversedAmount = transfer.amount_reversed ?? 0;
  const fullyReversed = Boolean(transfer.reversed) || (amount > 0 && reversedAmount >= amount);

  if (!fullyReversed) {
    // Partial reverse: keep paid, surface a warning for staff.
    const found = await findCampaignAssignmentForTransfer(transfer);
    if (!found) return { updated: false };
    const { campaign, campaignId, assignmentId } = found;
    const existing = (campaign.assignments ?? []).find((a) => a.id === assignmentId);
    if (!existing) return { updated: false };

    const cents = reversedAmount;
    const dollars = (cents / 100).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const assignments = (campaign.assignments ?? []).map((a) =>
      a.id === assignmentId
        ? {
            ...a,
            payoutError: `Stripe transfer partially reversed ($${dollars}). Paid record kept — review in Stripe.`,
          }
        : a
    );

    const db = getAdminDb();
    if (!db) return { updated: false };
    await db.collection(CREATOR_CAMPAIGNS_COLLECTION).doc(campaignId).update(
      stripUndefined({
        assignments,
        updatedAt: FieldValue.serverTimestamp(),
      })
    );
    return { updated: true, campaignId, assignmentId };
  }

  const found = await findCampaignAssignmentForTransfer(transfer);
  if (!found) return { updated: false };

  const { campaign, campaignId, assignmentId } = found;
  const existing = (campaign.assignments ?? []).find((a) => a.id === assignmentId);
  if (!existing) return { updated: false };

  // Already cleared for this transfer
  if (
    !existing.stripeTransferId &&
    existing.lastStripeTransferId === transfer.id &&
    existing.payoutError
  ) {
    return { updated: false, campaignId, assignmentId };
  }

  if (existing.stripeTransferId && existing.stripeTransferId !== transfer.id) {
    return { updated: false, campaignId, assignmentId };
  }

  const assignments = (campaign.assignments ?? []).map((a) =>
    a.id === assignmentId
      ? clearStripePaidFields(
          a,
          transfer.id,
          "Stripe transfer was reversed. Assignment is unpaid again — you can re-pay."
        )
      : a
  );

  const db = getAdminDb();
  if (!db) return { updated: false };
  await db.collection(CREATOR_CAMPAIGNS_COLLECTION).doc(campaignId).update(
    stripUndefined({
      assignments,
      updatedAt: FieldValue.serverTimestamp(),
    })
  );
  return { updated: true, campaignId, assignmentId };
}
