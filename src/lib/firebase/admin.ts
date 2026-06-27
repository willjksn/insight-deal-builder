import { cert, getApps, initializeApp, App } from "firebase-admin/app";
import { getAuth, Auth } from "firebase-admin/auth";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getMessaging, Messaging } from "firebase-admin/messaging";
import { getStorage, Storage } from "firebase-admin/storage";

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
  const existing = getApps();
  if (existing.length) {
    adminApp = existing[0];
    return adminApp;
  }

  const serviceAccount = loadServiceAccount();
  if (!serviceAccount) return null;

  try {
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
  return app ? getAuth(app) : null;
}

export function getAdminDb(): Firestore | null {
  const app = getAdminApp();
  return app ? getFirestore(app) : null;
}

export function getAdminMessaging(): Messaging | null {
  const app = getAdminApp();
  return app ? getMessaging(app) : null;
}

export function getAdminStorage(): Storage | null {
  const app = getAdminApp();
  return app ? getStorage(app) : null;
}

export function isAdminConfigured(): boolean {
  return getAdminApp() !== null;
}
