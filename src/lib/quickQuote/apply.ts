import { QuickQuoteDraft } from "@/lib/quickQuote/types";
import { formatMarketArea } from "@/lib/agreement/marketArea";
import { applyScopeSuggestionToAgreement } from "@/lib/agreement/applyScopeSuggestion";
import { QuoteScopeSuggestion } from "@/lib/agreement/scopeSuggestTypes";
import {
  generateAgreementTitle,
  getProjectOverview,
  suggestPaymentTerms,
  syncPayoutAmounts,
} from "@/lib/agreement/defaults";
import { Agreement, ServicePackage } from "@/lib/types";
import { quickQuoteLocationLabel } from "@/lib/quickQuote/storage";

export { loadQuickQuoteDraft, clearQuickQuoteDraft } from "@/lib/quickQuote/storage";

export function quickQuoteToScopeSuggestion(draft: QuickQuoteDraft): QuoteScopeSuggestion {
  return {
    agreementType: "client_project",
    recommendedPackageId: null,
    recommendedPackageName: null,
    projectName: draft.projectName.trim() || "Client project",
    projectType: draft.projectType,
    shootType: draft.shootType,
    projectOverview: draft.scopeOverview?.trim() || draft.jobDescription.trim(),
    projectGoals: [],
    location: quickQuoteLocationLabel(draft),
    estimatedTotalFee: draft.proposedFee,
    deliverables: draft.deliverables.length
      ? draft.deliverables
      : [{ name: "Edited deliverables", quantity: 1 }],
    suggestedGearPackage: null,
    insightGearUsed: true,
    rationale: draft.marketSummary?.trim() || "From quick quote estimate.",
    checklist: ["Confirm shoot date", "Confirm deliverables and revisions", "Confirm usage rights"],
  };
}

export function applyQuickQuoteToAgreement(
  agreement: Agreement,
  draft: QuickQuoteDraft,
  servicePackages: ServicePackage[]
): { patch: Partial<Agreement>; selectedPackageId: string } {
  const suggestion = quickQuoteToScopeSuggestion(draft);
  const { patch, selectedPackageId } = applyScopeSuggestionToAgreement(
    agreement,
    suggestion,
    servicePackages
  );

  const fee = draft.proposedFee > 0 ? draft.proposedFee : suggestion.estimatedTotalFee;
  const overview =
    draft.scopeOverview?.trim() ||
    draft.jobDescription.trim() ||
    getProjectOverview(draft.projectType);

  return {
    selectedPackageId,
    patch: {
      ...patch,
      projectDetails: {
        ...agreement.projectDetails,
        ...(patch.projectDetails ?? {}),
        projectName: draft.projectName.trim() || suggestion.projectName,
        clientName: draft.clientName?.trim() || agreement.projectDetails.clientName,
        projectType: draft.projectType,
        shootType: draft.shootType,
        location: quickQuoteLocationLabel(draft),
        projectOverview: overview,
        notes: draft.internalNotes?.trim() || agreement.projectDetails.notes,
      },
      title: generateAgreementTitle(
        draft.projectName.trim() || suggestion.projectName,
        "client_project"
      ),
      paymentTerms: suggestPaymentTerms(fee),
      payoutDetails: agreement.payoutDetails
        ? syncPayoutAmounts({ ...agreement.payoutDetails, totalProjectFee: fee })
        : undefined,
      deliverables:
        draft.deliverables.length > 0
          ? draft.deliverables.map((d) => ({
              id: crypto.randomUUID(),
              name: d.name,
              quantity: d.quantity,
            }))
          : patch.deliverables,
    },
  };
}

// Re-export for agreement wizard consumers
export { formatMarketArea } from "@/lib/agreement/marketArea";
