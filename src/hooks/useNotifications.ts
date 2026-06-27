"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/lib/firebase/config";
import { updateDocument } from "@/lib/firebase/firestore";
import { AppNotification } from "@/lib/types";

export function useNotifications(userId?: string, company?: string) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigured || !db || (!userId && !company)) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    const unsubs: (() => void)[] = [];
    const byId = new Map<string, AppNotification>();

    const merge = () => {
      const merged = Array.from(byId.values()).sort((a, b) => {
        const aMs = a.createdAt?.toMillis?.() ?? 0;
        const bMs = b.createdAt?.toMillis?.() ?? 0;
        return bMs - aMs;
      });
      setNotifications(merged.slice(0, 30));
      setLoading(false);
    };

    if (userId) {
      const q = query(
        collection(db, "notifications"),
        where("userId", "==", userId),
        orderBy("createdAt", "desc"),
        limit(20)
      );
      unsubs.push(
        onSnapshot(
          q,
          (snap) => {
            snap.docs.forEach((d) => byId.set(d.id, { id: d.id, ...d.data() } as AppNotification));
            merge();
          },
          () => setLoading(false)
        )
      );
    }

    if (company) {
      const q = query(
        collection(db, "notifications"),
        where("companyRecipient", "==", company),
        orderBy("createdAt", "desc"),
        limit(20)
      );
      unsubs.push(
        onSnapshot(
          q,
          (snap) => {
            snap.docs.forEach((d) => byId.set(d.id, { id: d.id, ...d.data() } as AppNotification));
            merge();
          },
          () => setLoading(false)
        )
      );
    }

    return () => unsubs.forEach((u) => u());
  }, [userId, company]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const markRead = useCallback(async (notificationId: string) => {
    await updateDocument("notifications", notificationId, { read: true });
  }, []);

  const markAllRead = useCallback(async () => {
    const unread = notifications.filter((n) => !n.read);
    await Promise.all(unread.map((n) => updateDocument("notifications", n.id, { read: true })));
  }, [notifications]);

  return { notifications, unreadCount, loading, markRead, markAllRead };
}
