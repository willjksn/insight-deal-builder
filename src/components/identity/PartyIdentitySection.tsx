"use client";

import { useEffect, useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { IdPhotoCapture, useIdPhotoCaptureState } from "@/components/identity/IdPhotoCapture";
import { fetchPartyIdentityImages, uploadStaffIdentityCapture } from "@/lib/identity/client";
import {
  ID_VERIFICATION_CONSENT,
  isPartyIdentityComplete,
  partyRequiresIdVerification,
} from "@/lib/identity/verification";
import { Agreement, AgreementParty } from "@/lib/types";
import { formatDate } from "@/lib/utils/format";
import { canCaptureIdentityDocs, canViewIdentityDocs } from "@/lib/utils/permissions";
import { useAuth } from "@/contexts/AuthContext";
import { ShieldCheck, ChevronRight } from "lucide-react";

interface PartyIdentitySectionProps {
  agreement: Agreement;
  agreementId: string;
  onUpdated?: () => void;
}

function PartyIdentityRow({
  agreement,
  agreementId,
  party,
  onUpdated,
}: {
  agreement: Agreement;
  agreementId: string;
  party: AgreementParty;
  onUpdated?: () => void;
}) {
  const { appUser } = useAuth();
  const canCapture = canCaptureIdentityDocs(appUser);
  const canView = canViewIdentityDocs(appUser);
  const complete = isPartyIdentityComplete(agreement, party.id);
  const { frontImage, backImage, setFrontImage, setBackImage, ready, reset } = useIdPhotoCaptureState();
  const [idConsent, setIdConsent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingImages, setLoadingImages] = useState(false);
  const [viewUrls, setViewUrls] = useState<{ frontUrl: string; backUrl: string; capturedAt: string; capturedBy: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const record = agreement.identityVerifications?.find((v) => v.partyId === party.id);

  const loadImages = async () => {
    if (!canView) return;
    setLoadingImages(true);
    setError(null);
    try {
      const data = await fetchPartyIdentityImages(agreementId, party.id);
      setViewUrls(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load ID images");
    } finally {
      setLoadingImages(false);
    }
  };

  useEffect(() => {
    if (complete && canView && !viewUrls) {
      void loadImages();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [complete, canView, party.id]);

  const handleSave = async () => {
    if (!ready || !idConsent) return;
    setSaving(true);
    setError(null);
    try {
      await uploadStaffIdentityCapture(agreementId, party.id, frontImage!, backImage!, true);
      reset();
      setIdConsent(false);
      onUpdated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save ID");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium">{party.signerName || party.name}</p>
          <p className="text-xs text-slate-500">{party.roleInAgreement}</p>
        </div>
        <Badge variant={complete ? "success" : "warning"}>
          {complete ? "ID on file" : "ID required"}
        </Badge>
      </div>

      {complete && record && (
        <p className="mb-3 text-xs text-slate-500">
          Captured {formatDate(record.capturedAt)} · {record.capturedBy === "staff" ? "In person (staff)" : "Via signing link"}
        </p>
      )}

      {error && (
        <p className="mb-3 text-sm text-red-600">{error}</p>
      )}

      {complete && canView && (
        <div className="mb-4">
          {loadingImages ? (
            <LoadingSpinner className="py-4" />
          ) : viewUrls ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={viewUrls.frontUrl} alt="ID front" className="max-h-40 rounded-lg border object-contain bg-slate-50" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={viewUrls.backUrl} alt="ID back" className="max-h-40 rounded-lg border object-contain bg-slate-50" />
            </div>
          ) : (
            <Button size="sm" variant="outline" onClick={loadImages}>Load ID images</Button>
          )}
        </div>
      )}

      {canCapture && !complete && (
        <div className="space-y-4 border-t border-slate-100 pt-4 dark:border-slate-700">
          <p className="text-sm text-slate-600">Capture in person at pickup or check-in.</p>
          <IdPhotoCapture
            frontImage={frontImage}
            backImage={backImage}
            onFrontChange={setFrontImage}
            onBackChange={setBackImage}
            disabled={saving}
          />
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={idConsent}
              onChange={(e) => setIdConsent(e.target.checked)}
              className="mt-1 h-5 w-5 rounded"
            />
            <span className="text-slate-600">{ID_VERIFICATION_CONSENT}</span>
          </label>
          <Button size="sm" disabled={!ready || !idConsent || saving} onClick={handleSave}>
            {saving ? "Saving…" : "Save ID photos"}
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}

      {canCapture && complete && (
        <p className="text-xs text-slate-500">To replace ID photos, contact an admin.</p>
      )}
    </div>
  );
}

export function PartyIdentitySection({ agreement, agreementId, onUpdated }: PartyIdentitySectionProps) {
  const parties = agreement.parties.filter((p) => partyRequiresIdVerification(agreement, p));
  if (parties.length === 0) return null;

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-sky-600" />
          <h2 className="text-lg font-semibold">ID Verification</h2>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Government ID (front and back) required for equipment rentals and talent. Stored securely — not included in the PDF.
        </p>
      </CardHeader>
      <CardBody className="space-y-4">
        {parties.map((party) => (
          <PartyIdentityRow
            key={party.id}
            agreement={agreement}
            agreementId={agreementId}
            party={party}
            onUpdated={onUpdated}
          />
        ))}
      </CardBody>
    </Card>
  );
}
