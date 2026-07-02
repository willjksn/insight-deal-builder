import { Agreement } from "@/lib/types";
import {
  installmentOutstanding,
  resolvePaymentInstallments,
} from "@/lib/analytics/paymentTracking";

const PAYABLE_STATUSES = new Set(["signed", "completed", "partially_signed"]);

export function agreementAcceptsStripePayments(agreement: Agreement): boolean {
  return (
    agreement.agreementType === "client_project" &&
    PAYABLE_STATUSES.has(agreement.status) &&
    agreement.paymentTerms.totalFee > 0
  );
}

export function installmentPayableAmount(
  agreement: Agreement,
  installmentId: string
): number | null {
  if (!agreementAcceptsStripePayments(agreement)) return null;
  const row = resolvePaymentInstallments(agreement).find((r) => r.id === installmentId);
  if (!row) return null;
  const outstanding = installmentOutstanding(row);
  return outstanding > 0 ? outstanding : null;
}

export function dollarsToCents(amount: number): number {
  return Math.round(amount * 100);
}

export function centsToDollars(cents: number): number {
  return cents / 100;
}
