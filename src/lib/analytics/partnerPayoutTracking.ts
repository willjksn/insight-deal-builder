import {
  Agreement,
  AgreementPaymentTracking,
  PaymentInstallmentRecord,
  PayoutDetails,
} from "@/lib/types";
import { installmentOutstanding, InstallmentPaymentMode } from "@/lib/analytics/paymentTracking";

function addPartnerLine(
  rows: PaymentInstallmentRecord[],
  id: string,
  label: string,
  amount: number | undefined
) {
  if (amount != null && amount > 0) {
    rows.push({ id, label, amountDue: amount, paidAmount: 0 });
  }
}

export function buildExpectedPartnerInstallments(payout: PayoutDetails): PaymentInstallmentRecord[] {
  const rows: PaymentInstallmentRecord[] = [];
  addPartnerLine(rows, "partner:ave", "Partner / AVE fee", payout.aveFeeAmount);
  addPartnerLine(rows, "partner:assistant", "Assistant fee", payout.assistantFeeAmount);
  addPartnerLine(rows, "partner:talent", "Talent fee", payout.talentFeeAmount);
  addPartnerLine(rows, "partner:editor", "Editor fee", payout.editorFeeAmount);
  addPartnerLine(rows, "partner:expenses", "Expenses reimbursement", payout.expensesAmount);

  for (const custom of payout.customPayouts ?? []) {
    if ((custom.amount ?? 0) > 0) {
      rows.push({
        id: `partner:custom:${custom.id}`,
        label: custom.name || custom.role || "Custom payout",
        amountDue: custom.amount,
        paidAmount: 0,
      });
    }
  }

  return rows;
}

export type PartnerPayoutBreakdownLine = {
  label: string;
  amount: number;
  retained?: boolean;
};

/** All payout lines for display (Insight fee marked retained). */
export function getPartnerPayoutBreakdown(payout: PayoutDetails): PartnerPayoutBreakdownLine[] {
  const lines: PartnerPayoutBreakdownLine[] = [];
  if ((payout.insightFeeAmount ?? 0) > 0) {
    lines.push({
      label: `Insight Media Group (${payout.insightFeePercentage ?? 0}%)`,
      amount: payout.insightFeeAmount ?? 0,
      retained: true,
    });
  }
  if ((payout.aveFeeAmount ?? 0) > 0) {
    lines.push({ label: "Partner / AVE fee", amount: payout.aveFeeAmount ?? 0 });
  }
  if ((payout.assistantFeeAmount ?? 0) > 0) {
    lines.push({ label: "Assistant fee", amount: payout.assistantFeeAmount ?? 0 });
  }
  if ((payout.talentFeeAmount ?? 0) > 0) {
    lines.push({ label: "Talent fee", amount: payout.talentFeeAmount ?? 0 });
  }
  if ((payout.editorFeeAmount ?? 0) > 0) {
    lines.push({ label: "Editor fee", amount: payout.editorFeeAmount ?? 0 });
  }
  if ((payout.expensesAmount ?? 0) > 0) {
    lines.push({ label: "Expenses reimbursement", amount: payout.expensesAmount ?? 0 });
  }
  for (const custom of payout.customPayouts ?? []) {
    if ((custom.amount ?? 0) > 0) {
      lines.push({
        label: custom.name || custom.role || "Custom payout",
        amount: custom.amount,
      });
    }
  }
  return lines;
}

export function listPartnerAgreements(agreements: Agreement[]): Agreement[] {
  return agreements
    .filter(
      (a) =>
        a.agreementType === "internal_collaboration" &&
        a.status !== "void" &&
        a.status !== "archived"
    )
    .sort((a, b) => (b.updatedAt?.toMillis?.() ?? 0) - (a.updatedAt?.toMillis?.() ?? 0));
}

const SIGNED_STATUSES = new Set(["signed", "completed", "partially_signed"]);

/** Signed internal deals with collaborator payout balances still open. */
export function listSignedPartnerAgreementsWithOutstanding(agreements: Agreement[]): Agreement[] {
  return listPartnerAgreements(agreements).filter(
    (a) => SIGNED_STATUSES.has(a.status) && partnerOutstanding(a) > 0
  );
}

export function mergePartnerInstallments(
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
    };
  });
}

export function resolvePartnerInstallments(
  agreement: Pick<Agreement, "payoutDetails" | "paymentTracking">
): PaymentInstallmentRecord[] {
  if (!agreement.payoutDetails) return [];
  const expected = buildExpectedPartnerInstallments(agreement.payoutDetails);
  return mergePartnerInstallments(expected, agreement.paymentTracking?.partnerInstallments);
}

export function partnerOutstanding(
  agreement: Pick<Agreement, "payoutDetails" | "paymentTracking">
): number {
  return resolvePartnerInstallments(agreement).reduce(
    (sum, row) => sum + installmentOutstanding(row),
    0
  );
}

export function partnerTotalPaid(
  agreement: Pick<Agreement, "payoutDetails" | "paymentTracking">
): number {
  return resolvePartnerInstallments(agreement).reduce(
    (sum, row) => sum + (row.paidAmount ?? 0),
    0
  );
}

export function partnerTotalDue(
  agreement: Pick<Agreement, "payoutDetails" | "paymentTracking">
): number {
  return resolvePartnerInstallments(agreement).reduce((sum, row) => sum + row.amountDue, 0);
}

export function partnerCashRecordedInYear(
  agreement: Pick<Agreement, "payoutDetails" | "paymentTracking">,
  year: number
): number {
  let total = 0;
  for (const row of resolvePartnerInstallments(agreement)) {
    if (!row.paidAt) continue;
    const y = new Date(row.paidAt).getFullYear();
    if (!Number.isNaN(y) && y === year) {
      total += row.paidAmount ?? 0;
    }
  }
  return total;
}

export function recordPartnerInstallmentPayment(
  tracking: AgreementPaymentTracking | undefined,
  payout: PayoutDetails,
  installmentId: string,
  amount: number,
  paidAt: string,
  recordedBy: string,
  notes?: string,
  mode: InstallmentPaymentMode = "add"
): AgreementPaymentTracking {
  const partnerInstallments = mergePartnerInstallments(
    buildExpectedPartnerInstallments(payout),
    tracking?.partnerInstallments
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
    partnerInstallments,
  };
}

export function clearPartnerInstallmentPayment(
  tracking: AgreementPaymentTracking | undefined,
  payout: PayoutDetails,
  installmentId: string
): AgreementPaymentTracking {
  const partnerInstallments = mergePartnerInstallments(
    buildExpectedPartnerInstallments(payout),
    tracking?.partnerInstallments
  ).map((row) => {
    if (row.id !== installmentId) return row;
    return {
      ...row,
      paidAmount: 0,
      paidAt: undefined,
      recordedBy: undefined,
      notes: undefined,
    };
  });

  return {
    installments: tracking?.installments ?? [],
    partnerInstallments,
  };
}
