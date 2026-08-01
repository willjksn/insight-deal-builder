import { networkAgreementNeedsSignature } from "@/lib/creators/networkAgreementContent";
import type { CreatorCampaignStatus } from "@/lib/creators/opsTypes";
import {
  isCreatorPaymentOnboardingComplete,
  type Creator,
} from "@/lib/creators/types";

export type CreatorOnboardingGap = {
  id: "agreement" | "identity" | "payment" | "unpaid";
  label: string;
};

export type CreatorLiveStatusGap = {
  creatorId: string;
  creatorName: string;
  gaps: CreatorOnboardingGap[];
};

/** Statuses where creators should be fully onboarded (soft-warn on change). */
export const CREATOR_CAMPAIGN_LIVE_STATUSES: ReadonlySet<CreatorCampaignStatus> = new Set([
  "agreed",
  "in_production",
  "posting",
  "reporting",
]);

/** Live statuses plus completed — warn on unpaid compensation / onboarding gaps. */
export const CREATOR_CAMPAIGN_SOFT_GATE_STATUSES: ReadonlySet<CreatorCampaignStatus> = new Set([
  ...CREATOR_CAMPAIGN_LIVE_STATUSES,
  "completed",
]);

export function isCreatorCampaignLiveStatus(
  status: string | undefined
): status is CreatorCampaignStatus {
  return Boolean(status && CREATOR_CAMPAIGN_LIVE_STATUSES.has(status as CreatorCampaignStatus));
}

export function isCreatorCampaignSoftGateStatus(
  status: string | undefined
): status is CreatorCampaignStatus {
  return Boolean(
    status && CREATOR_CAMPAIGN_SOFT_GATE_STATUSES.has(status as CreatorCampaignStatus)
  );
}

type CreatorOnboardingPick = Pick<
  Creator,
  | "networkAgreement"
  | "identityVerification"
  | "professionalName"
  | "stripeConnectAccountId"
  | "stripeConnect"
>;

/** Soft-gate checks before campaign assignment (warn, do not hard-block). */
export function getCreatorCampaignAssignGaps(
  creator: CreatorOnboardingPick
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
        : "Stripe Connect not set up",
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

export type CampaignLiveAssignmentPick = {
  creatorId: string;
  creatorName: string;
  compensation?: number;
  paidAt?: string;
};

/** Soft-gate: assignees with incomplete onboarding or unpaid compensation when going live. */
export function getCampaignLiveStatusGaps(
  assignments: CampaignLiveAssignmentPick[],
  creatorsById: Map<string, CreatorOnboardingPick>
): CreatorLiveStatusGap[] {
  const out: CreatorLiveStatusGap[] = [];
  for (const a of assignments) {
    const creator = creatorsById.get(a.creatorId);
    const gaps = getCreatorCampaignAssignGaps(
      creator ?? { professionalName: a.creatorName }
    );
    const compensation = Number(a.compensation ?? 0);
    if (compensation > 0 && !a.paidAt?.trim()) {
      gaps.push({
        id: "unpaid",
        label: `Unpaid compensation ($${compensation.toLocaleString()})`,
      });
    }
    if (!gaps.length) continue;
    out.push({
      creatorId: a.creatorId,
      creatorName: a.creatorName || creator?.professionalName || "Creator",
      gaps,
    });
  }
  return out;
}

export function formatCampaignLiveStatusWarning(
  statusLabel: string,
  rows: CreatorLiveStatusGap[]
): string {
  if (!rows.length) return "";
  const lines = rows.map((r) => {
    const list = r.gaps.map((g) => g.label).join("; ");
    return `${r.creatorName} (${list})`;
  });
  return `Moving to ${statusLabel} while assignees still have gaps: ${lines.join(" · ")}. You can still update status — finish onboarding and pay outstanding compensation before wrapping.`;
}
