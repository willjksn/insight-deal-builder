"use client";

import { useMemo, useState } from "react";
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
  clearPartnerInstallmentPayment,
  partnerOutstanding,
  partnerTotalDue,
  partnerTotalPaid,
  recordPartnerInstallmentPayment,
  resolvePartnerInstallments,
} from "@/lib/analytics/partnerPayoutTracking";
import { formatDate } from "@/lib/utils/format";
import { Banknote, Check, RotateCcw, Users } from "lucide-react";

const TRACKABLE_STATUSES = new Set(["signed", "completed", "partially_signed"]);

interface PartnerPayoutTrackingSectionProps {
  agreement: Agreement;
  agreementId: string;
  onUpdated?: () => void;
}

function formatMoney(amount: number): string {
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function PartnerPayoutTrackingSection({
  agreement,
  agreementId,
  onUpdated,
}: PartnerPayoutTrackingSectionProps) {
  const { appUser } = useAuth();
  const { update, saving, error: saveError } = useMutations("agreements");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editorMode, setEditorMode] = useState<InstallmentPaymentMode>("add");
  const [amount, setAmount] = useState("");
  const [paidAt, setPaidAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const installments = useMemo(
    () => resolvePartnerInstallments(agreement),
    [agreement.payoutDetails, agreement.paymentTracking]
  );

  const canRecord = canRecordPayments(appUser);
  const showSection =
    agreement.agreementType === "internal_collaboration" &&
    TRACKABLE_STATUSES.has(agreement.status) &&
    agreement.payoutDetails != null;

  if (!showSection || !agreement.payoutDetails) return null;

  if (installments.length === 0) {
    return (
      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-violet-600" />
            <h2 className="text-lg font-semibold">Partner payouts</h2>
          </div>
        </CardHeader>
        <CardBody>
          <p className="text-sm text-slate-500">
            This deal has no collaborator payout amounts to track. Set partner, assistant, talent,
            or other splits on the payout step (duplicate the agreement to edit if already signed).
          </p>
        </CardBody>
      </Card>
    );
  }

  const totalDue = partnerTotalDue(agreement);
  const totalPaid = partnerTotalPaid(agreement);
  const outstanding = partnerOutstanding(agreement);

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
      setLocalError("Enter a payout amount greater than zero.");
      return;
    }
    try {
      const next = recordPartnerInstallmentPayment(
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
      setLocalError(err instanceof Error ? err.message : "Failed to save payout");
    }
  };

  const handleClear = async (installmentId: string) => {
    if (!confirm("Clear recorded payout for this line?")) return;
    const next = clearPartnerInstallmentPayment(
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
              <Users className="h-5 w-5 text-violet-600" />
              <h2 className="text-lg font-semibold">Partner payouts</h2>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Record cash paid to collaborators on this internal deal (excludes Insight&apos;s fee).
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <Badge variant="default">
              <Banknote className="mr-1 inline h-3 w-3" />
              Paid {formatMoney(totalPaid)} / {formatMoney(totalDue)}
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
            Payout recording is available to accounting staff and admins.
          </p>
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
                <th className="px-4 py-3">Recipient / line</th>
                <th className="px-4 py-3">Due</th>
                <th className="px-4 py-3">Paid</th>
                <th className="px-4 py-3">Outstanding</th>
                <th className="px-4 py-3">Status</th>
                {canRecord && <th className="px-4 py-3">Actions</th>}
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
                    </td>
                    {canRecord && (
                      <td className="px-4 py-3">
                        {!isEditing ? (
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={saving}
                              onClick={() => openEditor(row.id, remaining, "add")}
                            >
                              Record payout
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
                          </div>
                        ) : (
                          <div className="min-w-[220px] space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                            <NumberInput
                              label={editorMode === "add" ? "Payout amount" : "Total paid"}
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
      </CardBody>
    </Card>
  );
}
