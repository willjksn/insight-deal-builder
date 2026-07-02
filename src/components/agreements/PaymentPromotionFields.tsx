"use client";

import { PaymentTerms } from "@/lib/types";
import { Input } from "@/components/ui/Input";
import { NumberInput } from "@/components/ui/NumberInput";
import {
  effectivePaymentTerms,
  formatMoney,
  formatPromotionSummary,
  hasPaymentPromotion,
} from "@/lib/agreement/paymentDiscount";

interface PaymentPromotionFieldsProps {
  paymentTerms: PaymentTerms;
  onChange: (next: PaymentTerms) => void;
}

export function PaymentPromotionFields({ paymentTerms, onChange }: PaymentPromotionFieldsProps) {
  const summary = formatPromotionSummary(paymentTerms);
  const effective = effectivePaymentTerms(paymentTerms);

  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-4 space-y-4">
      <div>
        <p className="text-sm font-semibold text-violet-900">Promotion discount</p>
        <p className="mt-1 text-xs text-violet-800/80">
          Optional percent off for a special. List price stays on the agreement; Stripe and payment
          tracking use the discounted amount.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <NumberInput
          label="Discount (%)"
          value={paymentTerms.discountPercent ?? undefined}
          onChange={(discountPercent) =>
            onChange({
              ...paymentTerms,
              discountPercent: discountPercent ?? 0,
            })
          }
          touch
        />
        <Input
          label="Promotion name (optional)"
          value={paymentTerms.discountLabel || ""}
          placeholder="Summer rental special"
          onChange={(e) =>
            onChange({
              ...paymentTerms,
              discountLabel: e.target.value,
            })
          }
          touch
        />
      </div>
      {hasPaymentPromotion(paymentTerms) ? (
        <div className="rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm text-violet-950">
          <p>{summary}</p>
          {(paymentTerms.depositAmount ?? 0) > 0 || (paymentTerms.balanceAmount ?? 0) > 0 ? (
            <p className="mt-1 text-xs text-violet-800">
              Deposit {formatMoney(effective.depositAmount ?? 0)} · Balance{" "}
              {formatMoney(effective.balanceAmount ?? 0)}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
