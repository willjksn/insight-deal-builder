import { Agreement, AgreementParty } from "@/lib/types";
import {
  installmentOutstanding,
  resolvePaymentInstallments,
} from "@/lib/analytics/paymentTracking";
import {
  partnerReceivableOutstanding,
  resolvePartnerReceivableInstallments,
} from "@/lib/analytics/partnerReceivableTracking";
import { getExternalSigningParty, getPartnerReimbursementParty } from "@/lib/agreement/payeeParties";
import { effectivePaymentTerms } from "@/lib/agreement/paymentDiscount";

const PAYABLE_STATUSES = new Set(["signed", "completed", "partially_signed"]);

export type StripePaymentKind = "client_payment" | "partner_reimburse";

export function getStripePaymentKind(agreement: Agreement): StripePaymentKind | null {
  const dueTotal = effectivePaymentTerms(agreement.paymentTerms).totalFee;

  if (
    (agreement.agreementType === "client_project" ||
      agreement.agreementType === "equipment_rental") &&
    PAYABLE_STATUSES.has(agreement.status) &&
    dueTotal > 0
  ) {
    return "client_payment";
  }

  if (
    agreement.agreementType === "internal_collaboration" &&
    PAYABLE_STATUSES.has(agreement.status) &&
    agreement.payoutDetails &&
    partnerReceivableOutstanding(agreement) > 0
  ) {
    return "partner_reimburse";
  }

  return null;
}

export function agreementAcceptsStripePayments(agreement: Agreement): boolean {
  return getStripePaymentKind(agreement) != null;
}

export function partyCanPayViaStripe(agreement: Agreement, party: AgreementParty): boolean {
  if (agreement.agreementType === "client_project") {
    return party.type === "client";
  }
  if (agreement.agreementType === "equipment_rental") {
    return party.roleInAgreement === "Renter";
  }
  if (agreement.agreementType === "internal_collaboration") {
    const reimburseParty = getPartnerReimbursementParty(agreement);
    return reimburseParty?.id === party.id;
  }
  return false;
}

export function partyCanUsePaymentLink(agreement: Agreement, party: AgreementParty): boolean {
  if (partyCanPayViaStripe(agreement, party)) return true;
  const external = getExternalSigningParty(agreement);
  return external?.id === party.id && getStripePaymentKind(agreement) === "client_payment";
}

export function isPartnerReimburseInstallment(installmentId: string): boolean {
  return installmentId.startsWith("reimburse:");
}

export function installmentPayableAmount(
  agreement: Agreement,
  installmentId: string
): number | null {
  if (!agreementAcceptsStripePayments(agreement)) return null;

  if (isPartnerReimburseInstallment(installmentId)) {
    if (getStripePaymentKind(agreement) !== "partner_reimburse" || !agreement.payoutDetails) {
      return null;
    }
    const row = resolvePartnerReceivableInstallments(agreement).find((r) => r.id === installmentId);
    if (!row) return null;
    const outstanding = installmentOutstanding(row);
    return outstanding > 0 ? outstanding : null;
  }

  if (getStripePaymentKind(agreement) !== "client_payment") return null;

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
