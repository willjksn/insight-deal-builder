"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { AgreementSigningFlow } from "@/components/signatures/AgreementSigningFlow";
import { Agreement, AgreementParty } from "@/lib/types";
import { PRODUCER_LEGAL_NAME } from "@/lib/constants/legalTerms";
import { formatDate } from "@/lib/utils/format";

type Session = {
  agreement: Agreement;
  party: AgreementParty;
  partyId: string;
  expiresAt: string;
  isLocked: boolean;
};

export default function PublicSignPage() {
  const params = useParams();
  const token = params.token as string;
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadSession = useCallback(async () => {
    const res = await fetch(`/api/sign/${token}`);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Unable to load signing link");
    }
    return res.json() as Promise<Session>;
  }, [token]);

  useEffect(() => {
    loadSession()
      .then(setSession)
      .catch((err) => setError(err instanceof Error ? err.message : "Link unavailable"))
      .finally(() => setLoading(false));
  }, [loadSession]);

  const postAction = async (body: object): Promise<Agreement> => {
    setSaving(true);
    try {
      const res = await fetch(`/api/sign/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setSession((prev) =>
        prev
          ? {
              ...prev,
              agreement: data.agreement,
              isLocked:
                data.agreement.status === "signed" || data.agreement.status === "completed",
            }
          : prev
      );
      return data.agreement as Agreement;
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="text-xl font-semibold text-slate-900">Signing link unavailable</h1>
        <p className="mt-2 text-slate-500">{error || "This link may have expired."}</p>
        <p className="mt-4 text-sm text-slate-400">Contact {PRODUCER_LEGAL_NAME} for a new link.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-4 py-4 md:px-8">
        <p className="text-sm font-semibold text-slate-900">{PRODUCER_LEGAL_NAME}</p>
        <p className="mt-1 text-xs text-slate-400">
          Secure agreement signing · Link expires {formatDate(session.expiresAt)}
        </p>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 md:px-8">
        <PageHeader title="Sign Your Agreement" subtitle={session.agreement.title} />

        <AgreementSigningFlow
          agreement={session.agreement}
          party={session.party}
          isLocked={session.isLocked}
          saving={saving}
          onPersistInitial={async (clauseId, initialsDataUrl) => {
            const updated = await postAction({ action: "initial", clauseId, initialsDataUrl });
            return { initials: updated.initials };
          }}
          onPersistSignature={async (signatureDataUrl) => {
            const updated = await postAction({ action: "signature", signatureDataUrl });
            return { signatures: updated.signatures };
          }}
          onPersistIdentity={async (idFrontDataUrl, idBackDataUrl, consentGiven) => {
            const updated = await postAction({
              action: "identity",
              idFrontDataUrl,
              idBackDataUrl,
              consentGiven,
            });
            return { identityVerifications: updated.identityVerifications };
          }}
          signingToken={token}
        />
      </main>
    </div>
  );
}
