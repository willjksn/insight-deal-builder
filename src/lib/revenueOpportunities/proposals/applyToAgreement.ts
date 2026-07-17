import type { Agreement } from "@/lib/types";
import type { AgreementProposalPrefill } from "@/lib/revenueOpportunities/types/proposal";
import { createEmptyAgreement, suggestPaymentTerms } from "@/lib/agreement/defaults";

/** Map revenue proposal prefill into agreement wizard initial state (client project). */
export function applyRevenueProposalPrefill(
  base: Agreement,
  prefill: AgreementProposalPrefill
): Partial<Agreement> {
  const fee = prefill.estimatedFee ?? base.paymentTerms?.totalFee ?? 0;
  let paymentTerms = suggestPaymentTerms(fee);
  if (prefill.paymentStructure) {
    paymentTerms = {
      ...paymentTerms,
      paymentStructure: prefill.paymentStructure as Agreement["paymentTerms"]["paymentStructure"],
    };
  }

  const deliverables = prefill.deliverables.map((name) => ({
    id: crypto.randomUUID(),
    name,
    quantity: 1,
    ...(prefill.scopeNotes ? { notes: prefill.scopeNotes } : {}),
  }));

  return {
    title: prefill.suggestedTitle,
    projectDetails: {
      ...base.projectDetails,
      projectOverview: prefill.projectOverview,
    },
    deliverables: deliverables.length ? deliverables : base.deliverables,
    paymentTerms,
  };
}

export function emptyClientAgreementFromRevenuePrefill(prefill: AgreementProposalPrefill): Partial<Agreement> {
  const empty = createEmptyAgreement("client_project") as Agreement;
  return applyRevenueProposalPrefill(empty, prefill);
}
