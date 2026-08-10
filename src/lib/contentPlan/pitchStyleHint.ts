import type { ContentStyle } from "@/lib/contentPlan/types";

/** Heuristic style from package deliverable name. */
export function contentStyleHintFromDeliverable(name: string): ContentStyle {
  const n = name.toLowerCase();
  if (n.includes("cinematic") || n.includes("promo") || n.includes("brand film")) {
    return "cinematic_reel";
  }
  if (n.includes("ugc") || n.includes("testimonial") || n.includes("talking head")) {
    return "ugc";
  }
  if (n.includes("product") || n.includes("ad")) return "product_ad";
  if (n.includes("beauty")) return "beauty";
  if (n.includes("fashion")) return "fashion";
  if (n.includes("commercial")) return "commercial";
  if (n.includes("reel") || n.includes("social")) return "brand_reel";
  return "hybrid";
}
