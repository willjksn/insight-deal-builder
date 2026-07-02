"use client";

import { useCallback, useEffect, useState } from "react";
import { arrayUnion, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { subscribeForegroundPush, registerPushToken } from "@/lib/firebase/messaging";
import { useAuth } from "@/contexts/AuthContext";

export function usePushNotifications() {
  const { user, appUser, refreshProfile } = useAuth();
  const [pushSupported, setPushSupported] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPushEnabled((appUser?.fcmTokens?.length ?? 0) > 0);
  }, [appUser?.fcmTokens]);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    setPushSupported(true);

    let unsubscribe = () => {};
    subscribeForegroundPush((title, body, url) => {
      if (Notification.permission === "granted") {
        const n = new Notification(title, { body, icon: "/brand/shootspine-icon-32.png" });
        n.onclick = () => {
          window.focus();
          if (url) window.location.href = url;
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
      const token = await registerPushToken();
      if (!token) {
        setError("Push permission was denied or not supported in this browser.");
        return false;
      }
      await updateDoc(doc(db, "users", user.uid), {
        fcmTokens: arrayUnion(token),
        notifyPush: true,
      });
      await refreshProfile();
      setPushEnabled(true);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to enable push notifications");
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
    pushSupported,
    pushEnabled,
    registering,
    error,
    notifyEmail: appUser?.notifyEmail !== false,
    notifyPush: appUser?.notifyPush !== false,
    enablePush,
    setNotifyEmail,
    setNotifyPushPref,
  };
}
