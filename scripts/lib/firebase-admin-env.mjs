/**
 * Shared helpers for Node scripts that talk to Firebase Admin / Storage.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";

export function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

/** @returns {{ app: import("firebase-admin/app").App, bucket: import("@google-cloud/storage").Bucket } | null} */
export function initFirebaseAdminStorage() {
  loadEnvLocal();

  const saJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!saJson) return null;

  const serviceAccount = JSON.parse(saJson);
  const app = getApps().length
    ? getApps()[0]
    : initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id,
        storageBucket:
          process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
          process.env.FIREBASE_STORAGE_BUCKET ||
          undefined,
      });

  const bucketName =
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    process.env.FIREBASE_STORAGE_BUCKET ||
    undefined;
  const storage = getStorage(app);
  const bucket = bucketName ? storage.bucket(bucketName) : storage.bucket();
  return { app, bucket };
}

export const RESOLVE_MANUAL_STORAGE_PREFIX =
  process.env.RESOLVE_MANUAL_STORAGE_PREFIX || "resolve-manual";

export const RESOLVE_MANUAL_LOCAL_DIR = resolve(
  process.cwd(),
  "data",
  "resolve-manual"
);
