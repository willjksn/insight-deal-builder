"use client";

import { useState, useEffect, useCallback } from "react";
import { getCollection } from "@/lib/firebase/firestore";
import { ServicePackage } from "@/lib/types";
import { SERVICE_PACKAGE_PRESETS } from "@/lib/constants/presets";
import { presetToServicePackage } from "@/lib/agreement/packages";

/** Firestore packages, falling back to built-in presets when none exist */
export function useServicePackages() {
  const [data, setData] = useState<ServicePackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromFirestore, setFromFirestore] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const items = await getCollection<ServicePackage>("servicePackages");
      const active = items.filter((p) => p.active !== false);
      if (active.length > 0) {
        setData(active);
        setFromFirestore(true);
      } else {
        setData(
          SERVICE_PACKAGE_PRESETS.map((preset, i) => ({
            id: `preset-${i}`,
            ...presetToServicePackage(preset),
            createdAt: null as unknown as ServicePackage["createdAt"],
            updatedAt: null as unknown as ServicePackage["updatedAt"],
          }))
        );
        setFromFirestore(false);
      }
    } catch {
      setData(
        SERVICE_PACKAGE_PRESETS.map((preset, i) => ({
          id: `preset-${i}`,
          ...presetToServicePackage(preset),
          createdAt: null as unknown as ServicePackage["createdAt"],
          updatedAt: null as unknown as ServicePackage["updatedAt"],
        }))
      );
      setFromFirestore(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, fromFirestore, refresh };
}
