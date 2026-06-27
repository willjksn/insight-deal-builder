import { useState, useEffect, useCallback } from "react";
import { getCollection } from "@/lib/firebase/firestore";
import { EquipmentCatalogItem } from "@/lib/types";
import { EQUIPMENT_CATALOG_PRESETS } from "@/lib/constants/presets";

export function useEquipmentCatalog() {
  const [data, setData] = useState<EquipmentCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromFirestore, setFromFirestore] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const items = await getCollection<EquipmentCatalogItem>("equipmentCatalog");
      const active = items.filter((p) => p.active !== false);
      if (active.length > 0) {
        setData(active);
        setFromFirestore(true);
      } else {
        setData(
          EQUIPMENT_CATALOG_PRESETS.map((preset, i) => ({
            id: `preset-${i}`,
            ...preset,
            createdAt: null as unknown as EquipmentCatalogItem["createdAt"],
            updatedAt: null as unknown as EquipmentCatalogItem["updatedAt"],
          }))
        );
        setFromFirestore(false);
      }
    } catch {
      setData(
        EQUIPMENT_CATALOG_PRESETS.map((preset, i) => ({
          id: `preset-${i}`,
          ...preset,
          createdAt: null as unknown as EquipmentCatalogItem["createdAt"],
          updatedAt: null as unknown as EquipmentCatalogItem["updatedAt"],
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
