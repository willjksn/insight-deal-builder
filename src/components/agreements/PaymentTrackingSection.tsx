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
import { canRecordPayments, canEmailQuotes } from "@/lib/utils/permissions";
import {
  agreementOutstanding,
  agreementTotalPaid,
  clearInstallmentPayment,
  installmentOutstanding,
  InstallmentPaymentMode,
  isInstallmentFullyPaid,
  recordInstallmentPayment,
  resolvePaymentInstallments,
} from "@/lib/analytics/paymentTracking";
import { formatDate } from "@/lib/utils/format";
import { ArrowDownLeft, ArrowUpRight, Banknote, Check, CreditCard, Download, FileText, Loader2, Mail, RotateCcw } from "lucide-react";
import { agreementAcceptsStripePayments } from "@/lib/stripe/eligibility";
import { formatPromotionSummary, hasPaymentPromotion } from "@/lib/agreement/paymentDiscount";
import { agreementTotalDue } from "@/lib/analytics/paymentTracking";
import { createAgreementCheckout, fetchStripeConfig } from "@/lib/stripe/apiClient";
import { createPaymentInvoice, getPaymentInvoiceDownloadUrl } from "@/lib/invoices/apiClient";
import { markPaymentInvoicesPaid } from "@/lib/invoices/paymentInvoice";
import { PaymentInvoiceRecord } from "@/lib/types";

const TRACKABLE_STATUSES = new Set(["signed", "completed", "partially_signed"]);

const TRACKABLE_TYPES = new Set([
  "client_project",
  "talent_agreement",
  "contractor_agreement",
  "location_agreement",
  "equipment_rental",
]);

interface PaymentTrackingSectionProps {
  agreement: Agreement;
  agreementId: string;
  onUpdated?: () => void;
  /** Client signing token — enables copyable /pay/{token} link for card payments */
  clientSigningToken?: string | null;
}

function isReceivable(agreement: Agreement): boolean {
  return (
    agreement.agreementType === "client_project" ||
    agreement.agreementType === "equipment_rental"
  );
}

function formatMoney(amount: number): string {
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function PaymentTrackingSection({
  agreement,
  agreementId,
  onUpdated,
  clientSigningToken,
}: PaymentTrackingSectionProps) {
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
  const [invoiceBusyId, setInvoiceBusyId] = useState<string | null>(null);
  const [copiedPayLink, setCopiedPayLink] = useState(false);

  useEffect(() => {
    void fetchStripeConfig().then((cfg) => setStripeEnabled(cfg.enabled));
  }, []);

  const canRecord = canRecordPayments(appUser);
  const showSection =
    TRACKABLE_TYPES.has(agreement.agreementType) &&
    TRACKABLE_STATUSES.has(agreement.status) &&
    agreement.paymentTerms.totalFee > 0;

  const installments = useMemo(
    () => resolvePaymentInstallments(agreement),
    [agreement.paymentTerms, agreement.paymentTracking]
  );

  const paymentInvoices = agreement.paymentTracking?.paymentInvoices ?? [];
  const canEmail = canEmailQuotes(appUser);

  if (!showSection) return null;

  const receivable = isReceivable(agreement);
  const totalDue = agreementTotalDue(agreement);
  const listTotal = agreement.paymentTerms.totalFee;
  const promotionSummary = formatPromotionSummary(agreement.paymentTerms);
  const totalPaid = agreementTotalPaid(agreement);
  const outstanding = agreementOutstanding(agreement);
  const stripeEligible = stripeEnabled && receivable && agreementAcceptsStripePayments(agreement);
  const clientPayUrl =
    clientSigningToken && typeof window !== "undefined"
      ? `${window.location.origin}/pay/${clientSigningToken}`
      : clientSigningToken
        ? `/pay/${clientSigningToken}`
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

  const copyClientPayLink = async () => {
    if (!clientPayUrl) return;
    const absolute =
      clientPayUrl.startsWith("http") ? clientPayUrl : `${window.location.origin}${clientPayUrl}`;
    await navigator.clipboard.writeText(absolute);
    setCopiedPayLink(true);
    window.setTimeout(() => setCopiedPayLink(false), 2000);
  };

  const issueInvoice = async (installmentId: string) => {
    if (!user) return;
    setInvoiceBusyId(installmentId);
    setLocalError(null);
    try {
      await createPaymentInvoice(() => user.getIdToken(), agreementId, {
        installmentId,
        sendEmail: canEmail,
      });
      onUpdated?.();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Failed to issue invoice");
    } finally {
      setInvoiceBusyId(null);
    }
  };

  const downloadInvoice = async (invoice: PaymentInvoiceRecord) => {
    if (!user) return;
    setInvoiceBusyId(invoice.id);
    setLocalError(null);
    try {
      const { downloadUrl } = await getPaymentInvoiceDownloadUrl(
        () => user.getIdToken(),
        agreementId,
        invoice.id
      );
      window.open(downloadUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Failed to download invoice");
    } finally {
      setInvoiceBusyId(null);
    }
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
      setLocalError("Enter a payment amount greater than zero.");
      return;
    }
    try {
      const next = recordInstallmentPayment(
        agreement.paymentTracking,
        agreement.paymentTerms,
        installmentId,
        parsed,
        paidAt,
        appUser?.email || appUser?.displayName || "staff",
        notes,
        editorMode
      );
      const withInvoices =
        markPaymentInvoicesPaid(next, installmentId, new Date(paidAt).toISOString()) ?? next;
      await update(agreementId, { paymentTracking: withInvoices });
      setEditingId(null);
      onUpdated?.();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Failed to save payment");
    }
  };

  const handleClear = async (installmentId: string) => {
    if (!confirm("Clear recorded payment for this installment?")) return;
    const next = clearInstallmentPayment(
      agreement.paymentTracking,
      agreement.paymentTerms,
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
              {receivable ? (
                <ArrowDownLeft className="h-5 w-5 text-emerald-600" />
              ) : (
                <ArrowUpRight className="h-5 w-5 text-rose-600" />
              )}
              <h2 className="text-lg font-semibold">
                {receivable ? "Client payments" : "Payee payments"}
              </h2>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Record cash {receivable ? "received" : "paid"}{" "}
              {agreement.agreementType === "equipment_rental"
                ? "from the renter"
                : receivable
                  ? "from the client"
                  : "to the payee"}{" "}
              against this agreement&apos;s payment schedule.
              {stripeEligible ? " Card payments are also available via Stripe." : ""}
              {receivable && canRecord
                ? " Issue a payment invoice when you are ready to collect — a PDF copy stays on this agreement."
                : ""}
            </p>
            {hasPaymentPromotion(agreement.paymentTerms) && promotionSummary ? (
              <p className="mt-2 text-xs font-medium text-violet-700">{promotionSummary}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <Badge variant="default">
              <Banknote className="mr-1 inline h-3 w-3" />
              Paid {formatMoney(totalPaid)} / {formatMoney(totalDue)}
              {hasPaymentPromotion(agreement.paymentTerms) ? (
                <span className="ml-1 font-normal text-slate-500">
                  (list {formatMoney(listTotal)})
                </span>
              ) : null}
            </Badge>
            {outstanding > 0 ? (
              <Badge variant="warning">Outstanding {formatMoney(outstanding)}</Badge>
            ) : totalPaid > 0 ? (
              <Badge variant="success">Fully paid</Badge>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardBody className="space-y-4">
        {!canRecord && (
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
            Payment recording is available to accounting staff and admins.
          </p>
        )}
        {stripeEligible && clientPayUrl && canRecord && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-sky-100 bg-sky-50 px-3 py-2 text-sm text-sky-900">
            <span>Client card payment page:</span>
            <code className="rounded bg-white px-2 py-0.5 text-xs">{clientPayUrl}</code>
            <Button type="button" size="sm" variant="outline" onClick={() => void copyClientPayLink()}>
              {copiedPayLink ? "Copied" : "Copy link"}
            </Button>
          </div>
        )}
        {(localError || saveError) && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {localError || saveError}
          </p>
        )}

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Installment</th>
                <th className="px-4 py-3">Due</th>
                <th className="px-4 py-3">Paid</th>
                <th className="px-4 py-3">Outstanding</th>
                <th className="px-4 py-3">Status</th>
                {canRecord || stripeEligible ? <th className="px-4 py-3">Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {installments.map((row) => {
                const remaining = installmentOutstanding(row);
                const fullyPaid = isInstallmentFullyPaid(row);
                const isEditing = editingId === row.id;

                return (
                  <tr key={row.id} className="border-t border-slate-100 align-top">
                    <td className="px-4 py-3 font-medium text-slate-900">{row.label}</td>
                    <td className="px-4 py-3 tabular-nums">{formatMoney(row.amountDue)}</td>
                    <td className="px-4 py-3 tabular-nums">{formatMoney(row.paidAmount ?? 0)}</td>
                    <td className="px-4 py-3 tabular-nums">{formatMoney(remaining)}</td>
                    <td className="px-4 py-3">
                      {fullyPaid ? (
                        <span className="inline-flex items-center text-emerald-700">
                          <Check className="mr-1 h-4 w-4" />
                          Paid {row.paidAt ? formatDate(row.paidAt) : ""}
                        </span>
                      ) : (row.paidAmount ?? 0) > 0 ? (
                        <span className="text-amber-700">Partial</span>
                      ) : (
                        <span className="text-slate-500">Unpaid</span>
                      )}
                      {row.notes && (
                        <p className="mt-1 text-xs text-slate-500">{row.notes}</p>
                      )}
                      {row.paymentSource === "stripe" && (
                        <Badge variant="default" className="mt-1">
                          Paid via Stripe
                        </Badge>
                      )}
                    </td>
                    {(canRecord || stripeEligible) && (
                      <td className="px-4 py-3">
                        {!isEditing ? (
                          <div className="flex flex-wrap gap-2">
                            {stripeEligible && remaining > 0 && (
                              <Button
                                size="sm"
                                disabled={saving || checkoutBusyId != null}
                                onClick={() => void startStripeCheckout(row.id)}
                              >
                                {checkoutBusyId === row.id ? (
                                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                                ) : (
                                  <CreditCard className="mr-1 h-4 w-4" />
                                )}
                                Pay with card
                              </Button>
                            )}
                            {canRecord && (
                              <>
                            {receivable && remaining > 0 && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={saving || invoiceBusyId != null}
                                onClick={() => void issueInvoice(row.id)}
                              >
                                {invoiceBusyId === row.id ? (
                                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                                ) : canEmail ? (
                                  <Mail className="mr-1 h-4 w-4" />
                                ) : (
                                  <FileText className="mr-1 h-4 w-4" />
                                )}
                                {canEmail ? "Issue & email invoice" : "Create invoice"}
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={saving}
                              onClick={() => openEditor(row.id, remaining, "add")}
                            >
                              Record payment
                            </Button>
                            {(row.paidAmount ?? 0) > 0 && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={saving}
                                onClick={() => openEditor(row.id, row.paidAmount ?? 0, "set")}
                              >
                                Adjust total
                              </Button>
                            )}
                            {(row.paidAmount ?? 0) > 0 && (
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={saving}
                                onClick={() => void handleClear(row.id)}
                              >
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                            )}
                              </>
                            )}
                          </div>
                        ) : (
                          <div className="min-w-[220px] space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                            <NumberInput
                              label={editorMode === "add" ? "Payment amount" : "Total paid"}
                              value={amount === "" ? undefined : Number(amount)}
                              onChange={(v) => setAmount(v == null ? "" : String(v))}
                            />
                            {editorMode === "add" && (row.paidAmount ?? 0) > 0 && (
                              <p className="text-xs text-slate-500">
                                Adds to {formatMoney(row.paidAmount ?? 0)} already recorded.
                              </p>
                            )}
                            <Input
                              label="Payment date"
                              type="date"
                              value={paidAt}
                              onChange={(e) => setPaidAt(e.target.value)}
                            />
                            <Input
                              label="Notes (optional)"
                              value={notes}
                              onChange={(e) => setNotes(e.target.value)}
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                disabled={saving}
                                onClick={() => void handleSave(row.id)}
                              >
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={saving}
                                onClick={() => setEditingId(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {receivable && paymentInvoices.length > 0 ? (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-900">Payment invoices</h3>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Invoice</th>
                    <th className="px-4 py-3">Installment</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Issued</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {[...paymentInvoices]
                    .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt))
                    .map((inv) => {
                      const installmentLabel =
                        installments.find((r) => r.id === inv.installmentId)?.label ?? inv.installmentId;
                      return (
                        <tr key={inv.id} className="border-t border-slate-100">
                          <td className="px-4 py-3 font-medium text-slate-900">{inv.invoiceNumber}</td>
                          <td className="px-4 py-3">{installmentLabel}</td>
                          <td className="px-4 py-3 tabular-nums">{formatMoney(inv.amountDue)}</td>
                          <td className="px-4 py-3 capitalize">
                            {inv.status === "paid" ? (
                              <span className="text-emerald-700">
                                Paid {inv.paidAt ? formatDate(inv.paidAt) : ""}
                              </span>
                            ) : inv.status === "void" ? (
                              <span className="text-slate-400">Void</span>
                            ) : (
                              <span className="text-amber-700">Sent</span>
                            )}
                            {inv.sentTo ? (
                              <p className="mt-1 text-xs text-slate-500">Emailed to {inv.sentTo}</p>
                            ) : null}
                          </td>
                          <td className="px-4 py-3">{formatDate(inv.issuedAt)}</td>
                          <td className="px-4 py-3">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={invoiceBusyId === inv.id}
                              onClick={() => void downloadInvoice(inv)}
                            >
                              {invoiceBusyId === inv.id ? (
                                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                              ) : (
                                <Download className="mr-1 h-4 w-4" />
                              )}
                              Download
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}
