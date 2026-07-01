import { ProductionInspirationImage } from "@/lib/production/types";
import { ScriptInspirationImage, ScriptStoryboardFrame } from "@/lib/scriptWriter/types";

export type InspirationPoolItem = {
  id: string;
  imageUrl: string;
  storagePath?: string;
  tag?: string;
  label?: string;
};

export function buildInspirationPool(
  sessionImages: ScriptInspirationImage[],
  boardImages: ProductionInspirationImage[] = []
): InspirationPoolItem[] {
  const pool: InspirationPoolItem[] = [];
  for (const img of sessionImages) {
    pool.push({
      id: img.id,
      imageUrl: img.storageUrl,
      storagePath: img.storagePath,
      tag: img.tag,
      label: img.label,
    });
  }
  for (const img of boardImages) {
    if (pool.some((p) => p.imageUrl === img.imageUrl)) continue;
    pool.push({
      id: img.id,
      imageUrl: img.imageUrl,
      storagePath: img.storagePath,
      label: img.caption,
    });
  }
  return pool;
}

function preferredTagsForShotType(shotType: string): string[] {
  const key = shotType.toLowerCase();
  if (key.includes("wide") || key.includes("master")) return ["location", "mood", "lighting"];
  if (key.includes("close") || key.includes("insert")) return ["character_look", "lighting", "mood"];
  if (key.includes("reaction")) return ["character_look", "mood"];
  return ["location", "character_look", "mood", "lighting"];
}

export function pickInspirationForFrame(
  frame: ScriptStoryboardFrame,
  pool: InspirationPoolItem[],
  usedIds: Set<string>
): InspirationPoolItem | undefined {
  if (frame.inspirationImageId) {
    const explicit = pool.find((p) => p.id === frame.inspirationImageId);
    if (explicit) return explicit;
  }
  for (const tag of preferredTagsForShotType(frame.shotType)) {
    const match = pool.find((p) => p.tag === tag && !usedIds.has(p.id));
    if (match) return match;
  }
  return pool.find((p) => !usedIds.has(p.id));
}
