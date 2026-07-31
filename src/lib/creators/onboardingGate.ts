import { networkAgreementNeedsSignature } from "@/lib/creators/networkAgreementContent";
import {
  isCreatorPaymentOnboardingComplete,
  type Creator,
} from "@/lib/creators/types";

export type CreatorOnboardingGap = {
  id: "agreement" | "identity" | "payment";
  label: string;
};

/** Soft-gate checks before campaign assignment (warn, do not hard-block). */
export function getCreatorCampaignAssignGaps(
  creator: Pick<
    Creator,
    | "networkAgreement"
    | "identityVerification"
    | "professionalName"
    | "paymentDetails"
    | "stripeConnectAccountId"
    | "stripeConnect"
  >
): CreatorOnboardingGap[] {
  const gaps: CreatorOnboardingGap[] = [];
  if (networkAgreementNeedsSignature(creator.networkAgreement)) {
    gaps.push({
      id: "agreement",
      label: "Contractor agreement not signed (current version)",
    });
  }
  if (creator.identityVerification?.status !== "approved") {
    gaps.push({
      id: "identity",
      label:
        creator.identityVerification?.status === "pending"
          ? "ID submitted — awaiting staff approval"
          : "ID verification not approved",
    });
  }
  if (!isCreatorPaymentOnboardingComplete(creator)) {
    const startedConnect = Boolean(creator.stripeConnectAccountId);
    gaps.push({
      id: "payment",
      label: startedConnect
        ? "Stripe Connect onboarding incomplete"
        : "Payment / Stripe Connect not set up",
    });
  }
  return gaps;
}

export function formatCreatorAssignGapWarning(
  creatorName: string,
  gaps: CreatorOnboardingGap[]
): string {
  if (!gaps.length) return "";
  const list = gaps.map((g) => g.label).join("; ");
  return `${creatorName} is not fully onboarded (${list}). You can still assign them — they should finish these steps before going live.`;
}
