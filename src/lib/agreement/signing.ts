import { Agreement, AgreementClause, InitialRecord, SignatureRecord } from "@/lib/types";
import { resolveAgreementClauses } from "@/lib/constants/clauses";

export type SigningFieldType = "initial" | "signature";

export interface SigningField {
  id: string;
  type: SigningFieldType;
  label: string;
  clauseId?: string;
}

export function getPartySignature(
  agreement: Pick<Agreement, "signatures">,
  partyId: string
): SignatureRecord | undefined {
  return agreement.signatures.find((s) => s.partyId === partyId);
}

/** Most recent initials image captured for this party on this agreement. */
export function getPartyInitialsImage(
  agreement: Pick<Agreement, "initials">,
  partyId: string
): string | undefined {
  const partyInitials = agreement.initials.filter((i) => i.partyId === partyId);
  if (!partyInitials.length) return undefined;
  return partyInitials[partyInitials.length - 1].initialsDataUrl;
}

export function getMissingInitialClauseIds(
  agreement: Pick<Agreement, "initials">,
  partyId: string,
  requiredClauses: AgreementClause[]
): string[] {
  return requiredClauses
    .filter((c) => !agreement.initials.some((i) => i.partyId === partyId && i.clauseId === c.id))
    .map((c) => c.id);
}

export function upsertPartyInitials(
  existing: InitialRecord[],
  partyId: string,
  clauseIds: string[],
  initialsDataUrl: string
): InitialRecord[] {
  const initialedAt = new Date().toISOString();
  const next = existing.filter(
    (i) => !(i.partyId === partyId && clauseIds.includes(i.clauseId))
  );
  for (const clauseId of clauseIds) {
    next.push({
      id: crypto.randomUUID(),
      partyId,
      clauseId,
      initialsDataUrl,
      initialedAt,
    });
  }
  return next;
}

export function buildSigningFieldsForParty(
  agreement: Pick<Agreement, "parties" | "clauses" | "agreementType" | "gearDetails">,
  partyId: string
): SigningField[] {
  const party = agreement.parties.find((p) => p.id === partyId);
  if (!party) return [];

  const fields: SigningField[] = resolveAgreementClauses(agreement)
    .filter((c) => c.requiresInitials)
    .map((c) => ({
      id: `initial-${c.id}`,
      type: "initial" as const,
      label: c.title,
      clauseId: c.id,
    }));

  if (party.signatureRequired) {
    fields.push({
      id: `signature-${partyId}`,
      type: "signature",
      label: "Signature",
    });
  }

  return fields;
}

export function isSigningFieldComplete(
  agreement: Pick<Agreement, "initials" | "signatures">,
  partyId: string,
  field: SigningField
): boolean {
  if (field.type === "initial" && field.clauseId) {
    return agreement.initials.some((i) => i.partyId === partyId && i.clauseId === field.clauseId);
  }
  if (field.type === "signature") {
    return agreement.signatures.some((s) => s.partyId === partyId);
  }
  return false;
}

export function getFirstIncompleteFieldIndex(
  agreement: Pick<Agreement, "initials" | "signatures">,
  partyId: string,
  fields: SigningField[]
): number {
  const index = fields.findIndex((field) => !isSigningFieldComplete(agreement, partyId, field));
  return index === -1 ? fields.length : index;
}

export function getAppliedMarkForField(
  agreement: Pick<Agreement, "initials" | "signatures">,
  partyId: string,
  field: SigningField
): string | undefined {
  if (field.type === "initial" && field.clauseId) {
    return agreement.initials.find((i) => i.partyId === partyId && i.clauseId === field.clauseId)
      ?.initialsDataUrl;
  }
  if (field.type === "signature") {
    return getPartySignature(agreement, partyId)?.signatureDataUrl;
  }
  return undefined;
}
