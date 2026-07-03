"use client";

import { useCallback, useEffect, useState } from "react";
import { arrayUnion, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import {
  registerPushTokenAfterPermission,
  PushRegistrationError,
  subscribeForegroundPush,
} from "@/lib/firebase/messaging";
import { collectPushDiagnostics, type PushDiagnostics } from "@/lib/firebase/pushDiagnostics";
import {
  isIosDevice,
  isStandalonePwa,
  permissionBlockedMessage,
  pushSupportMessage,
  quickPushPrecheck,
  resolvePushSupportStatus,
  type PushSupportStatus,
} from "@/lib/firebase/pushSupport";
import { useAuth } from "@/contexts/AuthContext";

export function usePushNotifications() {
  const { user, appUser, refreshProfile } = useAuth();
  const [pushStatus, setPushStatus] = useState<PushSupportStatus>("loading");
  const [pushEnabled, setPushEnabled] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<PushDiagnostics | null>(null);

  useEffect(() => {
    setPushEnabled((appUser?.fcmTokens?.length ?? 0) > 0);
  }, [appUser?.fcmTokens]);

  useEffect(() => {
    let cancelled = false;

    const refresh = () => {
      resolvePushSupportStatus().then((status) => {
        if (!cancelled) setPushStatus(status);
      });
      collectPushDiagnostics().then((d) => {
        if (!cancelled) setDiagnostics(d);
      });
    };

    refresh();

    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;

    let unsubscribe = () => {};
    subscribeForegroundPush((title, body, url) => {
      if (Notification.permission === "granted") {
        const n = new Notification(title, { body, icon: "/brand/shootspine-icon-192.png" });
        n.onclick = () => {
          window.focus();
          if (url) window.location.href = url.startsWith("http") ? url : url;
        };
      }
    }).then((unsub) => {
      unsubscribe = unsub;
    });

    return () => unsubscribe();
  }, []);

  const enablePush = useCallback(async () => {
    if (!user || !db) return false;
    setRegistering(true);
    setError(null);

    const precheck = quickPushPrecheck();
    setPushStatus(precheck);
    if (precheck !== "ready") {
      setError(pushSupportMessage(precheck));
      setRegistering(false);
      return false;
    }

    let permission = Notification.permission;
    if (permission === "default") {
      permission = await Notification.requestPermission();
    }

    if (permission !== "granted") {
      setError(permission === "denied" ? permissionBlockedMessage() : "Notification permission was not granted.");
      setRegistering(false);
      void collectPushDiagnostics().then(setDiagnostics);
      return false;
    }

    try {
      const token = await registerPushTokenAfterPermission();
      await updateDoc(doc(db, "users", user.uid), {
        fcmTokens: arrayUnion(token),
        notifyPush: true,
      });
      await refreshProfile();
      setPushEnabled(true);
      setError(null);
      void collectPushDiagnostics().then(setDiagnostics);
      return true;
    } catch (err) {
      const message =
        err instanceof PushRegistrationError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to enable push notifications";
      setError(message);
      void collectPushDiagnostics().then(setDiagnostics);
      return false;
    } finally {
      setRegistering(false);
    }
  }, [user, refreshProfile]);

  const setNotifyEmail = useCallback(
    async (enabled: boolean) => {
      if (!user || !db) return;
      await updateDoc(doc(db, "users", user.uid), { notifyEmail: enabled });
      await refreshProfile();
    },
    [user, refreshProfile]
  );

  const setNotifyPushPref = useCallback(
    async (enabled: boolean) => {
      if (!user || !db) return;
      await updateDoc(doc(db, "users", user.uid), { notifyPush: enabled });
      await refreshProfile();
    },
    [user, refreshProfile]
  );

  return {
    pushStatus,
    pushSupportMessage: pushSupportMessage(pushStatus),
    pushSupported: pushStatus === "ready" || pushStatus === "ios_install_required",
    pushEnabled,
    registering,
    error,
    diagnostics,
    notifyEmail: appUser?.notifyEmail !== false,
    notifyPush: appUser?.notifyPush !== false,
    isStandalonePwa: isStandalonePwa(),
    isIosDevice: isIosDevice(),
    enablePush,
    setNotifyEmail,
    setNotifyPushPref,
  };
}
