"use client";

import { getToken, onMessage, Messaging } from "firebase/messaging";
import { APP_NAME } from "@/lib/brand";
import { app, isFirebaseConfigured } from "@/lib/firebase/config";
import {
  hasVapidKey,
  isFirebaseMessagingSupported,
  isIosDevice,
  isStandalonePwa,
} from "@/lib/firebase/pushSupport";

let messagingInstance: Messaging | null = null;
let messagingInit: Promise<Messaging | null> | null = null;

async function loadMessaging(appInstance: NonNullable<typeof app>): Promise<Messaging | null> {
  if (isIosDevice() && isStandalonePwa()) {
    const { getMessaging } = await import("firebase/messaging");
    return getMessaging(appInstance);
  }
  if (!(await isFirebaseMessagingSupported())) return null;
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

function mapFirebaseMessagingError(err: unknown): string {
  const code = (err as { code?: string })?.code ?? "";
  const message = err instanceof Error ? err.message : String(err);

  if (code === "messaging/permission-blocked" || message.includes("permission-blocked")) {
    return "Notifications are blocked. On iPad/iPhone: Settings → Notifications → ShootSpine → Allow Notifications.";
  }
  if (code === "messaging/unsupported-browser" || message.includes("unsupported-browser")) {
    return "This browser cannot use push. Open ShootSpine from your home screen icon (not Safari).";
  }
  if (code === "messaging/failed-service-worker-registration") {
    return "Could not register the notification service. Try closing the app completely and reopening from the home screen.";
  }
  if (message.includes("Notification") && message.includes("not defined")) {
    return "Notifications are only available when ShootSpine is opened from your home screen icon.";
  }
  return message || "Could not register this device for push notifications.";
}

/** Call only after Notification.permission === "granted". */
export async function registerPushTokenAfterPermission(): Promise<string> {
  if (!hasVapidKey()) {
    throw new PushRegistrationError(
      "Push notifications are not configured (missing VAPID key on the server)."
    );
  }

  if (Notification.permission !== "granted") {
    throw new PushRegistrationError("Notification permission is not granted.");
  }

  let registration: ServiceWorkerRegistration | undefined;
  try {
    registration = await navigator.serviceWorker.getRegistration("/");
    if (!registration) {
      registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js", {
        scope: "/",
        updateViaCache: "none",
      });
    } else {
      await registration.update();
    }
    await navigator.serviceWorker.ready;
  } catch (err) {
    throw new PushRegistrationError(mapFirebaseMessagingError(err));
  }

  const messaging = await getFirebaseMessaging();
  if (!messaging) {
    throw new PushRegistrationError(
      isIosDevice()
        ? "Push messaging could not start. Open ShootSpine from your home screen icon, not Safari."
        : "Could not initialize push messaging in this browser."
    );
  }

  try {
    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY!,
      serviceWorkerRegistration: registration,
    });

    if (!token) {
      throw new PushRegistrationError(
        "Could not get a push token. If you previously denied notifications, enable them in Settings and try again."
      );
    }

    return token;
  } catch (err) {
    throw new PushRegistrationError(mapFirebaseMessagingError(err));
  }
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
