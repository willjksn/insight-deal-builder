"use client";

import { useCallback, useEffect, useState } from "react";
import { getCollection } from "@/lib/firebase/firestore";
import { LocationCatalogItem } from "@/lib/types";

export function useLocationCatalog() {
  const [data, setData] = useState<LocationCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await getCollection<LocationCatalogItem>("locationCatalog");
      setData(items.filter((item) => item.active !== false));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load location catalog");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}
