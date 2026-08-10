import { contentStyleHintFromDeliverable } from "@/lib/contentPlan/pitchStyleHint";
import type {
  ContentPlanPitchIdea,
  PitchDeliverableTarget,
} from "@/lib/contentPlan/pitchTypes";
import type { ContentStyle } from "@/lib/contentPlan/types";

const STYLES = new Set<ContentStyle>([
  "ugc",
  "cinematic_reel",
  "hybrid",
  "commercial",
  "brand_reel",
  "lifestyle",
  "product_ad",
  "beauty",
  "fashion",
  "documentary",
  "narrative",
  "horror_suspense",
  "short_film",
  "custom",
]);

function asStyle(value: unknown, fallback: ContentStyle): ContentStyle {
  if (typeof value === "string" && STYLES.has(value as ContentStyle)) {
    return value as ContentStyle;
  }
  return fallback;
}

/**
 * Parse AI JSON into pitch one-liners, aligned to requested deliverable targets.
 */
export function parsePitchIdeasResponse(
  raw: unknown,
  targets: PitchDeliverableTarget[]
): ContentPlanPitchIdea[] {
  const root =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray(root.ideas)
      ? root.ideas
      : [];

  const needed: string[] = [];
  for (const t of targets) {
    for (let i = 0; i < t.count; i++) needed.push(t.deliverableName);
  }

  const ideas: ContentPlanPitchIdea[] = [];
  for (let i = 0; i < needed.length; i++) {
    const deliverableName = needed[i];
    const item =
      list[i] && typeof list[i] === "object"
        ? (list[i] as Record<string, unknown>)
        : {};
    const oneLiner = String(item.oneLiner || item.hook || item.idea || "").trim();
    const title = String(item.title || "").trim();
    const fallbackStyle = contentStyleHintFromDeliverable(deliverableName);
    ideas.push({
      id: crypto.randomUUID(),
      oneLiner:
        oneLiner ||
        `${deliverableName} concept for the client — ${i + 1}`,
      title: title || undefined,
      deliverableName: String(item.deliverableName || deliverableName).trim() || deliverableName,
      contentStyleHint: asStyle(item.contentStyleHint, fallbackStyle),
      status: "new",
      contentPlanId: null,
    });
  }
  return ideas;
}
