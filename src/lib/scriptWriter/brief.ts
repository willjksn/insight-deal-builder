export type ScriptContentType =
  | "commercial"
  | "short_film"
  | "brand_story"
  | "music_video"
  | "documentary"
  | "social_reel"
  | "interview"
  | "other";

export type ScriptMood =
  | "comedy"
  | "dramatic"
  | "warm_natural"
  | "high_energy"
  | "moody_cinematic"
  | "inspirational"
  | "romantic"
  | "absurd"
  | "documentary_verite"
  | "horror"
  | "custom";

export type ScriptCastSize =
  | "solo"
  | "two"
  | "small_group"
  | "large_ensemble"
  | "voiceover_only"
  | "no_people";

export type ScriptRuntime =
  | "30s"
  | "60s"
  | "90s"
  | "2_3min"
  | "5_10min"
  | "longer"
  | "custom";

export type ScriptAudienceAge =
  | "kids"
  | "teens"
  | "18_34"
  | "35_54"
  | "55_plus"
  | "all_ages";

export type ScriptGenderMix =
  | "any"
  | "mostly_women"
  | "mostly_men"
  | "mixed_ensemble"
  | "na_voiceover";

export interface ScriptWriterBrief {
  contentType: ScriptContentType;
  mood: ScriptMood;
  /** When mood is "custom" */
  customMood?: string;
  castSize: ScriptCastSize;
  runtime: ScriptRuntime;
  /** When runtime is "custom" */
  customRuntime?: string;
  audienceAge: ScriptAudienceAge;
  genderMix: ScriptGenderMix;
  /** Freeform concept / scene idea */
  concept: string;
  /** Optional casting or character notes */
  characterNotes?: string;
}

export const DEFAULT_SCRIPT_BRIEF: ScriptWriterBrief = {
  contentType: "commercial",
  mood: "warm_natural",
  castSize: "small_group",
  runtime: "60s",
  audienceAge: "18_34",
  genderMix: "any",
  concept: "",
  characterNotes: "",
};

export const SCRIPT_CONTENT_TYPE_LABELS: Record<ScriptContentType, string> = {
  commercial: "Commercial / ad",
  short_film: "Short film",
  brand_story: "Brand story",
  music_video: "Music video",
  documentary: "Documentary",
  social_reel: "Social / reel",
  interview: "Interview / talking head",
  other: "Other",
};

export const SCRIPT_MOOD_LABELS: Record<ScriptMood, string> = {
  comedy: "Comedy",
  dramatic: "Dramatic",
  warm_natural: "Warm & natural",
  high_energy: "High energy",
  moody_cinematic: "Moody / cinematic",
  inspirational: "Inspirational",
  romantic: "Romantic",
  absurd: "Absurd / surreal",
  documentary_verite: "Documentary vérité",
  horror: "Scary / horror",
  custom: "Custom…",
};

export const SCRIPT_CAST_SIZE_LABELS: Record<ScriptCastSize, string> = {
  solo: "1 person on camera",
  two: "2 people",
  small_group: "3–5 people",
  large_ensemble: "6+ / ensemble",
  voiceover_only: "Voiceover only",
  no_people: "No people (product / b-roll)",
};

export const SCRIPT_RUNTIME_LABELS: Record<ScriptRuntime, string> = {
  "30s": "~30 seconds",
  "60s": "~60 seconds",
  "90s": "~90 seconds",
  "2_3min": "2–3 minutes",
  "5_10min": "5–10 minutes",
  longer: "Longer piece",
  custom: "Custom…",
};

export const SCRIPT_AUDIENCE_AGE_LABELS: Record<ScriptAudienceAge, string> = {
  kids: "Kids",
  teens: "Teens",
  "18_34": "18–34",
  "35_54": "35–54",
  "55_plus": "55+",
  all_ages: "All ages",
};

export const SCRIPT_GENDER_MIX_LABELS: Record<ScriptGenderMix, string> = {
  any: "Any / open casting",
  mostly_women: "Mostly women on camera",
  mostly_men: "Mostly men on camera",
  mixed_ensemble: "Mixed ensemble",
  na_voiceover: "N/A — voiceover or no cast",
};

export function resolveMoodLabel(brief: Pick<ScriptWriterBrief, "mood" | "customMood">): string {
  if (brief.mood === "custom") {
    return brief.customMood?.trim() || "Custom mood";
  }
  return SCRIPT_MOOD_LABELS[brief.mood];
}

export function resolveRuntimeLabel(brief: Pick<ScriptWriterBrief, "runtime" | "customRuntime">): string {
  if (brief.runtime === "custom") {
    return brief.customRuntime?.trim() || "Custom runtime";
  }
  return SCRIPT_RUNTIME_LABELS[brief.runtime];
}

export function isBriefComplete(brief: ScriptWriterBrief, hasInspiration = false): boolean {
  if (!brief.concept.trim() && !hasInspiration) return false;
  if (brief.mood === "custom" && !brief.customMood?.trim()) return false;
  if (brief.runtime === "custom" && !brief.customRuntime?.trim()) return false;
  return true;
}

export function inferScriptDetailLevel(brief: ScriptWriterBrief): "standard" | "production" | "trailer" {
  const runtime = brief.runtime;
  if (runtime === "30s" || runtime === "60s" || runtime === "90s") return "trailer";
  if (runtime === "2_3min" || runtime === "5_10min") return "production";
  return "standard";
}

export function formatBriefForPrompt(brief: ScriptWriterBrief): string {
  const concept = brief.concept.trim();
  const characterNotes = brief.characterNotes?.trim();

  const lines = [
    "=== PRIMARY CREATIVE DIRECTION (highest priority — obey over all dropdown defaults) ===",
    `Story idea: ${concept}`,
  ];
  if (characterNotes) {
    lines.push(`Character & casting notes: ${characterNotes}`);
  }
  lines.push(
    "",
    "CRITICAL: If the concept or character notes specify people (count, names, ages, relationships), mood, tone, audience, gender, or runtime — USE THOSE SPECIFICS.",
    "Dropdown defaults below are fallbacks ONLY when the story text is silent or ambiguous. Never invent a generic cast or audience that contradicts the written concept.",
    "",
    "=== PRODUCTION DEFAULTS (fallback — ignore when concept/notes are more specific) ===",
    `- Format: ${SCRIPT_CONTENT_TYPE_LABELS[brief.contentType]}`,
    `- Mood / tone: ${resolveMoodLabel(brief)}`,
    `- People on camera (default): ${SCRIPT_CAST_SIZE_LABELS[brief.castSize]}`,
    `- Target runtime (default): ${resolveRuntimeLabel(brief)}`,
    `- Audience age (default): ${SCRIPT_AUDIENCE_AGE_LABELS[brief.audienceAge]}`,
    `- On-camera gender mix (default): ${SCRIPT_GENDER_MIX_LABELS[brief.genderMix]}`
  );
  return lines.join("\n");
}

export function buildInitialUserMessage(brief: ScriptWriterBrief): string {
  return `${formatBriefForPrompt(brief)}\n\nDevelop this into a complete, shootable full script. If the idea is brief, expand it creatively using the settings — don't ask the user to supply every detail.`;
}
