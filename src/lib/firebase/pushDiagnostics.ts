import { hasVapidKey, isIosDevice, isStandalonePwa } from "@/lib/firebase/pushSupport";

export type PushDiagnostics = {
  ios: boolean;
  standalone: boolean;
  notificationApi: boolean;
  notificationPermission: NotificationPermission | "unavailable";
  serviceWorker: boolean;
  pushManager: boolean;
  vapidConfigured: boolean;
  serviceWorkerState: string;
};

export async function collectPushDiagnostics(): Promise<PushDiagnostics> {
  const notificationPermission =
    typeof window !== "undefined" && "Notification" in window
      ? Notification.permission
      : "unavailable";

  let serviceWorkerState = "unavailable";
  if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
    try {
      const reg = await navigator.serviceWorker.getRegistration("/");
      serviceWorkerState = reg?.active?.state ?? reg?.installing?.state ?? reg?.waiting?.state ?? "none";
    } catch {
      serviceWorkerState = "error";
    }
  }

  return {
    ios: isIosDevice(),
    standalone: isStandalonePwa(),
    notificationApi: typeof window !== "undefined" && "Notification" in window,
    notificationPermission,
    serviceWorker: typeof navigator !== "undefined" && "serviceWorker" in navigator,
    pushManager: typeof window !== "undefined" && "PushManager" in window,
    vapidConfigured: hasVapidKey(),
    serviceWorkerState,
  };
}
