"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { NumberInput } from "@/components/ui/NumberInput";
import { Badge } from "@/components/ui/Badge";
import { Agreement } from "@/lib/types";
import { useMutations } from "@/hooks/useMutations";
import { useAuth } from "@/contexts/AuthContext";
import { canRecordPayments } from "@/lib/utils/permissions";
import {
  installmentOutstanding,
  InstallmentPaymentMode,
  isInstallmentFullyPaid,
} from "@/lib/analytics/paymentTracking";
import {
  clearPartnerReceivablePayment,
  partnerReceivableOutstanding,
  partnerReceivableTotalDue,
  partnerReceivableTotalPaid,
  recordPartnerReceivablePayment,
  resolvePartnerReceivableInstallments,
} from "@/lib/analytics/partnerReceivableTracking";
import { getPartnerReimbursementParty } from "@/lib/agreement/payeeParties";
import { agreementAcceptsStripePayments } from "@/lib/stripe/eligibility";
import { createAgreementCheckout, fetchStripeConfig } from "@/lib/stripe/apiClient";
import { formatDate } from "@/lib/utils/format";
import { ArrowDownLeft, Banknote, Check, CreditCard, Loader2, RotateCcw } from "lucide-react";

const TRACKABLE_STATUSES = new Set(["signed", "completed", "partially_signed"]);

interface PartnerReimbursementSectionProps {
  agreement: Agreement;
  agreementId: string;
  paymentSigningToken?: string | null;
  onUpdated?: () => void;
}

function formatMoney(amount: number): string {
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function PartnerReimbursementSection({
  agreement,
  agreementId,
  paymentSigningToken,
  onUpdated,
}: PartnerReimbursementSectionProps) {
  const { appUser, user } = useAuth();
  const { update, saving, error: saveError } = useMutations("agreements");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editorMode, setEditorMode] = useState<InstallmentPaymentMode>("add");
  const [amount, setAmount] = useState("");
  const [paidAt, setPaidAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [stripeEnabled, setStripeEnabled] = useState(false);
  const [checkoutBusyId, setCheckoutBusyId] = useState<string | null>(null);
  const [copiedPayLink, setCopiedPayLink] = useState(false);

  useEffect(() => {
    void fetchStripeConfig().then((cfg) => setStripeEnabled(cfg.enabled));
  }, []);

  const installments = useMemo(
    () => resolvePartnerReceivableInstallments(agreement),
    [agreement.payoutDetails, agreement.paymentTracking]
  );

  const reimburseParty = getPartnerReimbursementParty(agreement);
  const canRecord = canRecordPayments(appUser);
  const showSection =
    agreement.agreementType === "internal_collaboration" &&
    TRACKABLE_STATUSES.has(agreement.status) &&
    agreement.payoutDetails != null &&
    installments.length > 0;

  if (!showSection || !agreement.payoutDetails) return null;

  const totalDue = partnerReceivableTotalDue(agreement);
  const totalPaid = partnerReceivableTotalPaid(agreement);
  const outstanding = partnerReceivableOutstanding(agreement);
  const stripeEligible = stripeEnabled && agreementAcceptsStripePayments(agreement);
  const payUrl =
    paymentSigningToken && typeof window !== "undefined"
      ? `${window.location.origin}/pay/${paymentSigningToken}`
      : paymentSigningToken
        ? `/pay/${paymentSigningToken}`
        : null;

  const startStripeCheckout = async (installmentId: string) => {
    if (!user) return;
    setCheckoutBusyId(installmentId);
    setLocalError(null);
    try {
      const { url } = await createAgreementCheckout(() => user.getIdToken(), agreementId, installmentId);
      window.location.href = url;
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Could not start Stripe checkout");
      setCheckoutBusyId(null);
    }
  };

  const copyPayLink = async () => {
    if (!payUrl) return;
    const absolute = payUrl.startsWith("http") ? payUrl : `${window.location.origin}${payUrl}`;
    await navigator.clipboard.writeText(absolute);
    setCopiedPayLink(true);
    window.setTimeout(() => setCopiedPayLink(false), 2000);
  };

  const openEditor = (id: string, defaultAmount: number, mode: InstallmentPaymentMode) => {
    setEditingId(id);
    setEditorMode(mode);
    setAmount(String(defaultAmount));
    setPaidAt(new Date().toISOString().slice(0, 10));
    setNotes("");
    setLocalError(null);
  };

  const handleSave = async (installmentId: string) => {
    setLocalError(null);
    const parsed = Number(amount.replace(/,/g, ""));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setLocalError("Enter a remittance amount greater than zero.");
      return;
    }
    try {
      const next = recordPartnerReceivablePayment(
        agreement.paymentTracking,
        agreement.payoutDetails!,
        installmentId,
        parsed,
        paidAt,
        appUser?.email || appUser?.displayName || "staff",
        notes,
        editorMode
      );
      await update(agreementId, { paymentTracking: next });
      setEditingId(null);
      onUpdated?.();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Failed to save remittance");
    }
  };

  const handleClear = async (installmentId: string) => {
    if (!confirm("Clear recorded remittance for this line?")) return;
    const next = clearPartnerReceivablePayment(
      agreement.paymentTracking,
      agreement.payoutDetails!,
      installmentId
    );
    await update(agreementId, { paymentTracking: next });
    onUpdated?.();
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <ArrowDownLeft className="h-5 w-5 text-emerald-600" />
              <h2 className="text-lg font-semibold">Partner remittances</h2>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Track split reimbursements received from{" "}
              {reimburseParty?.signerName || reimburseParty?.name || "the collaborator"}.
              {stripeEligible ? " They can also pay by card via Stripe." : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <Badge variant="default">
              <Banknote className="mr-1 inline h-3 w-3" />
              Received {formatMoney(totalPaid)} / {formatMoney(totalDue)}
            </Badge>
            {outstanding > 0 ? (
              <Badge variant="warning">Outstanding {formatMoney(outstanding)}</Badge>
            ) : totalPaid > 0 ? (
              <Badge variant="success">Fully remitted</Badge>
            ) : null}
          </div>
        </div>
        {payUrl && stripeEligible ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => void copyPayLink()}>
              {copiedPayLink ? "Copied pay link" : "Copy partner pay link"}
            </Button>
          </div>
        ) : null}
      </CardHeader>
      <CardBody className="space-y-3">
        {(localError || saveError) && (
          <p className="text-sm text-red-600">{localError || saveError}</p>
        )}
        {installments.map((row) => {
          const outstandingRow = installmentOutstanding(row);
          const paid = isInstallmentFullyPaid(row);
          return (
            <div
              key={row.id}
              className="rounded-xl border border-slate-200 px-4 py-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">{row.label}</p>
                  <p className="text-sm text-slate-500">
                    Due {formatMoney(row.amountDue)}
                    {row.paidAmount ? ` · Received ${formatMoney(row.paidAmount)}` : ""}
                    {row.paidAt ? ` · ${formatDate(row.paidAt)}` : ""}
                  </p>
                  {row.notes ? <p className="mt-1 text-xs text-slate-400">{row.notes}</p> : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  {paid ? <Badge variant="success">Paid</Badge> : null}
                  {stripeEligible && outstandingRow > 0 ? (
                    <Button
                      type="button"
                      size="sm"
                      disabled={checkoutBusyId != null}
                      onClick={() => void startStripeCheckout(row.id)}
                    >
                      {checkoutBusyId === row.id ? (
                        <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                      ) : (
                        <CreditCard className="mr-1 h-4 w-4" />
                      )}
                      Card pay
                    </Button>
                  ) : null}
                  {canRecord && outstandingRow > 0 ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => openEditor(row.id, outstandingRow, "add")}
                    >
                      Record
                    </Button>
                  ) : null}
                  {canRecord && (row.paidAmount ?? 0) > 0 ? (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => openEditor(row.id, row.paidAmount ?? 0, "set")}
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => void handleClear(row.id)}
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>
              {editingId === row.id ? (
                <div className="mt-3 grid gap-3 border-t border-slate-100 pt-3 sm:grid-cols-2">
                  <NumberInput
                    label={editorMode === "add" ? "Amount received" : "Set received to"}
                    value={Number(amount) || undefined}
                    onChange={(v) => setAmount(v != null ? String(v) : "")}
                    touch
                  />
                  <Input
                    label="Date"
                    type="date"
                    value={paidAt}
                    onChange={(e) => setPaidAt(e.target.value)}
                    touch
                  />
                  <Input
                    label="Notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="sm:col-span-2"
                    touch
                  />
                  <div className="flex gap-2 sm:col-span-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={saving}
                      onClick={() => void handleSave(row.id)}
                    >
                      <Check className="mr-1 h-4 w-4" />
                      Save
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </CardBody>
    </Card>
  );
}
