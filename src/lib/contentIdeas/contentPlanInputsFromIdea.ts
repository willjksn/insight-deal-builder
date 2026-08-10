import type {
  ContentIdea,
  IdeaGenerationInputs,
} from "@/lib/contentIdeas/types";
import {
  defaultContentPlanInputs,
  defaultOrientationForPlatform,
  type ContentDurationPreset,
  type ContentEnergy,
  type ContentPlanInputs,
  type ContentPlatform,
  type ContentStyle,
} from "@/lib/contentPlan/types";

/** Client-safe seed text (mirrors ideaToConceptDocument without server imports). */
export function ideaSeedTextForContentPlan(idea: ContentIdea): string {
  return [
    `# ${idea.title}`,
    "",
    idea.hook,
    "",
    idea.summary,
    "",
    idea.creative?.coreIdea ? `Core idea: ${idea.creative.coreIdea}` : "",
    idea.creative?.storyStructure ? `Structure: ${idea.creative.storyStructure}` : "",
    idea.creative?.visualStyle ? `Visual: ${idea.creative.visualStyle}` : "",
    idea.production?.recommendedLocation
      ? `Location: ${idea.production.recommendedLocation}`
      : "",
    idea.production?.cameraApproach
      ? `Camera: ${idea.production.cameraApproach}`
      : "",
    idea.production?.lightingConcept
      ? `Lighting: ${idea.production.lightingConcept}`
      : "",
    idea.production?.audioApproach ? `Audio: ${idea.production.audioApproach}` : "",
    idea.deliverables?.heroVideo ? `Deliverables: ${idea.deliverables.heroVideo}` : "",
  ]
    .filter(Boolean)
    .join("\n")
    .trim();
}

function mapPlatform(raw?: string): ContentPlatform {
  const s = (raw || "").toLowerCase();
  if (s.includes("tiktok")) return "tiktok";
  if (s.includes("youtube short") || s.includes("shorts")) return "youtube_short";
  if (s.includes("youtube")) return "youtube";
  if (s.includes("paid") || s.includes("ads")) return "paid_social";
  if (s.includes("commercial") || s.includes("tv")) return "commercial";
  if (s.includes("website") || s.includes("web")) return "website";
  if (s.includes("instagram") || s.includes("reel")) return "instagram_reel";
  return "instagram_reel";
}

function mapStyle(idea: ContentIdea, inputs?: IdeaGenerationInputs): ContentStyle {
  const hay = [
    idea.recommendedFormat,
    idea.creative?.visualStyle,
    ...(inputs?.lookTags || []),
    ...(inputs?.contentFormats || []),
    ...(idea.tags || []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (hay.includes("horror") || hay.includes("suspense")) return "horror_suspense";
  if (hay.includes("beauty") || hay.includes("makeup")) return "beauty";
  if (hay.includes("fashion")) return "fashion";
  if (hay.includes("product")) return "product_ad";
  if (hay.includes("documentary")) return "documentary";
  if (hay.includes("narrative") || hay.includes("short_film") || hay.includes("short film")) {
    return "short_film";
  }
  if (hay.includes("commercial") || hay.includes("brand film")) return "commercial";
  if (hay.includes("lifestyle")) return "lifestyle";
  if (hay.includes("ugc") || hay.includes("talking_head") || hay.includes("talking head")) {
    return "ugc";
  }
  if (hay.includes("cinematic")) return "cinematic_reel";
  if (hay.includes("brand")) return "brand_reel";
  return "hybrid";
}

function mapDuration(idea: ContentIdea, inputs?: IdeaGenerationInputs): {
  durationPreset: ContentDurationPreset;
  durationSeconds: number;
} {
  const len = `${idea.estimatedLength || ""} ${inputs?.timeAvailable || ""}`.toLowerCase();
  if (len.includes("15")) return { durationPreset: "15", durationSeconds: 15 };
  if (len.includes("45")) return { durationPreset: "45", durationSeconds: 45 };
  if (len.includes("90")) return { durationPreset: "90", durationSeconds: 90 };
  if (len.includes("60") || len.includes("1 min")) {
    return { durationPreset: "60", durationSeconds: 60 };
  }
  if (len.includes("30")) return { durationPreset: "30", durationSeconds: 30 };
  return { durationPreset: "30", durationSeconds: 30 };
}

function mapEnergy(inputs?: IdeaGenerationInputs): ContentEnergy {
  const hay = [...(inputs?.toneTags || []), ...(inputs?.lookTags || [])]
    .join(" ")
    .toLowerCase();
  if (hay.includes("energetic") || hay.includes("high energy")) return "energetic";
  if (hay.includes("luxury") || hay.includes("premium")) return "luxury";
  if (hay.includes("playful") || hay.includes("funny")) return "playful";
  if (hay.includes("suspense") || hay.includes("horror")) return "suspenseful";
  if (hay.includes("emotional") || hay.includes("heartfelt")) return "emotional";
  if (hay.includes("aggressive") || hay.includes("intense")) return "aggressive";
  if (hay.includes("slow") || hay.includes("elegant") || hay.includes("calm")) {
    return "slow_elegant";
  }
  return "natural";
}

/** Prefill Content Plan wizard inputs from a Weekly Idea Engine idea. */
export function contentPlanInputsFromIdea(
  idea: ContentIdea,
  sessionInputs?: IdeaGenerationInputs
): ContentPlanInputs {
  const duration = mapDuration(idea, sessionInputs);
  const platformRaw =
    idea.recommendedPlatform || sessionInputs?.platforms?.[0] || "";
  const avoidBits = [
    idea.production?.challenges,
    idea.production?.simplifiedAlternative
      ? `Prefer simpler path when needed: ${idea.production.simplifiedAlternative}`
      : "",
  ].filter(Boolean);

  const platform = mapPlatform(platformRaw);
  return defaultContentPlanInputs({
    idea: ideaSeedTextForContentPlan(idea),
    contentStyle: mapStyle(idea, sessionInputs),
    platform,
    durationPreset: duration.durationPreset,
    durationSeconds: duration.durationSeconds,
    energy: mapEnergy(sessionInputs),
    orientation: defaultOrientationForPlatform(platform),
    dialogueMode: "direct_to_camera",
    location: idea.production?.recommendedLocation || undefined,
    wardrobe: idea.production?.wardrobe || undefined,
    creatorName: idea.production?.requiredTalent || undefined,
    camerasAvailable: idea.production?.cameraApproach || undefined,
    lensesAvailable: idea.production?.suggestedLenses || undefined,
    lightingAvailable: idea.production?.lightingConcept || undefined,
    equipmentAvailable: [
      idea.production?.specialEquipment,
      idea.production?.props,
      idea.production?.audioApproach
        ? `Audio: ${idea.production.audioApproach}`
        : "",
    ]
      .filter(Boolean)
      .join(" · "),
    talkingPoints: [
      idea.hook,
      idea.creative?.coreIdea,
      idea.deliverables?.captionDirection,
    ]
      .filter(Boolean)
      .join("\n"),
    avoid: avoidBits.join("\n") || undefined,
    useAvailableGearOnly: true,
    teachMe: true,
  });
}
