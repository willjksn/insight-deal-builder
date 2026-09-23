import { kitFromEquipmentCatalog } from "@/lib/contentPlan/gearKit";
import { getAdminDb } from "@/lib/firebase/admin";
import {
  SHOOTING_KIT_CATEGORY_LABELS,
  shootingKitHasGear,
  type ProductionShootingKit,
  type ShootingKitCategory,
} from "@/lib/production/shootingKit";
import type { EquipmentCatalogItem } from "@/lib/types";
import type { ShootGuide } from "@/lib/shootGuide/types";

const KIT_ORDER: ShootingKitCategory[] = [
  "cameraBodies",
  "lenses",
  "supports",
  "lights",
  "grip",
  "audio",
  "props",
  "other",
];

function formatOwnedKit(kit: ProductionShootingKit): string {
  const lines = [
    "OWNED EQUIPMENT — camera, lens, and support fields MUST use names from this list.",
  ];
  for (const cat of KIT_ORDER) {
    if (kit[cat].length) {
      lines.push(`${SHOOTING_KIT_CATEGORY_LABELS[cat]}: ${kit[cat].join(" · ")}`);
    }
  }
  return lines.join("\n");
}

export async function shootGuideGearPrompt(guide: ShootGuide): Promise<string> {
  if (!guide.useMyEquipment) {
    return [
      "No owned-kit lock. Recommend realistic small-crew cinema gear (one body, 1–3 lenses, simple support, 1–3 lights).",
      "Do not invent exotic rental packages, anamorphics, or lighting trucks.",
    ].join("\n");
  }
  const db = getAdminDb();
  if (!db) {
    return [
      "AVAILABLE GEAR CONSTRAINT is on, but the catalog could not be loaded.",
      "Use realistic small-crew cinema gear. Do not invent exotic rentals.",
    ].join("\n");
  }
  const snap = await db.collection("equipmentCatalog").limit(200).get();
  const items = snap.docs.map((doc) => {
    const data = doc.data() as EquipmentCatalogItem;
    return { ...data, id: doc.id, name: data.name, category: data.category, active: data.active };
  });
  const kit = kitFromEquipmentCatalog(items);
  if (!shootingKitHasGear(kit)) {
    return [
      "AVAILABLE GEAR CONSTRAINT is on, but the Equipment Catalog is empty.",
      "Use realistic small-crew cinema gear. Do not invent exotic rentals.",
    ].join("\n");
  }
  return formatOwnedKit(kit);
}
