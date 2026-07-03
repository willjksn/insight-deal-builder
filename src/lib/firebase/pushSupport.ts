export type PushSupportStatus =
  | "loading"
  | "ready"
  | "missing_vapid"
  | "ios_install_required"
  | "unsupported";

export function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function isStandalonePwa(): boolean {
  if (typeof window === "undefined") return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  if (nav.standalone === true) return true;
  return window.matchMedia(
    "(display-mode: standalone), (display-mode: fullscreen), (display-mode: minimal-ui)"
  ).matches;
}

export function hasVapidKey(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY?.trim());
}

/** Sync checks only — safe before Notification.requestPermission on iOS. */
export function quickPushPrecheck(): PushSupportStatus {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  if (!hasVapidKey()) return "missing_vapid";
  if (!("serviceWorker" in navigator)) return "unsupported";
  if (isIosDevice() && !isStandalonePwa()) return "ios_install_required";
  if (isIosDevice() && isStandalonePwa()) return "ready";
  return "ready";
}

export async function isFirebaseMessagingSupported(): Promise<boolean> {
  try {
    const { isSupported } = await import("firebase/messaging");
    return isSupported();
  } catch {
    return false;
  }
}

export async function resolvePushSupportStatus(): Promise<PushSupportStatus> {
  const quick = quickPushPrecheck();
  if (quick !== "ready") return quick;

  if (isIosDevice() && isStandalonePwa()) {
    return "ready";
  }

  if (!(await isFirebaseMessagingSupported())) return "unsupported";
  return "ready";
}

export function pushSupportMessage(status: PushSupportStatus): string {
  switch (status) {
    case "loading":
      return "Checking push notification support…";
    case "ready":
      return "Tap Enable push on this device. On iPhone/iPad you must allow notifications when iOS prompts you.";
    case "missing_vapid":
      return "Push is not configured on the server (missing VAPID key). Contact your admin.";
    case "ios_install_required":
      return "On iPhone and iPad, add ShootSpine to your Home Screen first (Safari → Share → Add to Home Screen), then open the app from the icon and enable push here.";
    case "unsupported":
      return "Push notifications are not supported in this browser. Use ShootSpine from your home screen on iOS 16.4+, or Chrome/Edge on desktop.";
    default:
      return "";
  }
}

export function permissionBlockedMessage(): string {
  if (isIosDevice()) {
    return "Notifications are blocked. Open iPad/iPhone Settings → Notifications → ShootSpine → Allow Notifications, then try again.";
  }
  return "Notification permission was blocked. Allow notifications in your browser site settings, then try again.";
}
