import {
  Agreement,
  AgreementParty,
  AgreementType,
  Company,
  PaymentStructure,
  PaymentTerms,
  PayoutDetails,
  ProjectType,
} from "@/lib/types";
import { getClausesForType } from "@/lib/constants/clauses";
import { DEFAULT_GEAR_CLAUSE, PROJECT_OVERVIEW_TEMPLATES, PRODUCER_FEE_PRESETS } from "@/lib/constants/presets";
import { EMPTY_EQUIPMENT_RENTAL_DETAILS, syncRentalPaymentTerms } from "@/lib/agreement/equipmentRental";
import {
  EMPTY_CONTRACTOR_AGREEMENT_DETAILS,
  EMPTY_TALENT_AGREEMENT_DETAILS,
  syncPayeePaymentTerms,
} from "@/lib/agreement/payeeEngagement";
import { EMPTY_LOCATION_AGREEMENT_DETAILS, syncLocationPaymentTerms } from "@/lib/agreement/locationAgreement";
import { INSIGHT_MEDIA_GROUP_LLC, isPartnerOriginatedClient } from "@/lib/utils/permissions";

export function hasInsightMediaGroupParty(parties: AgreementParty[]): boolean {
  return parties.some((p) => p.name.includes("Insight Media Group"));
}

export function createInsightMediaGroupParty(
  company?: Pick<Company, "displayName" | "authorizedSignerName" | "authorizedSignerTitle" | "email">
): AgreementParty {
  return {
    id: crypto.randomUUID(),
    type: "company",
    name: company?.displayName ?? INSIGHT_MEDIA_GROUP_LLC,
    signerName: company?.authorizedSignerName ?? "",
    signerTitle: company?.authorizedSignerTitle,
    email: company?.email,
    roleInAgreement: "Production Company",
    signatureRequired: true,
    initialsRequired: false,
  };
}

/** Prepend Insight Media Group LLC when missing — initiator on internal collaboration deals. */
export function ensureInsightPartyForInternal(
  parties: AgreementParty[],
  companies: Pick<Company, "displayName" | "legalName" | "authorizedSignerName" | "authorizedSignerTitle" | "email">[]
): AgreementParty[] {
  if (hasInsightMediaGroupParty(parties)) return parties;
  const img = companies.find(
    (c) => c.displayName === INSIGHT_MEDIA_GROUP_LLC || c.legalName.includes("Insight Media Group")
  );
  return [createInsightMediaGroupParty(img), ...parties];
}

export function createOrgParty(orgName: string): AgreementParty {
  return {
    id: crypto.randomUUID(),
    type: "company",
    name: orgName,
    signerName: "",
    signerTitle: "",
    email: "",
    roleInAgreement: orgName === INSIGHT_MEDIA_GROUP_LLC ? "Production Company" : "Collaborator",
    signatureRequired: true,
    initialsRequired: false,
  };
}

/** IMG internal deals → IMG first. Partner-led deals → partner first + IMG added. */
export function ensurePartiesForCreator(
  parties: AgreementParty[],
  creatorCompany: string | undefined,
  companies: Pick<Company, "displayName" | "legalName" | "authorizedSignerName" | "authorizedSignerTitle" | "email">[]
): AgreementParty[] {
  const org = creatorCompany?.trim();
  if (!org || org === INSIGHT_MEDIA_GROUP_LLC) {
    return ensureInsightPartyForInternal(parties, companies);
  }

  let next = [...parties];
  if (!next.some((p) => p.name === org)) {
    next = [createOrgParty(org), ...next];
  }
  if (!hasInsightMediaGroupParty(next)) {
    const img = companies.find(
      (c) => c.displayName === INSIGHT_MEDIA_GROUP_LLC || c.legalName.includes("Insight Media Group")
    );
    next = [...next, createInsightMediaGroupParty(img)];
  }
  return next;
}

export function createEmptyAgreement(type: AgreementType = "client_project"): Omit<Agreement, "id" | "createdAt" | "updatedAt"> {
  const isRental = type === "equipment_rental";
  const isTalent = type === "talent_agreement";
  const isContractor = type === "contractor_agreement";
  const isLocation = type === "location_agreement";
  const rentalDetails = isRental ? { ...EMPTY_EQUIPMENT_RENTAL_DETAILS, lineItems: [] } : undefined;
  const talentDetails = isTalent ? { ...EMPTY_TALENT_AGREEMENT_DETAILS } : undefined;
  const contractorDetails = isContractor ? { ...EMPTY_CONTRACTOR_AGREEMENT_DETAILS } : undefined;
  const locationDetails = isLocation ? { ...EMPTY_LOCATION_AGREEMENT_DETAILS, propLineItems: [] } : undefined;
  const paymentTerms = isRental
    ? syncRentalPaymentTerms(rentalDetails!)
    : isTalent
      ? syncPayeePaymentTerms(talentDetails!.feeAmount)
      : isContractor
        ? syncPayeePaymentTerms(contractorDetails!.feeAmount)
        : isLocation
          ? syncLocationPaymentTerms(locationDetails!)
          : suggestPaymentTerms(3000);

  return {
    projectId: undefined,
    agreementType: type,
    title: isRental
      ? "Equipment Rental Agreement"
      : isTalent
        ? "Talent Agreement"
        : isContractor
          ? "Contractor Agreement"
          : isLocation
            ? "Location & Prop Agreement"
            : "",
    version: 1,
    status: "draft",
    parties: [],
    projectDetails: {
      projectName: isRental ? "Equipment Rental" : isTalent ? "Talent Engagement" : isContractor ? "Contractor Services" : isLocation ? "Location / Prop" : "",
      projectType: isRental || isTalent || isContractor || isLocation ? "Custom Project" : "Business Brand Package",
      shootType: isRental || isContractor || isLocation ? "Custom" : isTalent ? "Interview / Talking Head" : "Photo + Video",
      projectOverview: isRental
        ? "Equipment rental from Insight Media Group LLC for the period and items listed in this agreement."
        : isTalent
          ? "Talent appearance and services for the production identified in this agreement."
          : isContractor
            ? "Contractor services for the production identified in this agreement."
            : isLocation
              ? "Location and/or prop use for the production identified in this agreement."
              : PROJECT_OVERVIEW_TEMPLATES["Business Brand Package"] || "",
      projectGoals: [],
      notes: "",
    },
    payoutDetails: type === "internal_collaboration" ? createDefaultPayout(3000) : undefined,
    gearDetails: {
      insightGearUsed: isRental,
      gearPackage: isRental ? "Custom Gear List" : "No Insight Gear Used",
      equipmentFeeIncludedInProducerFee: !isRental,
      gearResponsibilityClause: DEFAULT_GEAR_CLAUSE,
      gearItems: [],
    },
    equipmentRentalDetails: rentalDetails,
    talentAgreementDetails: talentDetails,
    contractorAgreementDetails: contractorDetails,
    locationAgreementDetails: locationDetails,
    roles: [],
    deliverables: [],
    paymentTerms,
    revisionPolicy: {
      includedRevisionRounds: 1,
      revisionRequestWindowDays: 7,
      additionalNotes:
        "One round of minor revisions is included within the stated window. Revisions must be submitted in writing as a single consolidated list. Changes to concept, script, talent, location, music, deliverable count, or format are change orders and may require additional fees.",
    },
    usageRights: {
      organicSocialIncluded: true,
      websiteUseIncluded: true,
      paidAdsIncluded: false,
      fullBuyout: false,
      usageNotes:
        "Unless a full buyout is expressly stated, Insight Media Group LLC retains ownership and grants only the usage rights listed above. Paid advertising, boosted posts, whitelisting, broadcast, extended term, exclusivity, or sublicensing require separate written approval and fees.",
    },
    rawFootagePolicy: {
      rawFootageIncluded: false,
      availableForPurchase: true,
      notes:
        "Raw footage, project files, and source assets are not included unless expressly listed. Available for separate purchase if offered. Files may be deleted after ninety (90) days unless a paid storage agreement exists.",
    },
    cancellationPolicy: {
      depositRefundable: false,
      rescheduleAllowed: true,
      rescheduleNoticeRequiredHours: 72,
      cancellationNotes:
        "Deposits and fees for work already performed are non-refundable. Cancellations within the notice period may forfeit deposits and incur committed costs. Rescheduling is subject to availability and may require additional fees.",
    },
    clauses: getClausesForType(type, isRental || isTalent || isContractor || isLocation),
    signatures: [],
    initials: [],
    identityVerifications: [],
  };
}

export function createDefaultEquipmentRentalParties(
  companies: Pick<Company, "displayName" | "legalName" | "authorizedSignerName" | "authorizedSignerTitle" | "email">[]
): AgreementParty[] {
  const img = companies.find(
    (c) => c.displayName === INSIGHT_MEDIA_GROUP_LLC || c.legalName.includes("Insight Media Group")
  );
  const owner = createInsightMediaGroupParty(img);
  owner.roleInAgreement = "Owner";
  const renter: AgreementParty = {
    id: crypto.randomUUID(),
    type: "company",
    name: "",
    signerName: "",
    signerTitle: "",
    email: "",
    roleInAgreement: "Renter",
    signatureRequired: true,
    initialsRequired: false,
    idVerificationRequired: true,
  };
  return [owner, renter];
}

export function createDefaultPayout(totalFee: number): PayoutDetails {
  return {
    totalProjectFee: totalFee,
    insightFeePercentage: 40,
    insightFeeAmount: totalFee * 0.4,
    aveFeePercentage: 0,
    aveFeeAmount: 0,
    assistantFeeAmount: 0,
    talentFeeAmount: 0,
    editorFeeAmount: 0,
    expensesAmount: 0,
    filmFundReserveAmount: 0,
    customPayouts: [],
    insightGearUsed: true,
    insightShooting: true,
    aveShooting: false,
    aveEditing: false,
    talentInvolved: false,
    assistantInvolved: false,
  };
}

export function suggestPaymentTerms(totalFee: number): PaymentTerms {
  let structure: PaymentStructure;
  let deposit: number;
  let balance: number;

  if (totalFee < 1500) {
    structure = "100% due before shoot";
    deposit = totalFee;
    balance = 0;
  } else if (totalFee <= 5000) {
    structure = "50% deposit / 50% before final delivery";
    deposit = totalFee * 0.5;
    balance = totalFee * 0.5;
  } else {
    structure = "50% deposit / 25% shoot day / 25% before final delivery";
    deposit = totalFee * 0.5;
    balance = totalFee * 0.5;
  }

  return {
    totalFee,
    paymentStructure: structure,
    depositAmount: Math.round(deposit * 100) / 100,
    balanceAmount: Math.round(balance * 100) / 100,
    paymentNotes:
      "The project date is not confirmed until the required deposit or full payment is received and cleared. Final deliverables may be withheld until the remaining balance is paid in full. Late payments may incur interest and collection costs as stated in the Payment Terms clause.",
  };
}

export function suggestInsightPercentage(
  clientOriginated?: string,
  leadProducer?: string,
  insightGearUsed?: boolean
): { percentage: number; note?: string } {
  if (isPartnerOriginatedClient(clientOriginated)) {
    return { percentage: 0, note: PRODUCER_FEE_PRESETS[2].note };
  }
  if (clientOriginated === "Joint") {
    return { percentage: 25, note: PRODUCER_FEE_PRESETS[3].note };
  }
  if (insightGearUsed && leadProducer === "Insight Media Group LLC") {
    return { percentage: 40 };
  }
  if (!insightGearUsed && clientOriginated === "Insight Media Group LLC") {
    return { percentage: 35 };
  }
  return { percentage: 40 };
}

export function calculatePayoutTotals(payout: PayoutDetails) {
  const customTotal = (payout.customPayouts || []).reduce((sum, p) => sum + p.amount, 0);
  const total =
    (payout.insightFeeAmount || 0) +
    (payout.aveFeeAmount || 0) +
    (payout.assistantFeeAmount || 0) +
    (payout.talentFeeAmount || 0) +
    (payout.editorFeeAmount || 0) +
    (payout.expensesAmount || 0) +
    (payout.filmFundReserveAmount || 0) +
    customTotal;

  const remaining = payout.totalProjectFee - total;
  return { total, remaining, exceedsBudget: total > payout.totalProjectFee };
}

export function syncPayoutAmounts(payout: PayoutDetails): PayoutDetails {
  const fee = payout.totalProjectFee;
  return {
    ...payout,
    insightFeeAmount: payout.insightFeePercentage
      ? Math.round((fee * payout.insightFeePercentage) / 100)
      : payout.insightFeeAmount,
    aveFeeAmount: payout.aveFeePercentage
      ? Math.round((fee * payout.aveFeePercentage) / 100)
      : payout.aveFeeAmount,
    assistantInvolved: (payout.assistantFeeAmount ?? 0) > 0,
    talentInvolved: (payout.talentFeeAmount ?? 0) > 0,
  };
}

export function getProjectOverview(projectType: ProjectType): string {
  return (
    PROJECT_OVERVIEW_TEMPLATES[projectType] ||
    `Insight Media Group will produce professional ${projectType.toLowerCase()} content based on the agreed scope, deliverables, and timeline.`
  );
}

export function generateAgreementTitle(projectName: string, type: AgreementType): string {
  const suffix =
    type === "internal_collaboration"
      ? "Internal Collaboration Agreement"
      : type === "equipment_rental"
        ? "Equipment Rental Agreement"
        : type === "talent_agreement"
          ? "Talent Agreement"
          : type === "contractor_agreement"
            ? "Contractor Agreement"
            : type === "location_agreement"
              ? "Location & Prop Agreement"
              : "Client Project Agreement";
  return projectName ? `${projectName} — ${suffix}` : suffix;
}
