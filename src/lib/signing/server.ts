import { randomBytes } from "crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { upsertPartyInitials } from "@/lib/agreement/signing";
import { deliverClientSignedNotifications } from "@/lib/notifications/server";
import {
  partyRequiresIdVerification,
  redactIdentityVerifications,
  upsertPartyIdentityVerification,
  isPartyIdentityComplete,
} from "@/lib/identity/verification";
import {
  newIdentityRecordId,
  uploadIdentityImage,
} from "@/lib/identity/storage";
import { uploadW9Pdf, getW9SignedUrl } from "@/lib/w9/storage";
import {
  agreementSupportsW9Upload,
  buildPayeeTaxW9Update,
  getPayeeTaxFromAgreement,
  hasW9Document,
  redactAgreementPayeeTaxFields,
} from "@/lib/w9/payeeTax";
import { Agreement, AgreementParty, AgreementStatus, PartyIdentityVerification, PayeeTaxInfo, SignatureRecord } from "@/lib/types";
import { isInsightMediaGroupParty } from "@/lib/analytics/partnerReceivableTracking";

const LINK_TTL_DAYS = 30;

export function serializeAgreement(agreement: Agreement): Agreement {
  return JSON.parse(
    JSON.stringify(agreement, (_key, value) => {
      if (value && typeof value === "object" && typeof (value as { toDate?: () => Date }).toDate === "function") {
        return (value as { toDate: () => Date }).toDate().toISOString();
      }
      return value;
    })
  ) as Agreement;
}

/** Strip storage paths before returning agreement to public signing clients */
export function serializeAgreementForSigning(agreement: Agreement): Agreement {
  const serialized = serializeAgreement(agreement);
  const redacted = redactAgreementPayeeTaxFields(serialized);
  return {
    ...redacted,
    identityVerifications: redactIdentityVerifications(serialized.identityVerifications) as unknown as PartyIdentityVerification[],
  };
}

export function generateSigningToken(): string {
  return randomBytes(32).toString("hex");
}

export function getSigningLinkUrl(token: string, appUrl: string): string {
  const base = appUrl.replace(/\/$/, "");
  return `${base}/sign/${token}`;
}

export function getClientPaymentUrl(token: string, appUrl: string): string {
  const base = appUrl.replace(/\/$/, "");
  return `${base}/pay/${token}`;
}

export async function createSigningLink(params: {
  agreementId: string;
  partyId: string;
  createdBy: string;
}): Promise<{ token: string; expiresAt: Date }> {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin is not configured");

  const agreementSnap = await db.collection("agreements").doc(params.agreementId).get();
  if (!agreementSnap.exists) throw new Error("Agreement not found");

  const agreement = { id: agreementSnap.id, ...agreementSnap.data() } as Agreement;
  const party = agreement.parties.find((p) => p.id === params.partyId);
  if (!party) throw new Error("Party not found on agreement");
  if (party.type !== "client") {
    const allowedRenter =
      agreement.agreementType === "equipment_rental" && party.roleInAgreement === "Renter";
    const allowedTalent =
      agreement.agreementType === "talent_agreement" && party.roleInAgreement === "Talent";
    const allowedContractor =
      agreement.agreementType === "contractor_agreement" && party.roleInAgreement === "Contractor";
    const allowedPropertyOwner =
      agreement.agreementType === "location_agreement" && party.roleInAgreement === "Property Owner";
    const allowedCollaborator =
      agreement.agreementType === "internal_collaboration" &&
      !isInsightMediaGroupParty(party) &&
      party.signatureRequired;
    if (
      !allowedRenter &&
      !allowedTalent &&
      !allowedContractor &&
      !allowedPropertyOwner &&
      !allowedCollaborator
    ) {
      throw new Error("Signing links are only available for client, renter, talent, contractor, property owner, or collaborator parties");
    }
  }

  if (["void", "archived", "completed"].includes(agreement.status)) {
    throw new Error("This agreement cannot accept signatures in its current status");
  }

  const token = generateSigningToken();
  const expiresAt = new Date(Date.now() + LINK_TTL_DAYS * 24 * 60 * 60 * 1000);

  await db.collection("signingLinks").doc(token).set({
    agreementId: params.agreementId,
    partyId: params.partyId,
    expiresAt: Timestamp.fromDate(expiresAt),
    createdBy: params.createdBy,
    revoked: false,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { token, expiresAt };
}

/** Latest non-revoked signing link for a party (for client payment URLs). */
export async function findActiveSigningToken(
  agreementId: string,
  partyId: string
): Promise<string | null> {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin is not configured");

  const snap = await db
    .collection("signingLinks")
    .where("agreementId", "==", agreementId)
    .limit(50)
    .get();

  const now = Date.now();
  let best: { token: string; expiresAt: number } | null = null;

  for (const doc of snap.docs) {
    const data = doc.data();
    if (data.partyId !== partyId) continue;
    if (data.revoked) continue;
    const expiresAt = (data.expiresAt as Timestamp).toMillis();
    if (expiresAt < now) continue;
    if (!best || expiresAt > best.expiresAt) {
      best = { token: doc.id, expiresAt };
    }
  }

  return best?.token ?? null;
}

export type SigningSession = {
  agreement: Agreement;
  party: AgreementParty;
  partyId: string;
  expiresAt: string;
  isLocked: boolean;
};

export async function getSigningSession(token: string): Promise<SigningSession | null> {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin is not configured");

  const linkSnap = await db.collection("signingLinks").doc(token).get();
  if (!linkSnap.exists) return null;

  const link = linkSnap.data()!;
  if (link.revoked) return null;

  const expiresAt = link.expiresAt as Timestamp;
  if (expiresAt.toMillis() < Date.now()) return null;

  const agreementSnap = await db.collection("agreements").doc(link.agreementId).get();
  if (!agreementSnap.exists) return null;

  const agreement = { id: agreementSnap.id, ...agreementSnap.data() } as Agreement;
  const party = agreement.parties.find((p) => p.id === link.partyId);
  if (!party) return null;

  if (["void", "archived"].includes(agreement.status)) return null;

  const isLocked = agreement.status === "signed" || agreement.status === "completed";

  return {
    agreement: serializeAgreementForSigning(agreement),
    party,
    partyId: link.partyId,
    expiresAt: expiresAt.toDate().toISOString(),
    isLocked,
  };
}

function computeAgreementStatus(agreement: Agreement): AgreementStatus {
  const requiredSigs = agreement.parties.filter((p) => p.signatureRequired);
  const allSigned = requiredSigs.every((p) => agreement.signatures.some((s) => s.partyId === p.id));
  if (allSigned) return "signed";
  if (agreement.signatures.length > 0) return "partially_signed";
  return agreement.status === "draft" ? "ready_for_signature" : agreement.status;
}

export async function applySigningInitial(
  token: string,
  clauseId: string,
  initialsDataUrl: string
): Promise<Agreement> {
  const session = await getSigningSession(token);
  if (!session) throw new Error("Invalid or expired signing link");
  if (session.isLocked) throw new Error("Agreement is already fully signed");

  const db = getAdminDb()!;
  const initials = upsertPartyInitials(
    session.agreement.initials ?? [],
    session.partyId,
    [clauseId],
    initialsDataUrl
  );

  await db.collection("agreements").doc(session.agreement.id).update({
    initials,
    status: computeAgreementStatus({ ...session.agreement, initials }),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const updated = await db.collection("agreements").doc(session.agreement.id).get();
  return serializeAgreementForSigning({ id: updated.id, ...updated.data() } as Agreement);
}

export async function applySigningIdentity(
  token: string,
  idFrontDataUrl: string,
  idBackDataUrl: string,
  consentGiven: boolean
): Promise<Agreement> {
  const session = await getSigningSession(token);
  if (!session) throw new Error("Invalid or expired signing link");
  if (session.isLocked) throw new Error("Agreement is already fully signed");
  if (!consentGiven) throw new Error("Consent is required to capture ID");

  if (!partyRequiresIdVerification(session.agreement, session.party)) {
    throw new Error("ID verification is not required for this party");
  }

  const db = getAdminDb()!;
  const agreementSnap = await db.collection("agreements").doc(session.agreement.id).get();
  const fullAgreement = { id: agreementSnap.id, ...agreementSnap.data() } as Agreement;

  const frontPath = await uploadIdentityImage(fullAgreement.id, session.partyId, "front", idFrontDataUrl);
  const backPath = await uploadIdentityImage(fullAgreement.id, session.partyId, "back", idBackDataUrl);

  const record: PartyIdentityVerification = {
    id: newIdentityRecordId(),
    partyId: session.partyId,
    idFrontStoragePath: frontPath,
    idBackStoragePath: backPath,
    capturedAt: new Date().toISOString(),
    capturedBy: "signer",
    consentGiven: true,
  };

  const identityVerifications = upsertPartyIdentityVerification(
    fullAgreement.identityVerifications,
    record
  );

  await db.collection("agreements").doc(fullAgreement.id).update({
    identityVerifications,
    updatedAt: FieldValue.serverTimestamp(),
  });

  const updated = await db.collection("agreements").doc(session.agreement.id).get();
  return serializeAgreementForSigning({ id: updated.id, ...updated.data() } as Agreement);
}

export async function applyStaffIdentityCapture(
  agreementId: string,
  partyId: string,
  idFrontDataUrl: string,
  idBackDataUrl: string,
  consentGiven: boolean,
  capturedByUserId: string
): Promise<Agreement> {
  if (!consentGiven) throw new Error("Consent is required to capture ID");

  const db = getAdminDb()!;
  const agreementSnap = await db.collection("agreements").doc(agreementId).get();
  if (!agreementSnap.exists) throw new Error("Agreement not found");

  const agreement = { id: agreementSnap.id, ...agreementSnap.data() } as Agreement;
  const party = agreement.parties.find((p) => p.id === partyId);
  if (!party) throw new Error("Party not found on agreement");
  if (!partyRequiresIdVerification(agreement, party)) {
    throw new Error("ID verification is not required for this party");
  }

  const frontPath = await uploadIdentityImage(agreementId, partyId, "front", idFrontDataUrl);
  const backPath = await uploadIdentityImage(agreementId, partyId, "back", idBackDataUrl);

  const record: PartyIdentityVerification = {
    id: newIdentityRecordId(),
    partyId,
    idFrontStoragePath: frontPath,
    idBackStoragePath: backPath,
    capturedAt: new Date().toISOString(),
    capturedBy: "staff",
    capturedByUserId,
    consentGiven: true,
  };

  const identityVerifications = upsertPartyIdentityVerification(agreement.identityVerifications, record);

  await db.collection("agreements").doc(agreementId).update({
    identityVerifications,
    updatedAt: FieldValue.serverTimestamp(),
  });

  const updated = await db.collection("agreements").doc(agreementId).get();
  return serializeAgreement({ id: updated.id, ...updated.data() } as Agreement);
}

export async function getPartyIdentityImageUrls(
  agreementId: string,
  partyId: string
): Promise<{ capturedAt: string; capturedBy: string } | null> {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin is not configured");

  const agreementSnap = await db.collection("agreements").doc(agreementId).get();
  if (!agreementSnap.exists) return null;

  const agreement = { id: agreementSnap.id, ...agreementSnap.data() } as Agreement;
  const record = (agreement.identityVerifications ?? []).find((v) => v.partyId === partyId);
  if (!record?.idFrontStoragePath || !record?.idBackStoragePath) return null;

  return {
    capturedAt: record.capturedAt,
    capturedBy: record.capturedBy,
  };
}

export async function applySigningSignature(
  token: string,
  signatureDataUrl: string,
  appUrl: string
): Promise<Agreement> {
  const session = await getSigningSession(token);
  if (!session) throw new Error("Invalid or expired signing link");
  if (session.isLocked) throw new Error("Agreement is already fully signed");

  const db = getAdminDb()!;
  const agreementSnap = await db.collection("agreements").doc(session.agreement.id).get();
  const fullAgreement = { id: agreementSnap.id, ...agreementSnap.data() } as Agreement;

  if (
    partyRequiresIdVerification(fullAgreement, session.party) &&
    !isPartyIdentityComplete(fullAgreement, session.partyId)
  ) {
    throw new Error("Government ID (front and back) is required before signing");
  }

  const hadSignature = fullAgreement.signatures.some((s) => s.partyId === session.partyId);

  const sig: SignatureRecord = {
    id: randomBytes(16).toString("hex"),
    partyId: session.partyId,
    signerName: session.party.signerName,
    signerTitle: session.party.signerTitle,
    signatureDataUrl,
    signedAt: new Date().toISOString(),
    email: session.party.email,
    agreedToElectronicSignature: true,
  };

  const signatures = [
    ...fullAgreement.signatures.filter((s) => s.partyId !== session.partyId),
    sig,
  ];
  const status = computeAgreementStatus({ ...fullAgreement, signatures });

  await db.collection("agreements").doc(session.agreement.id).update({
    signatures,
    status,
    updatedAt: FieldValue.serverTimestamp(),
  });

  const updatedSnap = await db.collection("agreements").doc(session.agreement.id).get();
  const updated = { id: updatedSnap.id, ...updatedSnap.data() } as Agreement;

  if (
    !hadSignature &&
    (session.party.type === "client" ||
      session.party.roleInAgreement === "Renter" ||
      session.party.roleInAgreement === "Talent" ||
      session.party.roleInAgreement === "Contractor" ||
      session.party.roleInAgreement === "Property Owner")
  ) {
    try {
      await deliverClientSignedNotifications({
        agreement: updated,
        signingParty: session.party,
        appUrl,
      });
    } catch (err) {
      console.error("Failed to deliver sign notifications:", err);
    }
  }

  return serializeAgreementForSigning(updated);
}

async function saveW9OnAgreement(
  agreement: Agreement,
  storagePath: string,
  fileName: string,
  uploadedBy: PayeeTaxInfo["w9UploadedBy"]
): Promise<Agreement> {
  if (!agreementSupportsW9Upload(agreement.agreementType)) {
    throw new Error("This agreement type does not support W-9 upload");
  }

  const existingTax = getPayeeTaxFromAgreement(agreement) || { entityType: "individual" as const };
  const payeeTax: PayeeTaxInfo = {
    ...existingTax,
    w9StoragePath: storagePath,
    w9UploadedAt: new Date().toISOString(),
    w9FileName: fileName,
    w9UploadedBy: uploadedBy,
    w9OnFile: true,
  };

  const db = getAdminDb()!;
  await db.collection("agreements").doc(agreement.id).update({
    ...buildPayeeTaxW9Update(agreement, payeeTax),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const updated = await db.collection("agreements").doc(agreement.id).get();
  return { id: updated.id, ...updated.data() } as Agreement;
}

export async function applyStaffW9Upload(
  agreementId: string,
  pdfDataUrl: string,
  fileName: string,
  uploadedByUserId: string
): Promise<Agreement> {
  const db = getAdminDb()!;
  const agreementSnap = await db.collection("agreements").doc(agreementId).get();
  if (!agreementSnap.exists) throw new Error("Agreement not found");

  const agreement = { id: agreementSnap.id, ...agreementSnap.data() } as Agreement;
  const storagePath = await uploadW9Pdf(agreementId, pdfDataUrl);
  const updated = await saveW9OnAgreement(agreement, storagePath, fileName, "staff");
  void uploadedByUserId;
  return serializeAgreement(updated);
}

export async function applySigningW9(
  token: string,
  pdfDataUrl: string,
  fileName: string
): Promise<Agreement> {
  const session = await getSigningSession(token);
  if (!session) throw new Error("Invalid or expired signing link");
  if (session.isLocked) throw new Error("Agreement is already fully signed");

  const db = getAdminDb()!;
  const agreementSnap = await db.collection("agreements").doc(session.agreement.id).get();
  const fullAgreement = { id: agreementSnap.id, ...agreementSnap.data() } as Agreement;

  if (!agreementSupportsW9Upload(fullAgreement.agreementType)) {
    throw new Error("W-9 upload is not available for this agreement");
  }

  const storagePath = await uploadW9Pdf(fullAgreement.id, pdfDataUrl);
  const updated = await saveW9OnAgreement(fullAgreement, storagePath, fileName, "signer");
  return serializeAgreementForSigning(updated);
}

export async function getAgreementW9Url(agreementId: string): Promise<{
  url: string;
  fileName: string;
  uploadedAt: string;
  uploadedBy: string;
} | null> {
  const db = getAdminDb()!;
  const agreementSnap = await db.collection("agreements").doc(agreementId).get();
  if (!agreementSnap.exists) return null;

  const agreement = { id: agreementSnap.id, ...agreementSnap.data() } as Agreement;
  const tax = getPayeeTaxFromAgreement(agreement);
  if (!tax?.w9StoragePath) return null;

  const url = await getW9SignedUrl(tax.w9StoragePath);
  return {
    url,
    fileName: tax.w9FileName || "w9.pdf",
    uploadedAt: tax.w9UploadedAt || "",
    uploadedBy: tax.w9UploadedBy === "signer" ? "Via signing link" : "Staff upload",
  };
}

export function agreementHasW9(agreement: Agreement): boolean {
  return hasW9Document(getPayeeTaxFromAgreement(agreement));
}
