import { Agreement, AgreementPaymentTracking, PaymentInvoiceRecord } from "@/lib/types";
import {
  installmentOutstanding,
  resolvePaymentInstallments,
} from "@/lib/analytics/paymentTracking";
import { getExternalSigningParty } from "@/lib/agreement/payeeParties";
import { formatPromotionSummary } from "@/lib/agreement/paymentDiscount";

export function buildInvoiceNumber(agreementId: string, installmentId: string, issuedAt: string): string {
  const datePart = issuedAt.slice(0, 10).replace(/-/g, "");
  const agreementPart = agreementId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase();
  const installmentPart = installmentId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase();
  return `INV-${agreementPart}-${installmentPart}-${datePart}`;
}

export function invoiceFilename(invoiceNumber: string): string {
  return `${invoiceNumber.replace(/[^a-zA-Z0-9-]+/g, "-")}.pdf`;
}

export function resolveInvoiceDueDate(
  agreement: Agreement,
  installmentId: string
): string | undefined {
  const terms = agreement.paymentTerms;
  if (installmentId === "deposit" && terms.dueDates?.[0]) return terms.dueDates[0];
  if (installmentId === "balance" && terms.dueDates?.[1]) return terms.dueDates[1];
  if (installmentId === "full" && terms.dueDates?.[0]) return terms.dueDates[0];
  return agreement.projectDetails.shootDate || undefined;
}

export function getInvoiceBillTo(agreement: Agreement): {
  name: string;
  email?: string;
  company?: string;
} {
  const party = getExternalSigningParty(agreement);
  return {
    name: party?.signerName || agreement.projectDetails.clientName || "Client",
    email: party?.email,
    company: party?.name !== party?.signerName ? party?.name : undefined,
  };
}

export function getInvoiceContext(agreement: Agreement, installmentId: string) {
  const row = resolvePaymentInstallments(agreement).find((r) => r.id === installmentId);
  if (!row) throw new Error("Installment not found");

  const outstanding = installmentOutstanding(row);
  if (outstanding <= 0) throw new Error("This installment is already paid in full.");

  const issuedAt = new Date().toISOString();
  const invoiceNumber = buildInvoiceNumber(agreement.id, installmentId, issuedAt);
  const billTo = getInvoiceBillTo(agreement);
  const promotionSummary = formatPromotionSummary(agreement.paymentTerms);

  return {
    row,
    outstanding,
    issuedAt,
    invoiceNumber,
    billTo,
    dueDate: resolveInvoiceDueDate(agreement, installmentId),
    promotionSummary,
  };
}

export function voidOpenInvoicesForInstallment(
  tracking: AgreementPaymentTracking | undefined,
  installmentId: string
): PaymentInvoiceRecord[] {
  const existing = tracking?.paymentInvoices ?? [];
  return existing.map((inv) =>
    inv.installmentId === installmentId && inv.status === "sent"
      ? { ...inv, status: "void" as const }
      : inv
  );
}

export function markPaymentInvoicesPaid(
  tracking: AgreementPaymentTracking | undefined,
  installmentId: string,
  paidAt: string,
  stripe?: { stripeCheckoutSessionId?: string; stripePaymentIntentId?: string }
): AgreementPaymentTracking | undefined {
  if (!tracking?.paymentInvoices?.length) return tracking;

  const paymentInvoices = tracking.paymentInvoices.map((inv) => {
    if (inv.installmentId !== installmentId || inv.status !== "sent") return inv;
    return {
      ...inv,
      status: "paid" as const,
      paidAt,
      stripeCheckoutSessionId: stripe?.stripeCheckoutSessionId ?? inv.stripeCheckoutSessionId,
      stripePaymentIntentId: stripe?.stripePaymentIntentId ?? inv.stripePaymentIntentId,
    };
  });

  return { ...tracking, paymentInvoices };
}

export function appendPaymentInvoice(
  tracking: AgreementPaymentTracking | undefined,
  invoice: PaymentInvoiceRecord
): AgreementPaymentTracking {
  const voided = voidOpenInvoicesForInstallment(tracking, invoice.installmentId);
  return {
    installments: tracking?.installments ?? [],
    partnerInstallments: tracking?.partnerInstallments,
    partnerReceivableInstallments: tracking?.partnerReceivableInstallments,
    paymentInvoices: [...voided, invoice],
  };
}
