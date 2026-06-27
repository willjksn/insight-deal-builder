import {
  Agreement,
  Deliverable,
  PackageCustomPayout,
  PackageDeliverable,
  ServicePackage,
} from "@/lib/types";
import {
  createDefaultPayout,
  generateAgreementTitle,
  getProjectOverview,
  suggestInsightPercentage,
  suggestPaymentTerms,
  syncPayoutAmounts,
} from "@/lib/agreement/defaults";
import { SERVICE_PACKAGE_PRESETS } from "@/lib/constants/presets";

export function presetToServicePackage(
  preset: (typeof SERVICE_PACKAGE_PRESETS)[number]
): Omit<ServicePackage, "id" | "createdAt" | "updatedAt"> {
  const insightPct = 40;
  const price = preset.price;
  return {
    name: preset.name,
    price,
    projectType: preset.projectType,
    shootType: "Photo + Video",
    notes: preset.notes,
    deliverables: preset.deliverables,
    insightFeePercentage: insightPct,
    aveFeePercentage: 0,
    assistantFeeAmount: 0,
    talentFeeAmount: 0,
    editorFeeAmount: 0,
    expensesAmount: 0,
    filmFundReserveAmount: 0,
    insightGearUsed: true,
    active: true,
    customPayouts: [],
  };
}

export function sumPackageCustomPayouts(customPayouts?: PackageCustomPayout[]): number {
  return (customPayouts ?? []).reduce((sum, p) => sum + (p.amount || 0), 0);
}

export function estimatePackageFixedTotal(
  pkg: Pick<
    ServicePackage,
    | "price"
    | "insightFeePercentage"
    | "assistantFeeAmount"
    | "talentFeeAmount"
    | "editorFeeAmount"
    | "expensesAmount"
    | "filmFundReserveAmount"
    | "customPayouts"
  >
): number {
  const insightAmt = Math.round((pkg.price * (pkg.insightFeePercentage ?? 0)) / 100);
  return (
    insightAmt +
    (pkg.assistantFeeAmount ?? 0) +
    (pkg.talentFeeAmount ?? 0) +
    (pkg.editorFeeAmount ?? 0) +
    (pkg.expensesAmount ?? 0) +
    (pkg.filmFundReserveAmount ?? 0) +
    sumPackageCustomPayouts(pkg.customPayouts)
  );
}

export function customPayoutsForAgreement(
  items?: PackageCustomPayout[]
): NonNullable<Agreement["payoutDetails"]>["customPayouts"] {
  return (items ?? [])
    .filter((p) => p.name.trim() || p.amount > 0)
    .map((p) => ({
      id: crypto.randomUUID(),
      name: p.name,
      role: p.role,
      amount: p.amount,
      notes: p.notes,
    }));
}

export function buildPayoutFromPackage(
  pkg: Pick<
    ServicePackage,
    | "price"
    | "insightFeePercentage"
    | "aveFeePercentage"
    | "assistantFeeAmount"
    | "talentFeeAmount"
    | "editorFeeAmount"
    | "expensesAmount"
    | "filmFundReserveAmount"
    | "insightGearUsed"
    | "customPayouts"
  >,
  context?: Pick<Agreement["projectDetails"], "clientOriginated" | "leadProducer">
): ReturnType<typeof syncPayoutAmounts> {
  const fee = pkg.price;
  const gearUsed = pkg.insightGearUsed ?? true;
  const suggested = suggestInsightPercentage(
    context?.clientOriginated,
    context?.leadProducer,
    gearUsed
  );
  const insightPct =
    pkg.insightFeePercentage ??
    (context?.clientOriginated || context?.leadProducer ? suggested.percentage : 40);

  let payout = createDefaultPayout(fee);
  payout = {
    ...payout,
    totalProjectFee: fee,
    insightFeePercentage: insightPct,
    aveFeePercentage: pkg.aveFeePercentage ?? 0,
    assistantFeeAmount: pkg.assistantFeeAmount ?? 0,
    talentFeeAmount: pkg.talentFeeAmount ?? 0,
    editorFeeAmount: pkg.editorFeeAmount ?? 0,
    expensesAmount: pkg.expensesAmount ?? 0,
    filmFundReserveAmount: pkg.filmFundReserveAmount ?? 0,
    insightGearUsed: gearUsed,
    customPayouts: customPayoutsForAgreement(pkg.customPayouts),
  };

  payout = syncPayoutAmounts(payout);

  const fixedTotal =
    (payout.insightFeeAmount || 0) +
    (payout.assistantFeeAmount || 0) +
    (payout.talentFeeAmount || 0) +
    (payout.editorFeeAmount || 0) +
    (payout.expensesAmount || 0) +
    (payout.filmFundReserveAmount || 0) +
    sumPackageCustomPayouts(pkg.customPayouts);

  if (pkg.aveFeePercentage && pkg.aveFeePercentage > 0) {
    payout.aveFeePercentage = pkg.aveFeePercentage;
    payout = syncPayoutAmounts(payout);
  } else if (payout.aveFeeAmount === 0 && fixedTotal < fee) {
    payout.aveFeeAmount = fee - fixedTotal;
  }

  return syncPayoutAmounts(payout);
}

export function deliverablesFromPackage(items: PackageDeliverable[]): Deliverable[] {
  return items.map((d) => ({
    id: crypto.randomUUID(),
    name: d.name,
    quantity: d.quantity,
  }));
}

/** Apply a service package to wizard agreement state (fee, deliverables, splits, payment) */
export function applyServicePackageToAgreement(
  agreement: Pick<
    Agreement,
    | "agreementType"
    | "projectDetails"
    | "title"
    | "payoutDetails"
    | "paymentTerms"
    | "deliverables"
    | "gearDetails"
  >,
  pkg: ServicePackage
): Partial<Agreement> {
  const deliverables = deliverablesFromPackage(pkg.deliverables);
  const paymentTerms = suggestPaymentTerms(pkg.price);
  const projectName = agreement.projectDetails.projectName || pkg.name;

  const patch: Partial<Agreement> = {
    deliverables,
    paymentTerms,
    projectDetails: {
      ...agreement.projectDetails,
      projectName,
      projectType: pkg.projectType,
      shootType: pkg.shootType ?? agreement.projectDetails.shootType,
      projectOverview: getProjectOverview(pkg.projectType),
      notes: pkg.notes ?? agreement.projectDetails.notes,
    },
    title: generateAgreementTitle(projectName, agreement.agreementType),
  };

  if (agreement.agreementType === "internal_collaboration") {
    patch.payoutDetails = buildPayoutFromPackage(pkg, agreement.projectDetails);
    if (patch.payoutDetails.insightGearUsed !== undefined && agreement.gearDetails) {
      patch.gearDetails = {
        ...agreement.gearDetails,
        insightGearUsed: patch.payoutDetails.insightGearUsed,
        gearPackage: patch.payoutDetails.insightGearUsed
          ? agreement.gearDetails.gearPackage === "No Insight Gear Used"
            ? "Standard Insight Gear Package"
            : agreement.gearDetails.gearPackage
          : "No Insight Gear Used",
      };
    }
  }

  return patch;
}

export const EMPTY_SERVICE_PACKAGE: Omit<
  ServicePackage,
  "id" | "createdAt" | "updatedAt"
> = {
  name: "",
  price: 1500,
  projectType: "Business Brand Package",
  shootType: "Photo + Video",
  notes: "",
  deliverables: [{ name: "Edited reels", quantity: 5 }],
  insightFeePercentage: 40,
  aveFeePercentage: 0,
  assistantFeeAmount: 0,
  talentFeeAmount: 0,
  editorFeeAmount: 0,
  expensesAmount: 0,
  filmFundReserveAmount: 0,
  insightGearUsed: true,
  active: true,
  customPayouts: [],
};
