import {
  applyServicePackageToAgreement,
  deliverablesFromPackage,
} from "@/lib/agreement/packages";
import {
  generateAgreementTitle,
  suggestPaymentTerms,
  syncPayoutAmounts,
} from "@/lib/agreement/defaults";
import { QuoteScopeSuggestion } from "@/lib/agreement/scopeSuggestTypes";
import { Agreement, GearPackageName, ServicePackage } from "@/lib/types";

export function resolvePackageForSuggestion(
  suggestion: Pick<QuoteScopeSuggestion, "recommendedPackageId" | "recommendedPackageName" | "estimatedTotalFee">,
  packages: ServicePackage[]
): ServicePackage | null {
  if (suggestion.recommendedPackageId) {
    const byId = packages.find((p) => p.id === suggestion.recommendedPackageId);
    if (byId) return byId;
  }

  const name = suggestion.recommendedPackageName?.trim().toLowerCase();
  if (name) {
    const exact = packages.find((p) => p.name.toLowerCase() === name);
    if (exact) return exact;
    const fuzzy = packages.find(
      (p) => p.name.toLowerCase().includes(name) || name.includes(p.name.toLowerCase())
    );
    if (fuzzy) return fuzzy;
  }

  if (!packages.length || suggestion.estimatedTotalFee <= 0) return null;

  return packages.reduce((best, p) =>
    Math.abs(p.price - suggestion.estimatedTotalFee) < Math.abs(best.price - suggestion.estimatedTotalFee)
      ? p
      : best
  );
}

export function applyScopeSuggestionToAgreement(
  agreement: Agreement,
  suggestion: QuoteScopeSuggestion,
  servicePackages: ServicePackage[]
): { patch: Partial<Agreement>; selectedPackageId: string } {
  const matchedPackage = resolvePackageForSuggestion(suggestion, servicePackages);
  const fee = matchedPackage?.price ?? suggestion.estimatedTotalFee;

  let patch: Partial<Agreement> = {
    projectDetails: {
      ...agreement.projectDetails,
      projectName: suggestion.projectName,
      projectType: suggestion.projectType,
      shootType: suggestion.shootType,
      projectOverview: suggestion.projectOverview,
      projectGoals: suggestion.projectGoals.length ? suggestion.projectGoals : agreement.projectDetails.projectGoals,
      location: suggestion.location?.trim() || agreement.projectDetails.location,
      shootTime: suggestion.shootTime?.trim() || agreement.projectDetails.shootTime,
      notes: agreement.projectDetails.notes,
    },
    title: generateAgreementTitle(suggestion.projectName, agreement.agreementType),
    deliverables: suggestion.deliverables.map((d) => ({
      id: crypto.randomUUID(),
      name: d.name,
      quantity: d.quantity,
    })),
    paymentTerms: suggestPaymentTerms(fee),
  };

  if (matchedPackage) {
    patch = {
      ...patch,
      ...applyServicePackageToAgreement({ ...agreement, ...patch }, matchedPackage),
      deliverables: deliverablesFromPackage(matchedPackage.deliverables),
    };
    return { patch, selectedPackageId: matchedPackage.id };
  }

  if (agreement.agreementType === "internal_collaboration" && agreement.payoutDetails) {
    patch.payoutDetails = syncPayoutAmounts({
      ...agreement.payoutDetails,
      totalProjectFee: fee,
      insightGearUsed: suggestion.insightGearUsed,
    });
  }

  if (agreement.gearDetails) {
    const gearPackage: GearPackageName =
      suggestion.suggestedGearPackage ??
      (suggestion.insightGearUsed ? "Standard Insight Gear Package" : "No Insight Gear Used");
    patch.gearDetails = {
      ...agreement.gearDetails,
      insightGearUsed: suggestion.insightGearUsed,
      gearPackage,
    };
  }

  return { patch, selectedPackageId: "" };
}
