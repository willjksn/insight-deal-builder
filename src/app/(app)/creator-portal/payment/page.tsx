"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import {
  CreatorPaymentDetailsForm,
  formToPaymentDetails,
  paymentDetailsToForm,
  type PaymentDetailsFormValue,
} from "@/components/creators/CreatorPaymentDetailsForm";
import {
  getCreatorPortalPayment,
  saveCreatorPortalPayment,
} from "@/lib/creators/apiClient";

export default function CreatorPortalPaymentPage() {
  const { user } = useAuth();
  const [form, setForm] = useState<PaymentDetailsFormValue>(paymentDetailsToForm(null));
  const [complete, setComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getToken = useCallback(async () => {
    if (!user) return null;
    return user.getIdToken();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await getCreatorPortalPayment(getToken);
        if (cancelled) return;
        setForm(paymentDetailsToForm(data.paymentDetails));
        setComplete(data.complete);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load payment details");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, getToken]);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const data = await saveCreatorPortalPayment(getToken, formToPaymentDetails(form));
      setForm(paymentDetailsToForm(data.paymentDetails));
      setComplete(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save payment details");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/creator-portal"
          className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-sky-700 hover:text-sky-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to portal
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Payment details</h1>
        <p className="mt-1 text-sm text-slate-600">
          Tell IMG how to pay you as an independent contractor. This is not a W-9 — only payee
          instructions.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {complete ? (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <p>Payment details on file. Update anytime below.</p>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Payee information</h2>
        </CardHeader>
        <CardBody>
          <CreatorPaymentDetailsForm
            value={form}
            onChange={setForm}
            onSubmit={() => void save()}
            saving={saving}
          />
        </CardBody>
      </Card>
    </div>
  );
}
