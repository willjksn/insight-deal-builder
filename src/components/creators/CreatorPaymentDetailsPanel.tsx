"use client";

import { useEffect, useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  CreatorPaymentDetailsForm,
  formToPaymentDetails,
  paymentDetailsToForm,
  type PaymentDetailsFormValue,
} from "@/components/creators/CreatorPaymentDetailsForm";
import {
  CREATOR_PAYMENT_METHOD_LABELS,
  type CreatorPaymentDetails,
} from "@/lib/creators/types";
import { formatDateTime } from "@/lib/utils/format";

type Props = {
  paymentDetails?: CreatorPaymentDetails;
  canEdit: boolean;
  canViewSensitive: boolean;
  saving?: boolean;
  onSave: (details: CreatorPaymentDetails) => Promise<void>;
};

export function CreatorPaymentDetailsPanel({
  paymentDetails,
  canEdit,
  canViewSensitive,
  saving,
  onSave,
}: Props) {
  const [form, setForm] = useState<PaymentDetailsFormValue>(
    paymentDetailsToForm(paymentDetails)
  );
  const [editing, setEditing] = useState(!paymentDetails);

  useEffect(() => {
    setForm(paymentDetailsToForm(paymentDetails));
    setEditing(!paymentDetails);
  }, [paymentDetails]);

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Payment details</h2>
        {paymentDetails ? (
          <Badge variant="success">On file</Badge>
        ) : (
          <Badge variant="default">Missing</Badge>
        )}
      </CardHeader>
      <CardBody className="space-y-3 text-sm text-slate-600">
        <p>Contractor payout instructions (no W-9). Creators can also enter these in the portal.</p>

        {paymentDetails && !editing ? (
          <div className="space-y-1 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5">
            <p className="font-medium text-slate-900">
              {CREATOR_PAYMENT_METHOD_LABELS[paymentDetails.method]} · {paymentDetails.payeeName}
            </p>
            {paymentDetails.paypalEmail ? <p>PayPal: {paymentDetails.paypalEmail}</p> : null}
            {paymentDetails.venmoHandle ? <p>Venmo: @{paymentDetails.venmoHandle}</p> : null}
            {paymentDetails.bankName ? <p>Bank: {paymentDetails.bankName}</p> : null}
            {canViewSensitive && paymentDetails.routingNumber ? (
              <p>Routing: {paymentDetails.routingNumber}</p>
            ) : null}
            {canViewSensitive && paymentDetails.accountNumber ? (
              <p>Account: {paymentDetails.accountNumber}</p>
            ) : paymentDetails.accountNumber ? (
              <p>Account: {paymentDetails.accountNumber}</p>
            ) : null}
            {paymentDetails.notes ? <p>Notes: {paymentDetails.notes}</p> : null}
            {paymentDetails.updatedAt ? (
              <p className="text-xs text-slate-400">
                Updated {formatDateTime(paymentDetails.updatedAt)}
              </p>
            ) : null}
            {canEdit ? (
              <button
                type="button"
                className="pt-1 text-sm font-medium text-sky-700 hover:text-sky-900"
                onClick={() => setEditing(true)}
              >
                Edit
              </button>
            ) : null}
          </div>
        ) : null}

        {canEdit && editing ? (
          <CreatorPaymentDetailsForm
            value={form}
            onChange={setForm}
            saving={saving}
            onSubmit={async () => {
              await onSave(formToPaymentDetails(form));
              setEditing(false);
            }}
          />
        ) : null}
      </CardBody>
    </Card>
  );
}
