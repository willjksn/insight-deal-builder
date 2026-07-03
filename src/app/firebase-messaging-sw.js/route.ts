import { NextResponse } from "next/server";
import { APP_NAME, BRAND_ICON_192_PATH } from "@/lib/brand";

export async function GET() {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  const body = `
importScripts("https://www.gstatic.com/firebasejs/11.6.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/11.6.0/firebase-messaging-compat.js");
firebase.initializeApp(${JSON.stringify(config)});
const messaging = firebase.messaging();
messaging.onBackgroundMessage(function(payload) {
  const title = payload.notification?.title || ${JSON.stringify(APP_NAME)};
  const options = {
    body: payload.notification?.body || "",
    icon: ${JSON.stringify(BRAND_ICON_192_PATH)},
    data: payload.data || {},
  };
  self.registration.showNotification(title, options);
});
self.addEventListener("notificationclick", function(event) {
  event.notification.close();
  const rawUrl = event.notification.data?.url || "/dashboard";
  const target = rawUrl.startsWith("http") ? rawUrl : new URL(rawUrl, self.location.origin).href;
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function(clientList) {
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(target);
    })
  );
});
`.trim();

  return new Response(body, {
    headers: {
      "Content-Type": "application/javascript",
      "Service-Worker-Allowed": "/",
    },
  });
}
