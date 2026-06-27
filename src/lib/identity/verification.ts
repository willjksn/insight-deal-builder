import {
  Agreement,
  AgreementParty,
  PartyIdentityVerification,
  PartyIdentityVerificationPublic,
} from "@/lib/types";

export const ID_VERIFICATION_CONSENT =
  "I authorize Insight Media Group LLC to photograph and retain images of my government-issued ID (front and back) for identity and age verification related to this agreement. I understand these images are stored securely, are not included in the agreement PDF, and are accessible only to authorized Insight staff.";

/** Equipment rental (Renter) and talent parties require government ID. */
export function partyRequiresIdVerification(
  agreement: Pick<Agreement, "agreementType">,
  party: AgreementParty
): boolean {
  if (party.idVerificationRequired === false) return false;
  if (party.idVerificationRequired === true) return true;
  if (agreement.agreementType === "equipment_rental" && party.roleInAgreement === "Renter") {
    return true;
  }
  if (party.roleInAgreement === "Talent") return true;
  return false;
}

export function getPartyIdentityVerification(
  agreement: Pick<Agreement, "identityVerifications">,
  partyId: string
): PartyIdentityVerification | undefined {
  return (agreement.identityVerifications ?? []).find((v) => v.partyId === partyId);
}

export function isPartyIdentityComplete(
  agreement: Pick<Agreement, "identityVerifications">,
  partyId: string
): boolean {
  const record = getPartyIdentityVerification(agreement, partyId);
  if (!record) return false;
  const maybePublic = record as PartyIdentityVerification & { complete?: boolean };
  if (typeof maybePublic.complete === "boolean") return maybePublic.complete;
  return !!(record.idFrontStoragePath && record.idBackStoragePath && record.consentGiven);
}

export function redactIdentityVerifications(
  records: PartyIdentityVerification[] | undefined
): PartyIdentityVerificationPublic[] {
  return (records ?? []).map((v) => ({
    id: v.id,
    partyId: v.partyId,
    capturedAt: v.capturedAt,
    capturedBy: v.capturedBy,
    consentGiven: v.consentGiven,
    complete: !!(v.idFrontStoragePath && v.idBackStoragePath && v.consentGiven),
  }));
}

export function upsertPartyIdentityVerification(
  existing: PartyIdentityVerification[] | undefined,
  record: PartyIdentityVerification
): PartyIdentityVerification[] {
  const list = existing ?? [];
  return [...list.filter((v) => v.partyId !== record.partyId), record];
}
