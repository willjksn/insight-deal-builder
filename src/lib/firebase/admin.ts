import type { App } from "firebase-admin/app";
import type { Auth } from "firebase-admin/auth";
import type { Firestore } from "firebase-admin/firestore";
import type { Messaging } from "firebase-admin/messaging";
import type { Storage } from "firebase-admin/storage";

function loadServiceAccount(): Record<string, string> | null {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (json) {
    try {
      return JSON.parse(json);
    } catch {
      console.error("Invalid FIREBASE_SERVICE_ACCOUNT_JSON");
      return null;
    }
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (projectId && clientEmail && privateKey) {
    return { project_id: projectId, client_email: clientEmail, private_key: privateKey };
  }

  return null;
}

let adminApp: App | undefined;
let adminInitFailed = false;

export function getAdminApp(): App | null {
  if (adminInitFailed) return null;
  if (adminApp) return adminApp;

  const serviceAccount = loadServiceAccount();
  if (!serviceAccount) return null;

  try {
    // Lazy require keeps firebase-admin out of the module graph until first use (Vercel serverless).
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { cert, getApps, initializeApp } = require("firebase-admin/app") as typeof import("firebase-admin/app");

    const existing = getApps();
    if (existing.length) {
      adminApp = existing[0];
      return adminApp;
    }

    adminApp = initializeApp({
      credential: cert(serviceAccount as Parameters<typeof cert>[0]),
      storageBucket:
        process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
        process.env.FIREBASE_STORAGE_BUCKET ||
        `${serviceAccount.project_id}.appspot.com`,
    });
    return adminApp;
  } catch (err) {
    adminInitFailed = true;
    console.error("Firebase Admin initialization failed:", err);
    return null;
  }
}

export function getAdminAuth(): Auth | null {
  const app = getAdminApp();
  if (!app) return null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getAuth } = require("firebase-admin/auth") as typeof import("firebase-admin/auth");
  return getAuth(app);
}

export function getAdminDb(): Firestore | null {
  const app = getAdminApp();
  if (!app) return null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getFirestore } = require("firebase-admin/firestore") as typeof import("firebase-admin/firestore");
  return getFirestore(app);
}

export function getAdminMessaging(): Messaging | null {
  const app = getAdminApp();
  if (!app) return null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getMessaging } = require("firebase-admin/messaging") as typeof import("firebase-admin/messaging");
  return getMessaging(app);
}

export function getAdminStorage(): Storage | null {
  const app = getAdminApp();
  if (!app) return null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getStorage } = require("firebase-admin/storage") as typeof import("firebase-admin/storage");
  return getStorage(app);
}

export function isAdminConfigured(): boolean {
  return getAdminApp() !== null;
}
