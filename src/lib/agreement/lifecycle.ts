import { getCollection, updateDocument } from "@/lib/firebase/firestore";
import { computeAgreementAccessKeys } from "@/lib/agreement/access";
import { Agreement, AgreementParty, AgreementStatus } from "@/lib/types";

export type AgreementPayload = Omit<Agreement, "id" | "createdAt" | "updatedAt">;

export function withAgreementAccessKeys<T extends { parties: AgreementParty[] }>(
  data: T
): T & { accessKeys: string[] } {
  return { ...data, accessKeys: computeAgreementAccessKeys(data.parties) };
}

export function agreementFromDocument(doc: Agreement): AgreementPayload {
  const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = doc;
  return rest;
}

export function canOpenInWizard(status: AgreementStatus): boolean {
  return status === "draft" || status === "ready_for_signature";
}

export function duplicateAgreement(source: Agreement): AgreementPayload {
  const base = agreementFromDocument(source);
  return withAgreementAccessKeys({
    ...base,
    version: base.version + 1,
    status: "draft",
    signatures: [],
    initials: [],
    identityVerifications: [],
    paymentTracking: undefined,
    pdfUrl: undefined,
    servicePackageId: base.servicePackageId,
  });
}

export async function repairAllAgreementAccessKeys(): Promise<{
  updated: number;
  total: number;
}> {
  const agreements = await getCollection<Agreement>("agreements");
  let updated = 0;

  for (const agreement of agreements) {
    const keys = computeAgreementAccessKeys(agreement.parties);
    const prev = [...(agreement.accessKeys ?? [])].sort().join("\0");
    const next = [...keys].sort().join("\0");
    if (prev !== next) {
      await updateDocument("agreements", agreement.id, { accessKeys: keys });
      updated++;
    }
  }

  return { updated, total: agreements.length };
}
