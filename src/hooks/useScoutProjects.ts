"use client";

import { useState, useEffect, useCallback } from "react";
import { ScoutProject } from "@/lib/scout/types";

export function useScoutProjects(userId: string | undefined, getToken?: () => Promise<string>) {
  const [data, setData] = useState<ScoutProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId || !getToken) {
      setData([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const res = await fetch("/api/scout/projects", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load scout sessions");
      setData(json.projects as ScoutProject[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load scout sessions");
    } finally {
      setLoading(false);
    }
  }, [userId, getToken]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}
