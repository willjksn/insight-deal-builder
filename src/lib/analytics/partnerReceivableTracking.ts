import {
  Agreement,
  AgreementPaymentTracking,
  PaymentInstallmentRecord,
  PayoutDetails,
} from "@/lib/types";
import { installmentOutstanding, InstallmentPaymentMode } from "@/lib/analytics/paymentTracking";
import { INSIGHT_MEDIA_GROUP_LLC } from "@/lib/utils/permissions";

function addReceivableLine(
  rows: PaymentInstallmentRecord[],
  id: string,
  label: string,
  amount: number | undefined
) {
  if (amount != null && amount > 0) {
    rows.push({ id, label, amountDue: amount, paidAmount: 0 });
  }
}

/** Amounts a collaborator remits to Insight Media Group after signing an internal deal. */
export function buildPartnerReceivableInstallments(payout: PayoutDetails): PaymentInstallmentRecord[] {
  const rows: PaymentInstallmentRecord[] = [];
  addReceivableLine(
    rows,
    "reimburse:insight",
    "Producer fee remittance",
    payout.insightFeeAmount
  );
  addReceivableLine(
    rows,
    "reimburse:film-fund",
    "Film fund contribution",
    payout.filmFundReserveAmount
  );
  return rows;
}

export function mergePartnerReceivableInstallments(
  expected: PaymentInstallmentRecord[],
  stored: PaymentInstallmentRecord[] | undefined
): PaymentInstallmentRecord[] {
  if (!stored?.length) return expected.map((row) => ({ ...row }));

  const byId = new Map(stored.map((row) => [row.id, row]));
  return expected.map((row) => {
    const saved = byId.get(row.id);
    if (!saved) return { ...row };
    return {
      ...row,
      amountDue: row.amountDue,
      paidAmount: Math.min(saved.paidAmount ?? 0, row.amountDue),
      paidAt: saved.paidAt,
      recordedBy: saved.recordedBy,
      notes: saved.notes,
      paymentSource: saved.paymentSource,
      stripeCheckoutSessionId: saved.stripeCheckoutSessionId,
      stripePaymentIntentId: saved.stripePaymentIntentId,
    };
  });
}

export function resolvePartnerReceivableInstallments(
  agreement: Pick<Agreement, "payoutDetails" | "paymentTracking">
): PaymentInstallmentRecord[] {
  if (!agreement.payoutDetails) return [];
  const expected = buildPartnerReceivableInstallments(agreement.payoutDetails);
  return mergePartnerReceivableInstallments(
    expected,
    agreement.paymentTracking?.partnerReceivableInstallments
  );
}

export function partnerReceivableOutstanding(
  agreement: Pick<Agreement, "payoutDetails" | "paymentTracking">
): number {
  return resolvePartnerReceivableInstallments(agreement).reduce(
    (sum, row) => sum + installmentOutstanding(row),
    0
  );
}

export function partnerReceivableTotalDue(
  agreement: Pick<Agreement, "payoutDetails" | "paymentTracking">
): number {
  return resolvePartnerReceivableInstallments(agreement).reduce(
    (sum, row) => sum + row.amountDue,
    0
  );
}

export function partnerReceivableTotalPaid(
  agreement: Pick<Agreement, "payoutDetails" | "paymentTracking">
): number {
  return resolvePartnerReceivableInstallments(agreement).reduce(
    (sum, row) => sum + (row.paidAmount ?? 0),
    0
  );
}

export function recordPartnerReceivablePayment(
  tracking: AgreementPaymentTracking | undefined,
  payout: PayoutDetails,
  installmentId: string,
  amount: number,
  paidAt: string,
  recordedBy: string,
  notes?: string,
  mode: InstallmentPaymentMode = "add"
): AgreementPaymentTracking {
  const partnerReceivableInstallments = mergePartnerReceivableInstallments(
    buildPartnerReceivableInstallments(payout),
    tracking?.partnerReceivableInstallments
  ).map((row) => {
    if (row.id !== installmentId) return row;
    const payment = Math.max(0, amount);
    const nextPaid =
      mode === "add"
        ? Math.min(row.amountDue, (row.paidAmount ?? 0) + payment)
        : Math.min(row.amountDue, payment);
    return {
      ...row,
      paidAmount: nextPaid,
      paidAt: nextPaid > 0 ? paidAt : undefined,
      recordedBy: nextPaid > 0 ? recordedBy : undefined,
      notes: notes?.trim() || row.notes,
    };
  });

  return {
    installments: tracking?.installments ?? [],
    partnerInstallments: tracking?.partnerInstallments,
    partnerReceivableInstallments,
  };
}

export function clearPartnerReceivablePayment(
  tracking: AgreementPaymentTracking | undefined,
  payout: PayoutDetails,
  installmentId: string
): AgreementPaymentTracking {
  const partnerReceivableInstallments = mergePartnerReceivableInstallments(
    buildPartnerReceivableInstallments(payout),
    tracking?.partnerReceivableInstallments
  ).map((row) => {
    if (row.id !== installmentId) return row;
    return {
      ...row,
      paidAmount: 0,
      paidAt: undefined,
      recordedBy: undefined,
      notes: undefined,
      paymentSource: undefined,
      stripeCheckoutSessionId: undefined,
      stripePaymentIntentId: undefined,
    };
  });

  return {
    installments: tracking?.installments ?? [],
    partnerInstallments: tracking?.partnerInstallments,
    partnerReceivableInstallments,
  };
}

export function isInsightMediaGroupParty(party: { name?: string; roleInAgreement?: string }) {
  return (
    party.roleInAgreement === "Production Company" ||
    (party.name?.includes("Insight Media Group") ?? false) ||
    party.name === INSIGHT_MEDIA_GROUP_LLC
  );
}
