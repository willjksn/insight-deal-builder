import { getAdminDb } from "@/lib/firebase/admin";
import { Agreement } from "@/lib/types";

function serializeTimestamp(value: unknown): string {
  if (typeof value === "string") return value;
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  if (
    value &&
    typeof value === "object" &&
    "seconds" in value &&
    typeof (value as { seconds: number }).seconds === "number"
  ) {
    return new Date((value as { seconds: number }).seconds * 1000).toISOString();
  }
  return String(value ?? "");
}

export async function getPartyIdentityMetadata(
  agreementId: string,
  partyId: string
): Promise<{ capturedAt: string; capturedBy: string; idFrontStoragePath: string; idBackStoragePath: string } | null> {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin is not configured");

  const agreementSnap = await db.collection("agreements").doc(agreementId).get();
  if (!agreementSnap.exists) return null;

  const agreement = { id: agreementSnap.id, ...agreementSnap.data() } as Agreement;
  const record = (agreement.identityVerifications ?? []).find((v) => v.partyId === partyId);
  if (!record?.idFrontStoragePath || !record?.idBackStoragePath) return null;

  return {
    capturedAt: serializeTimestamp(record.capturedAt),
    capturedBy: record.capturedBy,
    idFrontStoragePath: record.idFrontStoragePath,
    idBackStoragePath: record.idBackStoragePath,
  };
}
