"use client";

import { useCallback, useEffect, useState } from "react";
import { arrayUnion, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { registerPushToken, PushRegistrationError, subscribeForegroundPush } from "@/lib/firebase/messaging";
import {
  isStandalonePwa,
  pushSupportMessage,
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

  useEffect(() => {
    setPushEnabled((appUser?.fcmTokens?.length ?? 0) > 0);
  }, [appUser?.fcmTokens]);

  useEffect(() => {
    let cancelled = false;
    resolvePushSupportStatus().then((status) => {
      if (!cancelled) setPushStatus(status);
    });
    return () => {
      cancelled = true;
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
    try {
      const status = await resolvePushSupportStatus();
      setPushStatus(status);
      if (status !== "ready") {
        setError(pushSupportMessage(status));
        return false;
      }

      const token = await registerPushToken();
      await updateDoc(doc(db, "users", user.uid), {
        fcmTokens: arrayUnion(token),
        notifyPush: true,
      });
      await refreshProfile();
      setPushEnabled(true);
      return true;
    } catch (err) {
      const message =
        err instanceof PushRegistrationError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to enable push notifications";
      setError(message);
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
      if (enabled && !pushEnabled) {
        await enablePush();
      }
    },
    [user, refreshProfile, pushEnabled, enablePush]
  );

  return {
    pushStatus,
    pushSupportMessage: pushSupportMessage(pushStatus),
    pushSupported: pushStatus === "ready" || pushStatus === "ios_install_required",
    pushEnabled,
    registering,
    error,
    notifyEmail: appUser?.notifyEmail !== false,
    notifyPush: appUser?.notifyPush !== false,
    isStandalonePwa: isStandalonePwa(),
    enablePush,
    setNotifyEmail,
    setNotifyPushPref,
  };
}
