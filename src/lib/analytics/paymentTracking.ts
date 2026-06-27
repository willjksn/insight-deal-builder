import {
  Agreement,
  AgreementPaymentTracking,
  PaymentInstallmentRecord,
  PaymentTerms,
} from "@/lib/types";

export function buildExpectedInstallments(terms: PaymentTerms): PaymentInstallmentRecord[] {
  const { totalFee, depositAmount, balanceAmount } = terms;
  const rows: PaymentInstallmentRecord[] = [];

  if (depositAmount != null && depositAmount > 0) {
    rows.push({
      id: "deposit",
      label: "Deposit",
      amountDue: depositAmount,
      paidAmount: 0,
    });
  }

  if (balanceAmount != null && balanceAmount > 0) {
    rows.push({
      id: "balance",
      label: "Balance",
      amountDue: balanceAmount,
      paidAmount: 0,
    });
  }

  if (rows.length === 0 && totalFee > 0) {
    rows.push({
      id: "full",
      label: "Total fee",
      amountDue: totalFee,
      paidAmount: 0,
    });
  }

  return rows;
}

export function mergePaymentInstallments(
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

export function resolvePaymentInstallments(agreement: Pick<Agreement, "paymentTerms" | "paymentTracking">) {
  const expected = buildExpectedInstallments(agreement.paymentTerms);
  return mergePaymentInstallments(expected, agreement.paymentTracking?.installments);
}

export function installmentOutstanding(row: PaymentInstallmentRecord): number {
  return Math.max(0, row.amountDue - (row.paidAmount ?? 0));
}

export function agreementOutstanding(agreement: Pick<Agreement, "paymentTerms" | "paymentTracking">): number {
  return resolvePaymentInstallments(agreement).reduce((sum, row) => sum + installmentOutstanding(row), 0);
}

export function agreementTotalPaid(agreement: Pick<Agreement, "paymentTerms" | "paymentTracking">): number {
  return resolvePaymentInstallments(agreement).reduce((sum, row) => sum + (row.paidAmount ?? 0), 0);
}

export function agreementTotalDue(agreement: Pick<Agreement, "paymentTerms" | "paymentTracking">): number {
  return resolvePaymentInstallments(agreement).reduce((sum, row) => sum + row.amountDue, 0);
}

export function cashRecordedInYear(
  agreement: Pick<Agreement, "paymentTerms" | "paymentTracking">,
  year: number
): number {
  let total = 0;
  for (const row of resolvePaymentInstallments(agreement)) {
    if (!row.paidAt) continue;
    const y = new Date(row.paidAt).getFullYear();
    if (!Number.isNaN(y) && y === year) {
      total += row.paidAmount ?? 0;
    }
  }
  return total;
}

export function isInstallmentFullyPaid(row: PaymentInstallmentRecord): boolean {
  return installmentOutstanding(row) <= 0 && (row.paidAmount ?? 0) > 0;
}

export function recordInstallmentPayment(
  tracking: AgreementPaymentTracking | undefined,
  terms: PaymentTerms,
  installmentId: string,
  amount: number,
  paidAt: string,
  recordedBy: string,
  notes?: string
): AgreementPaymentTracking {
  const installments = mergePaymentInstallments(
    buildExpectedInstallments(terms),
    tracking?.installments
  );
  const next = installments.map((row) => {
    if (row.id !== installmentId) return row;
    const capped = Math.min(row.amountDue, Math.max(0, amount));
    return {
      ...row,
      paidAmount: capped,
      paidAt: capped > 0 ? paidAt : undefined,
      recordedBy: capped > 0 ? recordedBy : undefined,
      notes: notes?.trim() || row.notes,
    };
  });
  return { installments: next, partnerInstallments: tracking?.partnerInstallments };
}

export function clearInstallmentPayment(
  tracking: AgreementPaymentTracking | undefined,
  terms: PaymentTerms,
  installmentId: string
): AgreementPaymentTracking {
  const installments = mergePaymentInstallments(
    buildExpectedInstallments(terms),
    tracking?.installments
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
  return { installments, partnerInstallments: tracking?.partnerInstallments };
}
