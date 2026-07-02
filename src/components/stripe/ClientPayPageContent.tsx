"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { CreditCard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { createClientCheckout } from "@/lib/stripe/apiClient";
import { PRODUCER_LEGAL_NAME } from "@/lib/constants/legalTerms";

type PayInstallment = {
  id: string;
  label: string;
  amountDue: number;
  paidAmount: number;
  outstanding: number;
  payable: number | null;
};

type PaySession = {
  stripeEnabled: boolean;
  agreementTitle: string;
  projectName?: string;
  partyName?: string;
  eligible: boolean;
  installments: PayInstallment[];
};

function formatMoney(amount: number): string {
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function ClientPayPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const token = params.token as string;
  const cancelled = searchParams.get("payment") === "cancelled";

  const [session, setSession] = useState<PaySession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/pay/${token}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Unable to load payment page");
    return data as PaySession;
  }, [token]);

  useEffect(() => {
    load()
      .then(setSession)
      .catch((err) => setError(err instanceof Error ? err.message : "Link unavailable"))
      .finally(() => setLoading(false));
  }, [load]);

  const pay = async (installmentId: string) => {
    setBusyId(installmentId);
    setError(null);
    try {
      const { url } = await createClientCheckout(token, installmentId);
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start checkout");
      setBusyId(null);
    }
  };

  if (loading) return <LoadingSpinner className="min-h-[50vh]" />;

  if (error && !session) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  if (!session) return null;

  const payableRows = session.installments.filter((row) => row.payable != null && row.payable > 0);

  return (
    <div className="mx-auto min-h-screen max-w-lg bg-slate-50 px-4 py-10">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
          {PRODUCER_LEGAL_NAME}
        </p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Pay agreement</h1>
        <p className="mt-1 text-sm text-slate-600">
          {session.projectName || session.agreementTitle}
          {session.partyName ? ` · ${session.partyName}` : ""}
        </p>

        {cancelled && (
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Payment was cancelled. You can try again below.
          </p>
        )}

        {error && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        {!session.stripeEnabled && (
          <p className="mt-6 text-sm text-slate-600">
            Online card payment is not available yet. Contact {PRODUCER_LEGAL_NAME} for payment
            instructions.
          </p>
        )}

        {session.stripeEnabled && !session.eligible && (
          <p className="mt-6 text-sm text-slate-600">
            This agreement is not ready for card payment yet. Sign the agreement first or contact
            your producer.
          </p>
        )}

        {session.stripeEnabled && session.eligible && payableRows.length === 0 && (
          <p className="mt-6 text-sm text-emerald-700">All installments are paid. Thank you.</p>
        )}

        {session.stripeEnabled && session.eligible && payableRows.length > 0 && (
          <ul className="mt-6 space-y-3">
            {payableRows.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3"
              >
                <div>
                  <p className="font-medium text-slate-900">{row.label}</p>
                  <p className="text-sm text-slate-500">
                    Due {formatMoney(row.amountDue)}
                    {row.paidAmount > 0 ? ` · Paid ${formatMoney(row.paidAmount)}` : ""}
                  </p>
                </div>
                <Button type="button" disabled={busyId != null} onClick={() => void pay(row.id)}>
                  {busyId === row.id ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CreditCard className="mr-2 h-4 w-4" />
                  )}
                  Pay {formatMoney(row.payable ?? row.outstanding)}
                </Button>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-8 text-center text-xs text-slate-400">
          Payments are processed securely by Stripe.
        </p>
      </div>
    </div>
  );
}
