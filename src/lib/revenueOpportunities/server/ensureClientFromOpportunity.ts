import { FieldValue, Firestore } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { stripUndefined } from "@/lib/firebase/firestore";
import { RevenueOpportunityError } from "@/lib/revenueOpportunities/errors";
import { getOpportunity, updateOpportunity } from "@/lib/revenueOpportunities/server/opportunities";
import type { RevenueOpportunity } from "@/lib/revenueOpportunities/types/opportunity";
import type { Client } from "@/lib/types";
import { AppUser } from "@/lib/types";

function requireDb(): Firestore {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin is not configured");
  return db;
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase();
}

async function findClientByName(db: Firestore, businessName: string): Promise<Client | null> {
  const target = normalizeName(businessName);
  if (!target) return null;
  const snap = await db.collection("clients").limit(200).get();
  for (const doc of snap.docs) {
    const data = doc.data() as Omit<Client, "id">;
    if (normalizeName(data.businessName) === target) {
      return { id: doc.id, ...data };
    }
  }
  return null;
}

function clientPayloadFromOpportunity(opportunity: RevenueOpportunity): Omit<Client, "id" | "createdAt" | "updatedAt"> {
  const { subject, contact } = opportunity;
  const email = contact?.email?.trim() || subject.publicEmail?.trim() || "";
  if (!email) {
    throw new RevenueOpportunityError(
      "VALIDATION_FAILED",
      "A contact email is required to create a ShootSpine client. Add email on the opportunity contact first."
    );
  }
  return stripUndefined({
    businessName: subject.name.trim(),
    contactName: contact?.name?.trim() || subject.name.trim(),
    email,
    phone: contact?.phone?.trim() || subject.publicPhone?.trim(),
    website: subject.website?.trim(),
    address: subject.address?.trim() || [subject.city, subject.state].filter(Boolean).join(", ") || undefined,
    authorizedSignerName: contact?.name?.trim(),
    authorizedSignerTitle: contact?.title?.trim(),
    notes: "Created from Revenue & opportunities",
  }) as Omit<Client, "id" | "createdAt" | "updatedAt">;
}

/** Find or create a ShootSpine client record for this opportunity. */
export async function ensureClientFromOpportunity(
  appUser: AppUser,
  opportunity: RevenueOpportunity
): Promise<{ client: Client; created: boolean; opportunity: RevenueOpportunity }> {
  const db = requireDb();

  if (opportunity.clientId) {
    const snap = await db.collection("clients").doc(opportunity.clientId).get();
    if (snap.exists) {
      return {
        client: { id: snap.id, ...(snap.data() as Omit<Client, "id">) },
        created: false,
        opportunity,
      };
    }
  }

  const existing = await findClientByName(db, opportunity.subject.name);
  if (existing) {
    if (!opportunity.clientId) {
      const updated = await updateOpportunity(appUser, opportunity.id, { clientId: existing.id });
      return { client: existing, created: false, opportunity: updated };
    }
    return { client: existing, created: false, opportunity };
  }

  const payload = clientPayloadFromOpportunity(opportunity);
  const ref = await db.collection("clients").add({
    ...payload,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  const snap = await ref.get();
  const client = { id: ref.id, ...(snap.data() as Omit<Client, "id">) };
  const updated = await updateOpportunity(appUser, opportunity.id, { clientId: client.id });
  return { client, created: true, opportunity: updated };
}

export async function ensureClientForOpportunityId(
  appUser: AppUser,
  opportunityId: string
): Promise<{ client: Client; created: boolean; opportunity: RevenueOpportunity }> {
  const opportunity = await getOpportunity(appUser, opportunityId);
  return ensureClientFromOpportunity(appUser, opportunity);
}
