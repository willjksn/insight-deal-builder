"use client";

import { useState, useEffect, useCallback } from "react";
import { getScoutProjectsForUser } from "@/lib/firebase/scoutFirestore";
import { ScoutProject } from "@/lib/scout/types";

export function useScoutProjects(userId: string | undefined) {
  const [data, setData] = useState<ScoutProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) {
      setData([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const items = await getScoutProjectsForUser(userId);
      setData(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load scout sessions");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}
