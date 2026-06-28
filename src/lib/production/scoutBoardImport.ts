import { ScoutPreview, ScoutProject } from "@/lib/scout/types";
import { ProductionInspirationImage } from "@/lib/production/types";
import { mergeGearItems } from "@/lib/production/gearImport";

export function gearItemsFromScoutSession(scout: ScoutProject): string[] {
  const items: string[] = [];
  const push = (label: string, value?: string) => {
    const v = value?.trim();
    if (v) items.push(`${label}: ${v}`);
  };

  push("Camera", scout.cameraBody);
  push("Lenses", scout.lensOptions);
  push("Lighting", scout.lightingGear);
  push("Audio", scout.audioGear);
  push("Stabilization", scout.stabilizationGear);

  const cam = scout.latestDpPlan?.cameraSettings;
  if (cam) {
    push("DP camera", cam.cameraBodyRecommendation);
    push("DP lens", cam.lensRecommendation);
    push("Stabilization", cam.stabilizationRecommendation);
  }

  return items;
}

export function scoutSceneNotes(scout: ScoutProject): string {
  const parts = [
    scout.projectName?.trim(),
    scout.sceneIdea?.trim(),
    scout.theme?.trim(),
    scout.creativeBrief?.subjectAction?.trim(),
    scout.latestAnalysis?.bestAngle?.reasonBestAngle?.trim(),
  ].filter(Boolean);
  return parts.join("\n\n");
}

export function inspirationFromScoutPreviews(
  existing: ProductionInspirationImage[],
  previews: ScoutPreview[]
): ProductionInspirationImage[] {
  const seen = new Set(existing.map((i) => i.imageUrl));
  let sortOrder = existing.length;
  const added: ProductionInspirationImage[] = [];

  for (const preview of previews) {
    const url = preview.imageUrl?.trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    added.push({
      id: crypto.randomUUID(),
      imageUrl: url,
      sourceUrl: url,
      caption: preview.shotLabel || preview.type.replace(/_/g, " "),
      sortOrder: sortOrder++,
    });
  }

  return [...existing, ...added];
}

export function importGearFromScoutSession(existing: string[], scout: ScoutProject): string[] {
  return mergeGearItems(existing, gearItemsFromScoutSession(scout));
}

export function trackLinkedScoutIds(existing: string[], scoutId: string): string[] {
  if (existing.includes(scoutId)) return existing;
  return [...existing, scoutId];
}

export function musicEmbedUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.replace(/^www\./, "");

    if (host === "open.spotify.com") {
      const path = parsed.pathname.replace("/embed/", "/");
      return `https://open.spotify.com/embed${path}${parsed.search}`;
    }
    if (host === "youtube.com" || host === "m.youtube.com") {
      const id = parsed.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    if (host === "youtu.be") {
      const id = parsed.pathname.replace(/^\//, "");
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
  } catch {
    return null;
  }
  return null;
}
