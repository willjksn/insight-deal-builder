export const SCRIPT_MAX_IMAGE_MB = 10;
export const SCRIPT_MAX_VIDEO_MB = 50;
export const SCRIPT_MAX_IMAGES = 8;
export const SCRIPT_MAX_VIDEO_SECONDS = 45;

export const SCRIPT_IMAGE_TAG_LABELS = {
  location: "Location",
  mood: "Mood reference",
  lighting: "Lighting reference",
  character_look: "Character look",
} as const;

export const SCRIPT_MAX_URLS = 4;

export const SCRIPT_VIDEO_MODE_LABELS = {
  inspired_by: "Inspired by (new story, same energy)",
  match_structure: "Match structure (same beats, new details)",
  transcribe_expand: "Transcribe & expand",
} as const;

export const SCRIPT_URL_TAG_LABELS = {
  location: "Location",
  mood: "Mood reference",
  lighting: "Lighting reference",
  character_look: "Character look",
  reference_clip: "Reference clip",
} as const;
