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
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function hasVapidKey(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY?.trim());
}

export async function resolvePushSupportStatus(): Promise<PushSupportStatus> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }

  if (!hasVapidKey()) {
    return "missing_vapid";
  }

  if (isIosDevice() && !isStandalonePwa()) {
    return "ios_install_required";
  }

  try {
    const { isSupported } = await import("firebase/messaging");
    if (!(await isSupported())) return "unsupported";
  } catch {
    return "unsupported";
  }

  return "ready";
}

export function pushSupportMessage(status: PushSupportStatus): string {
  switch (status) {
    case "loading":
      return "Checking push notification support…";
    case "ready":
      return "Enable push on this device to get alerts under the app icon when clients sign or new users sign up.";
    case "missing_vapid":
      return "Push is not configured on the server (missing VAPID key). Contact your admin.";
    case "ios_install_required":
      return "On iPhone and iPad, add ShootSpine to your Home Screen first (Safari → Share → Add to Home Screen), then open the app from the icon and enable push here.";
    case "unsupported":
      return "Push notifications are not supported in this browser. Use Chrome, Edge, Firefox, or ShootSpine installed from your home screen on iOS 16.4+.";
    default:
      return "";
  }
}
