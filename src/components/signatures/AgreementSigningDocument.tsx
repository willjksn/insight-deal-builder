"use client";

import { Agreement } from "@/lib/types";
import { formatDate } from "@/lib/utils/format";
import { PRODUCER_LEGAL_NAME } from "@/lib/constants/legalTerms";
import { resolveAgreementClauses } from "@/lib/constants/clauses";
import { getAgreementDocumentMeta } from "@/lib/agreement/documentMeta";
import {
  SigningField,
  getAppliedMarkForField,
  isSigningFieldComplete,
} from "@/lib/agreement/signing";
import { SigningFieldBox } from "@/components/signatures/SigningFieldBox";
import { AgreementSigningDocumentBody } from "@/components/signatures/AgreementSigningDocumentSections";

interface AgreementSigningDocumentProps {
  agreement: Agreement;
  partyId: string;
  fields: SigningField[];
  activeFieldId?: string;
  capturedSignature?: string;
  capturedInitials?: string;
  disabled?: boolean;
  onFieldFocus: (fieldId: string) => void;
  onApplyField: (field: SigningField) => void;
  onNeedsCapture?: () => void;
  registerFieldRef: (fieldId: string, el: HTMLButtonElement | null) => void;
}

export function AgreementSigningDocument({
  agreement,
  partyId,
  fields,
  activeFieldId,
  capturedSignature,
  capturedInitials,
  disabled,
  onFieldFocus,
  onApplyField,
  onNeedsCapture,
  registerFieldRef,
}: AgreementSigningDocumentProps) {
  const meta = getAgreementDocumentMeta(agreement);
  const clauses = resolveAgreementClauses(agreement).filter((c) => c.requiresInitials);
  const initialFieldByClause = new Map(
    fields.filter((f) => f.type === "initial").map((f) => [f.clauseId!, f])
  );
  const signatureField = fields.find((f) => f.type === "signature");

  const renderField = (field: SigningField) => {
    const isActive = activeFieldId === field.id;
    const isComplete = isSigningFieldComplete(agreement, partyId, field);
    const appliedImage = getAppliedMarkForField(agreement, partyId, field);
    const capturedImage = field.type === "signature" ? capturedSignature : capturedInitials;

    return (
      <SigningFieldBox
        key={field.id}
        type={field.type}
        label={field.label}
        isActive={isActive}
        isComplete={isComplete}
        capturedImage={capturedImage}
        appliedImage={appliedImage}
        disabled={disabled}
        onApply={() => onApplyField(field)}
        onFocus={() => onFieldFocus(field.id)}
        onNeedsCapture={onNeedsCapture}
        fieldRef={(el) => registerFieldRef(field.id, el)}
      />
    );
  };

  return (
    <div className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
      <div className="mb-8 border-b border-slate-200 pb-6">
        <p className="text-sm font-semibold text-slate-600">{PRODUCER_LEGAL_NAME}</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{meta.title}</h1>
        <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{meta.preamble}</p>
      </div>

      <AgreementSigningDocumentBody agreement={agreement} meta={meta} />

      <section className="mb-4">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-900">Terms and Conditions</h2>
        <p className="mb-6 text-xs text-slate-500">
          Initial each clause below to confirm acceptance. Your initials appear in the box beside each section.
        </p>
        <div className="space-y-0 divide-y divide-slate-100">
          {clauses.map((clause) => {
            const field = initialFieldByClause.get(clause.id);
            if (!field) {
              return (
                <div key={clause.id} className="py-5">
                  <h3 className="mb-2 text-sm font-bold uppercase text-slate-900">{clause.title}</h3>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{clause.body}</p>
                </div>
              );
            }
            return (
              <div key={clause.id} className="flex gap-4 py-5 sm:gap-6">
                <div className="min-w-0 flex-1">
                  <h3 className="mb-2 text-sm font-bold uppercase text-slate-900">{clause.title}</h3>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{clause.body}</p>
                </div>
                {renderField(field)}
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-10 border-t border-slate-200 pt-8">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-900">Signature</h2>
        {agreement.parties
          .filter((p) => p.signatureRequired)
          .map((party) => {
            const isSigningParty = party.id === partyId;
            const field = isSigningParty ? signatureField : undefined;
            const signed = agreement.signatures.some((s) => s.partyId === party.id);
            const signatureRecord = agreement.signatures.find((s) => s.partyId === party.id);

            return (
              <div
                key={party.id}
                className="mb-6 flex flex-col gap-4 border-b border-slate-100 pb-6 last:border-0 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="text-sm text-slate-700">
                  <p className="font-semibold text-slate-900">{party.signerName}</p>
                  <p>{party.roleInAgreement}</p>
                  {party.signerTitle && <p>{party.signerTitle}</p>}
                  <p className="mt-2 text-xs text-slate-500">
                    {signed && signatureRecord
                      ? `Signed ${formatDate(signatureRecord.signedAt)}`
                      : "Pending signature"}
                  </p>
                </div>
                {field ? (
                  renderField(field)
                ) : (
                  signed &&
                  signatureRecord && (
                    <div className="flex h-16 w-44 shrink-0 items-center justify-center rounded-md border border-emerald-300 bg-white p-1 sm:w-52">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={signatureRecord.signatureDataUrl}
                        alt={`${party.signerName} signature`}
                        className="max-h-11 max-w-full object-contain"
                      />
                    </div>
                  )
                )}
              </div>
            );
          })}
      </section>
    </div>
  );
}
