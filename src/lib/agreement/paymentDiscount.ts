import { PaymentTerms } from "@/lib/types";
import { roundMoney } from "@/lib/agreement/defaults";

export function clampDiscountPercent(value: number | undefined): number {
  if (value == null || !Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

export function hasPaymentPromotion(terms: Pick<PaymentTerms, "discountPercent">): boolean {
  return clampDiscountPercent(terms.discountPercent) > 0;
}

export function applyDiscountAmount(amount: number, discountPercent?: number): number {
  const pct = clampDiscountPercent(discountPercent);
  if (pct <= 0) return roundMoney(amount);
  return roundMoney(amount * (1 - pct / 100));
}

/** List price → amount due after optional promotion discount. */
export function effectivePaymentTerms(terms: PaymentTerms): PaymentTerms {
  if (!hasPaymentPromotion(terms)) return terms;

  return {
    ...terms,
    totalFee: applyDiscountAmount(terms.totalFee, terms.discountPercent),
    depositAmount:
      terms.depositAmount != null
        ? applyDiscountAmount(terms.depositAmount, terms.discountPercent)
        : undefined,
    balanceAmount:
      terms.balanceAmount != null
        ? applyDiscountAmount(terms.balanceAmount, terms.discountPercent)
        : undefined,
  };
}

export function promotionSavings(terms: PaymentTerms): number {
  if (!hasPaymentPromotion(terms)) return 0;
  return roundMoney(terms.totalFee - effectivePaymentTerms(terms).totalFee);
}

export function formatPromotionLabel(terms: PaymentTerms): string | null {
  const pct = clampDiscountPercent(terms.discountPercent);
  if (pct <= 0) return null;
  const label = terms.discountLabel?.trim();
  return label ? `${label} (${pct}% off)` : `${pct}% promotion discount`;
}

export function formatMoney(amount: number): string {
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function formatPromotionSummary(terms: PaymentTerms): string | null {
  if (!hasPaymentPromotion(terms)) return null;
  const effective = effectivePaymentTerms(terms);
  const label = formatPromotionLabel(terms);
  return `${label}: ${formatMoney(terms.totalFee)} → ${formatMoney(effective.totalFee)} due`;
}

export function paymentTermsDocumentLines(
  terms: PaymentTerms,
  formatCurrency: (amount: number) => string
): string[] {
  const lines: string[] = [`Payment structure: ${terms.paymentStructure}`];

  if (hasPaymentPromotion(terms)) {
    const effective = effectivePaymentTerms(terms);
    const label = formatPromotionLabel(terms);
    lines.push(`List price: ${formatCurrency(terms.totalFee)}`);
    if (label) lines.push(label);
    lines.push(`Amount due: ${formatCurrency(effective.totalFee)}`);
    if (effective.depositAmount) {
      lines.push(`Deposit: ${formatCurrency(effective.depositAmount)}`);
    }
    if (effective.balanceAmount) {
      lines.push(`Balance: ${formatCurrency(effective.balanceAmount)}`);
    }
    return lines;
  }

  lines.push(`Total fee: ${formatCurrency(terms.totalFee)}`);
  if (terms.depositAmount) {
    lines.push(`Deposit: ${formatCurrency(terms.depositAmount)}`);
  }
  if (terms.balanceAmount) {
    lines.push(`Balance: ${formatCurrency(terms.balanceAmount)}`);
  }
  return lines;
}
