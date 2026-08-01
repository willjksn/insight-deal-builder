import { FieldValue, Firestore } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { stripUndefined } from "@/lib/firebase/firestore";
import { REVENUE_SUPPRESSION_LIST_COLLECTION } from "@/lib/revenueOpportunities/collections";
import { RevenueOpportunityError } from "@/lib/revenueOpportunities/errors";
import { getOrderedQueryDocs } from "@/lib/revenueOpportunities/server/queryHelpers";
import { serializeDoc } from "@/lib/revenueOpportunities/server/serialize";
import type {
  RevenueSuppressionCreateInput,
  RevenueSuppressionEntry,
  RevenueSuppressionKind,
} from "@/lib/revenueOpportunities/types/suppression";
import { AppUser } from "@/lib/types";

function requireDb(): Firestore {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin is not configured");
  return db;
}

function tenantCompany(appUser: AppUser): string {
  const company = appUser.company?.trim();
  if (!company) throw new RevenueOpportunityError("NOT_AUTHORIZED", "Organization company is required");
  return company;
}

export function normalizeSuppressionValue(kind: RevenueSuppressionKind, raw: string): string {
  let value = raw.trim().toLowerCase();
  if (kind === "email") {
    value = value.replace(/^mailto:/, "");
    if (!value.includes("@") || value.startsWith("@")) {
      throw new RevenueOpportunityError("VALIDATION_FAILED", "Enter a valid email address");
    }
    return value;
  }
  value = value.replace(/^@/, "").replace(/^https?:\/\//, "").split("/")[0] ?? "";
  if (value.includes("@")) value = value.split("@")[1] ?? "";
  if (!value || !value.includes(".")) {
    throw new RevenueOpportunityError("VALIDATION_FAILED", "Enter a valid domain (e.g. example.com)");
  }
  return value;
}

export async function listSuppressionEntries(appUser: AppUser): Promise<RevenueSuppressionEntry[]> {
  const db = requireDb();
  const organizationCompany = tenantCompany(appUser);
  const docs = await getOrderedQueryDocs(
    (ordered) => {
      let q: FirebaseFirestore.Query = db
        .collection(REVENUE_SUPPRESSION_LIST_COLLECTION)
        .where("organizationCompany", "==", organizationCompany);
      if (ordered) q = q.orderBy("updatedAt", "desc");
      return q;
    },
    "updatedAt"
  );
  return docs.map((d) => serializeDoc<RevenueSuppressionEntry>(d.id, d.data()));
}

export async function addSuppressionEntry(
  appUser: AppUser,
  input: RevenueSuppressionCreateInput
): Promise<RevenueSuppressionEntry> {
  const db = requireDb();
  const kind = input.kind === "domain" ? "domain" : "email";
  const value = normalizeSuppressionValue(kind, input.value);
  const organizationCompany = tenantCompany(appUser);

  const dup = await db
    .collection(REVENUE_SUPPRESSION_LIST_COLLECTION)
    .where("organizationCompany", "==", organizationCompany)
    .where("kind", "==", kind)
    .where("value", "==", value)
    .limit(1)
    .get();
  if (!dup.empty) {
    return serializeDoc<RevenueSuppressionEntry>(dup.docs[0].id, dup.docs[0].data());
  }

  const payload = stripUndefined({
    organizationCompany,
    ownerUserId: appUser.id,
    kind,
    value,
    reason: input.reason?.trim(),
    source: input.source ?? "manual",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  const ref = await db.collection(REVENUE_SUPPRESSION_LIST_COLLECTION).add(payload);
  const snap = await ref.get();
  return serializeDoc<RevenueSuppressionEntry>(ref.id, snap.data()!);
}

export async function deleteSuppressionEntry(appUser: AppUser, id: string): Promise<void> {
  const db = requireDb();
  const ref = db.collection(REVENUE_SUPPRESSION_LIST_COLLECTION).doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new RevenueOpportunityError("NOT_FOUND", "Suppression entry not found");
  if (snap.data()!.organizationCompany !== tenantCompany(appUser)) {
    throw new RevenueOpportunityError("NOT_AUTHORIZED", "Suppression entry not found");
  }
  await ref.delete();
}

export type SuppressionMatch = {
  suppressed: boolean;
  entry?: RevenueSuppressionEntry;
  matchedAs?: "email" | "domain";
};

/** True if email (or its domain) is on the org suppression list. */
export async function isEmailSuppressed(
  appUser: AppUser,
  email: string | undefined | null
): Promise<SuppressionMatch> {
  const raw = email?.trim().toLowerCase();
  if (!raw || !raw.includes("@")) return { suppressed: false };
  const domain = raw.split("@")[1]?.trim();
  const entries = await listSuppressionEntries(appUser);
  const emailHit = entries.find((e) => e.kind === "email" && e.value === raw);
  if (emailHit) return { suppressed: true, entry: emailHit, matchedAs: "email" };
  if (domain) {
    const domainHit = entries.find((e) => e.kind === "domain" && e.value === domain);
    if (domainHit) return { suppressed: true, entry: domainHit, matchedAs: "domain" };
  }
  return { suppressed: false };
}

export async function assertEmailNotSuppressed(
  appUser: AppUser,
  email: string | undefined | null
): Promise<void> {
  const match = await isEmailSuppressed(appUser, email);
  if (!match.suppressed) return;
  const label = match.matchedAs === "domain" ? `domain ${match.entry?.value}` : email;
  throw new RevenueOpportunityError(
    "VALIDATION_FAILED",
    `Recipient is on the suppression list (${label}). Remove them in Revenue → Settings before approving outreach.`
  );
}
