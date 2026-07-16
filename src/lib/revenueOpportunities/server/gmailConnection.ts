import { FieldValue, Firestore } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { stripUndefined } from "@/lib/firebase/firestore";
import { REVENUE_GMAIL_CONNECTIONS_COLLECTION } from "@/lib/revenueOpportunities/collections";
import { RevenueOpportunityError } from "@/lib/revenueOpportunities/errors";
import { serializeDoc } from "@/lib/revenueOpportunities/server/serialize";
import type { RevenueGmailConnection, RevenueGmailConnectionSecrets } from "@/lib/revenueOpportunities/types/gmailConnection";
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

function connectionDocId(appUser: AppUser): string {
  return `${tenantCompany(appUser)}_${appUser.id}`;
}

export async function getGmailConnection(
  appUser: AppUser
): Promise<(RevenueGmailConnection & { secrets?: RevenueGmailConnectionSecrets }) | null> {
  const db = requireDb();
  const snap = await db.collection(REVENUE_GMAIL_CONNECTIONS_COLLECTION).doc(connectionDocId(appUser)).get();
  if (!snap.exists) return null;
  const data = snap.data()!;
  if (data.organizationCompany !== tenantCompany(appUser)) return null;
  const { accessToken, refreshToken, expiryDate, ...publicFields } = data;
  return {
    ...serializeDoc<RevenueGmailConnection>(snap.id, publicFields),
    secrets: accessToken
      ? {
          accessToken: String(accessToken),
          refreshToken: String(refreshToken ?? ""),
          expiryDate: typeof expiryDate === "number" ? expiryDate : undefined,
        }
      : undefined,
  };
}

export async function saveGmailConnection(
  appUser: AppUser,
  input: {
    email: string;
    accessToken: string;
    refreshToken: string;
    expiryDate?: number;
    scopes: string[];
  }
): Promise<RevenueGmailConnection> {
  const db = requireDb();
  const ref = db.collection(REVENUE_GMAIL_CONNECTIONS_COLLECTION).doc(connectionDocId(appUser));
  await ref.set(
    stripUndefined({
      organizationCompany: tenantCompany(appUser),
      userId: appUser.id,
      email: input.email,
      accessToken: input.accessToken,
      refreshToken: input.refreshToken,
      expiryDate: input.expiryDate,
      scopes: input.scopes,
      connectedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }),
    { merge: true }
  );
  const snap = await ref.get();
  const data = snap.data()!;
  const { accessToken: _a, refreshToken: _r, expiryDate: _e, ...publicFields } = data;
  return serializeDoc<RevenueGmailConnection>(snap.id, publicFields);
}

export async function updateGmailTokens(
  appUser: AppUser,
  tokens: { accessToken: string; refreshToken: string; expiryDate?: number }
): Promise<void> {
  const db = requireDb();
  const ref = db.collection(REVENUE_GMAIL_CONNECTIONS_COLLECTION).doc(connectionDocId(appUser));
  await ref.update(
    stripUndefined({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiryDate: tokens.expiryDate,
      updatedAt: FieldValue.serverTimestamp(),
    })
  );
}

export async function disconnectGmail(appUser: AppUser): Promise<void> {
  const db = requireDb();
  await db.collection(REVENUE_GMAIL_CONNECTIONS_COLLECTION).doc(connectionDocId(appUser)).delete();
}

export async function requireGmailSecrets(appUser: AppUser): Promise<RevenueGmailConnectionSecrets & { email: string }> {
  const conn = await getGmailConnection(appUser);
  if (!conn?.secrets?.refreshToken) {
    throw new RevenueOpportunityError("GMAIL_NOT_CONFIGURED", "Connect Gmail in Revenue settings first");
  }
  return { ...conn.secrets, email: conn.email };
}
