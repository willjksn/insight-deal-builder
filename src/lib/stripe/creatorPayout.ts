import { CreatorError } from "@/lib/creators/errors";
import { getCreator } from "@/lib/creators/server";
import {
  getCreatorCampaign,
  updateCreatorCampaign,
} from "@/lib/creators/opsServer";
import { isStripeConnectReady } from "@/lib/creators/types";
import type { CreatorCampaign } from "@/lib/creators/opsTypes";
import { isStripeConfigured } from "@/lib/stripe/config";
import { getStripeConnectSetupRequiredMessage } from "@/lib/stripe/creatorConnect";
import { getStripe } from "@/lib/stripe/server";
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

    const assignments = (campaign.assignments ?? []).map((a) =>
      a.id === assignmentId
        ? {
            ...a,
            paidAt,
            paidAmount: amount,
            paidVia: "stripe" as const,
            stripeTransferId: transfer.id,
            paidByUserId: appUser.id,
            paidByDisplayName: appUser.displayName || appUser.email || undefined,
            status: "paid",
          }
        : a
    );

    return updateCreatorCampaign(appUser, campaignId, { assignments });
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
