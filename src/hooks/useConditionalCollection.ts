"use client";

import { useState, useEffect, useCallback } from "react";
import { getCollection } from "@/lib/firebase/firestore";

export function useConditionalCollection<T>(collectionName: string, enabled: boolean) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setData([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const items = await getCollection<T>(collectionName);
      setData(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [collectionName, enabled]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}
