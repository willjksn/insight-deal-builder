"use client";

import { getToken, isSupported, onMessage, Messaging } from "firebase/messaging";
import { APP_NAME } from "@/lib/brand";
import { app, isFirebaseConfigured } from "@/lib/firebase/config";
import { hasVapidKey } from "@/lib/firebase/pushSupport";

let messagingInstance: Messaging | null = null;
let messagingInit: Promise<Messaging | null> | null = null;

async function loadMessaging(appInstance: NonNullable<typeof app>): Promise<Messaging | null> {
  if (!(await isSupported())) return null;
  const { getMessaging } = await import("firebase/messaging");
  return getMessaging(appInstance);
}

export async function getFirebaseMessaging(): Promise<Messaging | null> {
  if (typeof window === "undefined" || !isFirebaseConfigured || !app) return null;

  if (messagingInstance) return messagingInstance;
  if (!messagingInit) {
    messagingInit = loadMessaging(app).then((instance) => {
      messagingInstance = instance;
      return instance;
    });
  }
  return messagingInit;
}

export class PushRegistrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PushRegistrationError";
  }
}

export async function registerPushToken(): Promise<string> {
  if (!hasVapidKey()) {
    throw new PushRegistrationError(
      "Push notifications are not configured (missing VAPID key on the server)."
    );
  }

  if (!(await isSupported())) {
    throw new PushRegistrationError(
      "Push notifications are not supported in this browser. On iPhone/iPad, add ShootSpine to your Home Screen first."
    );
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new PushRegistrationError(
      permission === "denied"
        ? "Notification permission was blocked. Allow notifications in your browser or device settings."
        : "Notification permission was not granted."
    );
  }

  const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js", {
    scope: "/",
  });
  await navigator.serviceWorker.ready;

  const messaging = await getFirebaseMessaging();
  if (!messaging) {
    throw new PushRegistrationError("Could not initialize push messaging.");
  }

  const token = await getToken(messaging, {
    vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY!,
    serviceWorkerRegistration: registration,
  });

  if (!token) {
    throw new PushRegistrationError("Could not register this device for push notifications.");
  }

  return token;
}

export async function subscribeForegroundPush(
  onPayload: (title: string, body: string, url?: string) => void
): Promise<() => void> {
  const messaging = await getFirebaseMessaging();
  if (!messaging) return () => {};

  return onMessage(messaging, (payload) => {
    const title = payload.notification?.title || APP_NAME;
    const body = payload.notification?.body || "";
    const url = payload.data?.url;
    onPayload(title, body, url);
  });
}
