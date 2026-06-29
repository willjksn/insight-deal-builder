"use client";

import { useState, useEffect, useCallback } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import { ScoutProject } from "@/lib/scout/types";

/** Scout sessions visible to the signed-in user (owned, shared, or linked project access). */
export function useScoutProjects(userId: string | undefined, enabled = true) {
  const [data, setData] = useState<ScoutProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);

  useEffect(() => {
    if (!enabled || !userId || !auth) {
      setData((prev) => (prev.length === 0 ? prev : []));
      setLoading(false);
      setError(null);
      return;
    }

    const authClient = auth;
    let cancelled = false;

    const fetchProjects = async () => {
      const currentUser = authClient.currentUser;
      if (!currentUser || currentUser.uid !== userId) return;

      setLoading(true);
      setError(null);
      try {
        const token = await currentUser.getIdToken();
        const res = await fetch("/api/scout/projects", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to load scout sessions");
        if (!cancelled) setData(json.projects as ScoutProject[]);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load scout sessions");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const unsubscribe = onAuthStateChanged(authClient, (firebaseUser) => {
      if (cancelled) return;
      if (firebaseUser?.uid === userId) {
        void fetchProjects();
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [userId, enabled, reloadNonce]);

  const refresh = useCallback(() => {
    setReloadNonce((n) => n + 1);
  }, []);

  return { data, loading, error, refresh };
}
