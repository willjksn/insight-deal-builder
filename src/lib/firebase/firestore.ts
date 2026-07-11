import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "./config";

function ensureDb() {
  if (!isFirebaseConfigured || !db) {
    throw new Error(
      "Firebase is not configured. Copy .env.local.example to .env.local and add your credentials."
    );
  }
  return db;
}

/** Firestore rejects undefined anywhere in a document (including nested fields). */
export function stripUndefined<T>(value: T): T {
  if (value === undefined) return value;
  if (value === null || typeof value !== "object") return value;

  // Firestore Timestamp / FieldValue sentinels — do not recurse
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => stripUndefined(item)) as T;
  }

  const out: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (nested !== undefined) {
      out[key] = stripUndefined(nested);
    }
  }
  return out as T;
}

/** Deep-remove undefined via JSON (safe for nested arrays/maps; not for FieldValue/Timestamp). */
export function deepCleanForFirestore<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export async function getCollection<T>(collectionName: string): Promise<T[]> {
  const database = ensureDb();
  const q = query(
    collection(database, collectionName),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(
    (d) => ({ id: d.id, ...d.data() }) as T
  );
}

export async function getCollectionWhere<T>(
  collectionName: string,
  field: string,
  value: string
): Promise<T[]> {
  const database = ensureDb();
  const q = query(
    collection(database, collectionName),
    where(field, "==", value),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as T);
}

export async function getCollectionWhereArrayContains<T>(
  collectionName: string,
  field: string,
  value: string
): Promise<T[]> {
  const database = ensureDb();
  const q = query(
    collection(database, collectionName),
    where(field, "array-contains", value)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as T);
}

import { companyAccessKey } from "@/lib/agreement/access";

export async function getAgreementsForUser(options: {
  canSeeAll: boolean;
  email?: string | null;
  company?: string | null;
  viewAllOrgDeals?: boolean;
}): Promise<import("@/lib/types").Agreement[]> {
  if (options.canSeeAll) {
    return getCollection("agreements");
  }

  const seen = new Map<string, import("@/lib/types").Agreement>();
  const email = options.email?.trim().toLowerCase();
  const company = options.company?.trim();

  if (email) {
    const byEmail = await getCollectionWhereArrayContains<import("@/lib/types").Agreement>(
      "agreements",
      "accessKeys",
      `email:${email}`
    );
    for (const a of byEmail) seen.set(a.id, a);
  }

  if (company && (options.viewAllOrgDeals || !email)) {
    const byCompany = await getCollectionWhereArrayContains<import("@/lib/types").Agreement>(
      "agreements",
      "accessKeys",
      companyAccessKey(company)
    );
    for (const a of byCompany) seen.set(a.id, a);
  }

  return Array.from(seen.values()).sort((a, b) => {
    const aTime = a.updatedAt?.toMillis?.() ?? 0;
    const bTime = b.updatedAt?.toMillis?.() ?? 0;
    return bTime - aTime;
  });
}

export async function getDocument<T>(
  collectionName: string,
  id: string
): Promise<T | null> {
  const database = ensureDb();
  const docRef = doc(database, collectionName, id);
  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() } as T;
}

export async function createDocument<T extends Record<string, unknown>>(
  collectionName: string,
  data: Omit<T, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const database = ensureDb();
  const docRef = await addDoc(collection(database, collectionName), {
    ...stripUndefined(data),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateDocument(
  collectionName: string,
  id: string,
  data: Record<string, unknown>
): Promise<void> {
  const database = ensureDb();
  const docRef = doc(database, collectionName, id);
  await updateDoc(docRef, { ...stripUndefined(data), updatedAt: serverTimestamp() });
}

export async function deleteDocument(
  collectionName: string,
  id: string
): Promise<void> {
  const database = ensureDb();
  await deleteDoc(doc(database, collectionName, id));
}

export { Timestamp, serverTimestamp };
