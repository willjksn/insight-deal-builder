"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import {
  CREATOR_PAYMENT_METHOD_LABELS,
  type CreatorPaymentDetails,
  type CreatorPaymentMethod,
} from "@/lib/creators/types";

const METHOD_OPTIONS = (Object.keys(CREATOR_PAYMENT_METHOD_LABELS) as CreatorPaymentMethod[]).map(
  (value) => ({ value, label: CREATOR_PAYMENT_METHOD_LABELS[value] })
);

export type PaymentDetailsFormValue = {
  method: CreatorPaymentMethod;
  payeeName: string;
  paypalEmail: string;
  venmoHandle: string;
  bankName: string;
  routingNumber: string;
  accountNumber: string;
  notes: string;
};

export function paymentDetailsToForm(
  details?: CreatorPaymentDetails | null
): PaymentDetailsFormValue {
  return {
    method: details?.method ?? "ach",
    payeeName: details?.payeeName ?? "",
    paypalEmail: details?.paypalEmail ?? "",
    venmoHandle: details?.venmoHandle ?? "",
    bankName: details?.bankName ?? "",
    routingNumber: details?.routingNumber?.startsWith("••••")
      ? ""
      : (details?.routingNumber ?? ""),
    accountNumber: details?.accountNumber?.startsWith("••••")
      ? ""
      : (details?.accountNumber ?? ""),
    notes: details?.notes ?? "",
  };
}

export function formToPaymentDetails(
  form: PaymentDetailsFormValue
): CreatorPaymentDetails {
  return {
    method: form.method,
    payeeName: form.payeeName.trim(),
    paypalEmail: form.paypalEmail.trim() || undefined,
    venmoHandle: form.venmoHandle.trim() || undefined,
    bankName: form.bankName.trim() || undefined,
    routingNumber: form.routingNumber.trim() || undefined,
    accountNumber: form.accountNumber.trim() || undefined,
    notes: form.notes.trim() || undefined,
  };
}

type Props = {
  value: PaymentDetailsFormValue;
  onChange: (next: PaymentDetailsFormValue) => void;
  onSubmit: () => void;
  saving?: boolean;
  submitLabel?: string;
};

export function CreatorPaymentDetailsForm({
  value,
  onChange,
  onSubmit,
  saving,
  submitLabel = "Save payment details",
}: Props) {
  const set = <K extends keyof PaymentDetailsFormValue>(
    key: K,
    v: PaymentDetailsFormValue[K]
  ) => onChange({ ...value, [key]: v });

  return (
    <div className="space-y-3">
      <Select
        label="Payment method"
        value={value.method}
        options={METHOD_OPTIONS}
        onChange={(e) => set("method", e.target.value as CreatorPaymentMethod)}
        touch
      />
      <Input
        label="Payee name"
        value={value.payeeName}
        onChange={(e) => set("payeeName", e.target.value)}
        placeholder="Legal name or business name for payment"
        touch
      />
      {value.method === "paypal" ? (
        <Input
          label="PayPal email"
          type="email"
          value={value.paypalEmail}
          onChange={(e) => set("paypalEmail", e.target.value)}
          touch
        />
      ) : null}
      {value.method === "venmo" ? (
        <Input
          label="Venmo handle"
          value={value.venmoHandle}
          onChange={(e) => set("venmoHandle", e.target.value)}
          placeholder="username (without @)"
          touch
        />
      ) : null}
      {value.method === "ach" || value.method === "wire" ? (
        <>
          <Input
            label="Bank name"
            value={value.bankName}
            onChange={(e) => set("bankName", e.target.value)}
            touch
          />
          <Input
            label="Routing number"
            value={value.routingNumber}
            onChange={(e) => set("routingNumber", e.target.value)}
            inputMode="numeric"
            autoComplete="off"
            touch
          />
          <Input
            label="Account number"
            value={value.accountNumber}
            onChange={(e) => set("accountNumber", e.target.value)}
            inputMode="numeric"
            autoComplete="off"
            touch
          />
        </>
      ) : null}
      <Textarea
        label="Notes (optional)"
        value={value.notes}
        onChange={(e) => set("notes", e.target.value)}
        rows={2}
      />
      <Button type="button" size="touch" disabled={saving} onClick={onSubmit}>
        {saving ? "Saving…" : submitLabel}
      </Button>
    </div>
  );
}
