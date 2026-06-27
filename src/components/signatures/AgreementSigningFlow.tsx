"use client";

import { useCallback, useEffect, useMemo, useRef, useState, ReactNode } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SignaturePad } from "@/components/signatures/SignaturePad";
import { SavedMarkPreview } from "@/components/signatures/SavedMarkPreview";
import { AgreementSigningDocument } from "@/components/signatures/AgreementSigningDocument";
import {
  buildSigningFieldsForParty,
  getFirstIncompleteFieldIndex,
  getPartyInitialsImage,
  getPartySignature,
  isSigningFieldComplete,
  SigningField,
} from "@/lib/agreement/signing";
import { Agreement, AgreementParty } from "@/lib/types";
import {
  ID_VERIFICATION_CONSENT,
  isPartyIdentityComplete,
  partyRequiresIdVerification,
} from "@/lib/identity/verification";
import { IdPhotoCapture, useIdPhotoCaptureState } from "@/components/identity/IdPhotoCapture";
import { ChevronRight, CheckCircle } from "lucide-react";

type SignPhase = "identity" | "setup" | "document";

export type SigningPersistResult = {
  initials?: Agreement["initials"];
  signatures?: Agreement["signatures"];
  identityVerifications?: Agreement["identityVerifications"];
};

export interface AgreementSigningFlowProps {
  agreement: Agreement;
  party: AgreementParty;
  isLocked?: boolean;
  saving?: boolean;
  onPersistInitial: (clauseId: string, initialsDataUrl: string) => Promise<SigningPersistResult | void>;
  onPersistSignature: (signatureDataUrl: string) => Promise<SigningPersistResult | void>;
  onPersistIdentity?: (
    idFrontDataUrl: string,
    idBackDataUrl: string,
    consentGiven: boolean
  ) => Promise<SigningPersistResult | void>;
  signingToken?: string;
  subtitle?: string;
  footer?: ReactNode;
}

export function AgreementSigningFlow({
  agreement,
  party,
  isLocked = false,
  saving = false,
  onPersistInitial,
  onPersistSignature,
  onPersistIdentity,
  signingToken,
  subtitle,
  footer,
}: AgreementSigningFlowProps) {
  const partyId = party.id;
  const idRequired = partyRequiresIdVerification(agreement, party);
  const identityComplete = isPartyIdentityComplete(agreement, partyId);
  const {
    frontImage,
    backImage,
    setFrontImage,
    setBackImage,
    ready: idPhotosReady,
  } = useIdPhotoCaptureState();
  const [idConsent, setIdConsent] = useState(false);
  const [identitySaving, setIdentitySaving] = useState(false);
  const [phase, setPhase] = useState<SignPhase>(() =>
    idRequired && !identityComplete ? "identity" : "setup"
  );
  const [capturedSignature, setCapturedSignature] = useState<string | null>(null);
  const [capturedInitials, setCapturedInitials] = useState<string | null>(null);
  const [activeFieldIndex, setActiveFieldIndex] = useState(0);
  const [persistError, setPersistError] = useState<string | null>(null);
  const fieldRefs = useRef<Record<string, HTMLDivElement | null>>({});
  /** True once the user has entered the document step — prevents reverting to setup after saves. */
  const documentEnteredRef = useRef(false);
  const bootstrappedRef = useRef(false);

  const fields = useMemo(
    () => buildSigningFieldsForParty(agreement, partyId),
    [agreement, partyId]
  );
  const activeField = fields[activeFieldIndex];
  const locked = isLocked || agreement.status === "signed" || agreement.status === "completed";
  const [consent, setConsent] = useState(false);

  const syncActiveFieldIndex = useCallback(
    (initialsOverride?: Agreement["initials"], signaturesOverride?: Agreement["signatures"]) => {
      const view = {
        initials: initialsOverride ?? agreement.initials ?? [],
        signatures: signaturesOverride ?? agreement.signatures ?? [],
      };
      const index = getFirstIncompleteFieldIndex(view, partyId, fields);
      setActiveFieldIndex(index >= fields.length ? Math.max(0, fields.length - 1) : index);
    },
    [agreement, partyId, fields]
  );

  useEffect(() => {
    const sig = getPartySignature(agreement, partyId)?.signatureDataUrl;
    const initials = getPartyInitialsImage(agreement, partyId);
    if (sig) setCapturedSignature(sig);
    if (initials) setCapturedInitials(initials);
  }, [agreement, partyId]);

  // Resume in document phase when returning to a partially signed agreement.
  useEffect(() => {
    if (bootstrappedRef.current || documentEnteredRef.current) return;
    if (idRequired && !identityComplete) return;
    const hasServerProgress =
      (agreement.initials ?? []).some((i) => i.partyId === partyId) ||
      !!getPartySignature(agreement, partyId);
    if (!hasServerProgress) return;
    bootstrappedRef.current = true;
    documentEnteredRef.current = true;
    setConsent(true);
    setPhase("document");
  }, [agreement, partyId, idRequired, identityComplete]);

  useEffect(() => {
    if (identityComplete && phase === "identity") {
      setPhase("setup");
    }
  }, [identityComplete, phase]);

  // Keep focus on the first incomplete field while signing (after saves refresh agreement).
  useEffect(() => {
    if (phase !== "document" || locked) return;
    syncActiveFieldIndex();
  }, [phase, locked, agreement.initials, agreement.signatures, syncActiveFieldIndex]);

  useEffect(() => {
    if (phase !== "document" || !activeField) return;
    const timer = window.setTimeout(() => {
      fieldRefs.current[activeField.id]?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [phase, activeField?.id, activeField]);

  const registerFieldRef = useCallback((fieldId: string, el: HTMLDivElement | null) => {
    fieldRefs.current[fieldId] = el;
  }, []);

  const enterDocument = () => {
    bootstrappedRef.current = true;
    documentEnteredRef.current = true;
    setPhase("document");
    syncActiveFieldIndex();
  };

  const returnToSetup = () => {
    documentEnteredRef.current = false;
    setPhase("setup");
  };

  const persistInitial = async (clauseId: string, initialsDataUrl: string) => {
    setPersistError(null);
    setCapturedInitials(initialsDataUrl);
    try {
      const result = await onPersistInitial(clauseId, initialsDataUrl);
      syncActiveFieldIndex(result?.initials, result?.signatures);
    } catch (err) {
      setPersistError(err instanceof Error ? err.message : "Failed to save initials");
      throw err;
    }
  };

  const persistSignature = async (signatureDataUrl: string) => {
    if (!consent) {
      alert("Agree to electronic signature consent before signing.");
      return;
    }
    if (idRequired && !isPartyIdentityComplete(agreement, partyId)) {
      alert("Government ID (front and back) is required before signing.");
      setPhase("identity");
      return;
    }
    setPersistError(null);
    setCapturedSignature(signatureDataUrl);
    try {
      const result = await onPersistSignature(signatureDataUrl);
      syncActiveFieldIndex(result?.initials, result?.signatures);
    } catch (err) {
      setPersistError(err instanceof Error ? err.message : "Failed to save signature");
      throw err;
    }
  };

  const handleApplyField = async (field: SigningField) => {
    if (locked || saving) return;
    if (field.type === "initial" && field.clauseId && capturedInitials) {
      await persistInitial(field.clauseId, capturedInitials);
    }
    if (field.type === "signature" && capturedSignature) {
      await persistSignature(capturedSignature);
    }
  };

  const handleSubmitIdentity = async () => {
    if (!onPersistIdentity || !idPhotosReady || !idConsent || locked || identitySaving) return;
    setPersistError(null);
    setIdentitySaving(true);
    try {
      await onPersistIdentity(frontImage!, backImage!, true);
      setPhase("setup");
    } catch (err) {
      setPersistError(err instanceof Error ? err.message : "Failed to save ID photos");
    } finally {
      setIdentitySaving(false);
    }
  };

  const completedCount = fields.filter((f) => isSigningFieldComplete(agreement, partyId, f)).length;
  const allFieldsComplete = fields.length > 0 && completedCount === fields.length;
  const canStartDocument = consent && !!capturedSignature && !!capturedInitials;

  return (
    <div className="pb-24">
      {subtitle && <p className="mb-4 text-sm text-slate-500">{subtitle}</p>}

      {locked && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          <CheckCircle className="h-5 w-5" /> Agreement fully signed. Thank you!
        </div>
      )}

      {persistError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {persistError}
        </div>
      )}

      <Card className="mb-6">
        <CardBody className="space-y-4">
          <Input label="Signer Name" value={party.signerName} readOnly touch />
          <Input label="Title" value={party.signerTitle || ""} readOnly touch />
          <Input label="Date" value={new Date().toLocaleDateString()} readOnly touch />
          <label className="flex items-center gap-3 text-sm font-medium">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="h-6 w-6 rounded"
              disabled={locked}
            />
            I agree to conduct this transaction electronically and understand my electronic signature has the
            same effect as a handwritten signature.
          </label>
        </CardBody>
      </Card>

      {!locked && phase === "identity" && idRequired && (
        <Card className="mb-6">
          <CardHeader>
            <h2 className="text-lg font-semibold">Step 1 — Government ID verification</h2>
            <p className="mt-1 text-sm text-slate-500">
              Photograph the front and back of your government-issued ID. Required for age verification
              before you can sign.
            </p>
          </CardHeader>
          <CardBody className="space-y-6">
            <IdPhotoCapture
              frontImage={frontImage}
              backImage={backImage}
              onFrontChange={setFrontImage}
              onBackChange={setBackImage}
              disabled={identitySaving}
            />
            <label className="flex items-start gap-3 text-sm font-medium">
              <input
                type="checkbox"
                checked={idConsent}
                onChange={(e) => setIdConsent(e.target.checked)}
                className="mt-1 h-6 w-6 rounded"
                disabled={identitySaving}
              />
              <span className="font-normal text-slate-600">{ID_VERIFICATION_CONSENT}</span>
            </label>
            <Button
              size="touch"
              disabled={!idPhotosReady || !idConsent || identitySaving || !onPersistIdentity}
              onClick={handleSubmitIdentity}
            >
              {identitySaving ? "Saving…" : "Save ID and continue"}
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          </CardBody>
        </Card>
      )}

      {!locked && phase === "setup" && (
        <Card className="mb-6">
          <CardHeader>
            <h2 className="text-lg font-semibold">
              {idRequired ? "Step 2 — Create your signature and initials" : "Step 1 — Create your signature and initials"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Draw each one once. You will place them on the document in the next step.
            </p>
          </CardHeader>
          <CardBody className="space-y-8">
            <div className="grid gap-8 lg:grid-cols-2">
              <div>
                <SignaturePad label="Your signature" onSave={setCapturedSignature} large />
                {capturedSignature && (
                  <SavedMarkPreview label="Signature saved" dataUrl={capturedSignature} className="mt-3" />
                )}
              </div>
              <div>
                <SignaturePad label="Your initials" onSave={setCapturedInitials} large />
                {capturedInitials && (
                  <SavedMarkPreview label="Initials saved" dataUrl={capturedInitials} className="mt-3" />
                )}
              </div>
            </div>
            <Button size="touch" disabled={!canStartDocument} onClick={enterDocument}>
              Continue to document
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          </CardBody>
        </Card>
      )}

      {(phase === "document" || locked) && (
        <>
          {!locked && (
            <div className="sticky top-0 z-20 mb-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-sky-900">
                    {allFieldsComplete
                      ? "All fields complete"
                      : activeField
                        ? `Next: ${activeField.type === "signature" ? "Sign" : "Initial"} — ${activeField.label}`
                        : "Review document"}
                  </p>
                  <p className="text-xs text-sky-700">
                    Field {Math.min(activeFieldIndex + 1, fields.length)} of {fields.length} · {completedCount}{" "}
                    completed
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={returnToSetup}>
                    Edit signature / initials
                  </Button>
                  {activeField && !isSigningFieldComplete(agreement, partyId, activeField) && (
                    <Button
                      size="touch"
                      disabled={
                        saving ||
                        (activeField.type === "initial" ? !capturedInitials : !capturedSignature)
                      }
                      onClick={() => handleApplyField(activeField)}
                    >
                      {activeField.type === "signature" ? "Use signature" : "Use initials"}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          <AgreementSigningDocument
            agreement={agreement}
            partyId={partyId}
            fields={fields}
            activeFieldId={locked ? undefined : activeField?.id}
            capturedSignature={capturedSignature ?? undefined}
            capturedInitials={capturedInitials ?? undefined}
            disabled={locked || saving}
            onFieldFocus={(fieldId) => {
              const index = fields.findIndex((f) => f.id === fieldId);
              if (index >= 0) setActiveFieldIndex(index);
            }}
            onApplyField={handleApplyField}
            registerFieldRef={registerFieldRef}
          />
        </>
      )}

      {footer}
    </div>
  );
}
