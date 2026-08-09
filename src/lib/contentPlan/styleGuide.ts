import type { ContentStyle } from "@/lib/contentPlan/types";

/** Style-specific execution guidance injected into generation prompts. */
export function contentStyleGuide(style: ContentStyle): string {
  switch (style) {
    case "ugc":
      return [
        "UGC: authentic, creator-led, social-first.",
        "Prefer natural camera placement, handheld or simple tripod, faster dialogue,",
        "minimal elaborate lighting changes, direct-to-camera when dialogue is used,",
        "social-first pacing. Keep instructions realistic for a small crew or solo shoot.",
      ].join(" ");
    case "cinematic_reel":
      return [
        "Cinematic: deliberate lenses, controlled blocking, lighting ratios,",
        "motivated lighting, foreground/background depth, detailed sound design,",
        "visual storytelling over talking-head filler.",
      ].join(" ");
    case "hybrid":
      return [
        "Hybrid UGC + Cinematic (preferred default): authentic creator performance",
        "plus cinematic inserts and polished product shots. Intentional camera movement,",
        "commercial sound design, natural social-media pacing.",
      ].join(" ");
    case "commercial":
      return "Commercial: polished brand storytelling, clear product hero, controlled lighting, intentional pacing, strong CTA.";
    case "brand_reel":
      return "Brand reel: identity-forward visuals, lifestyle moments, brandable hooks, clean product/logo moments.";
    case "lifestyle":
      return "Lifestyle: aspirational but believable environments, soft natural light bias, easy blocking.";
    case "product_ad":
      return "Product ad: product readability first, hero inserts, label orientation, benefit beats, CTA.";
    case "beauty":
      return "Beauty: flattering skin light, close-up detail, texture inserts, clean transitions into product.";
    case "fashion":
      return "Fashion: silhouette, movement, fabric detail, stronger composition and controlled motion.";
    case "documentary":
      return "Documentary: observational coverage, motivated camera, interview/VO options, truth-first framing.";
    case "narrative":
      return "Narrative: character beats, motivated coverage, continuity-critical blocking.";
    case "horror_suspense":
      return "Horror/suspense: tension pacing, negative space, motivated darkness, sound-forward scares.";
    case "short_film":
      return "Short film: scene structure, coverage masters + inserts, emotional arc over CTA.";
    case "custom":
    default:
      return "Custom: follow the user's idea closely; prefer practical, executable direction.";
  }
}
