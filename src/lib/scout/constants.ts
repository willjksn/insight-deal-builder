import {
  ScoutAspectRatio,
  ScoutAppMode,
  ScoutColorGradingPref,
  ScoutImageLabel,
  ScoutMood,
  ScoutPlatform,
  ScoutPreferredLook,
  ScoutSceneType,
  ScoutSkillLevel,
} from "./types";

export const SCOUT_SCENE_TYPES: { value: ScoutSceneType; label: string }[] = [
  { value: "creator_reel", label: "Creator reel" },
  { value: "podcast", label: "Podcast" },
  { value: "interview", label: "Interview" },
  { value: "horror", label: "Horror" },
  { value: "commercial", label: "Commercial" },
  { value: "lifestyle", label: "Lifestyle" },
  { value: "car_scene", label: "Car scene" },
  { value: "music_video", label: "Music video" },
  { value: "short_film", label: "Short film" },
  { value: "product_video", label: "Product video" },
  { value: "social_reel", label: "Social reel" },
  { value: "trailer", label: "Trailer" },
];

export const SCOUT_MOODS: { value: ScoutMood; label: string }[] = [
  { value: "warm", label: "Warm" },
  { value: "natural", label: "Natural" },
  { value: "luxury", label: "Luxury" },
  { value: "scary", label: "Scary" },
  { value: "dramatic", label: "Dramatic" },
  { value: "romantic", label: "Romantic" },
  { value: "moody", label: "Moody" },
  { value: "clean_commercial", label: "Clean commercial" },
  { value: "gritty", label: "Gritty" },
  { value: "soft_beauty", label: "Soft beauty" },
  { value: "suspense", label: "Suspense" },
  { value: "high_energy", label: "High-energy" },
  { value: "documentary", label: "Documentary" },
];

export const SCOUT_PLATFORMS: { value: ScoutPlatform; label: string }[] = [
  { value: "instagram_reels", label: "Instagram Reels" },
  { value: "tiktok", label: "TikTok" },
  { value: "youtube", label: "YouTube" },
  { value: "youtube_shorts", label: "YouTube Shorts" },
  { value: "portfolio", label: "Portfolio" },
  { value: "client_commercial", label: "Client commercial" },
  { value: "podcast_platform", label: "Podcast" },
  { value: "website", label: "Website" },
];

export const SCOUT_ASPECT_RATIOS: { value: ScoutAspectRatio; label: string }[] = [
  { value: "9:16", label: "9:16 (vertical)" },
  { value: "16:9", label: "16:9 (horizontal)" },
  { value: "1:1", label: "1:1 (square)" },
  { value: "both", label: "Both vertical & horizontal" },
];

export const SCOUT_SKILL_LEVELS: { value: ScoutSkillLevel; label: string }[] = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "pro", label: "Pro" },
];

export const SCOUT_PREFERRED_LOOKS: { value: ScoutPreferredLook; label: string }[] = [
  { value: "s_cinetone", label: "S-Cinetone (fast workflow)" },
  { value: "s_log3", label: "S-Log3 (grading workflow)" },
  { value: "natural", label: "Natural / minimal grade" },
  { value: "commercial", label: "Commercial polish" },
  { value: "horror", label: "Horror / contrasty" },
  { value: "beauty", label: "Beauty / soft skin" },
  { value: "moody_look", label: "Moody" },
  { value: "high_contrast", label: "High contrast" },
];

export const SCOUT_CAMERA_MOVEMENTS: { value: string; label: string }[] = [
  { value: "locked_tripod", label: "Locked tripod" },
  { value: "handheld", label: "Handheld" },
  { value: "gimbal_push", label: "Gimbal push-in" },
  { value: "dolly_push_in", label: "Dolly push-in" },
  { value: "dolly_pull_out", label: "Dolly pull-out" },
  { value: "slider", label: "Slider" },
  { value: "orbit", label: "Orbit" },
  { value: "slow_reveal", label: "Slow reveal" },
  { value: "walk_and_talk", label: "Walk-and-talk" },
];

export const SCOUT_IMAGE_LABELS: { value: ScoutImageLabel; label: string }[] = [
  { value: "doorway", label: "Doorway" },
  { value: "left_corner", label: "Left corner" },
  { value: "right_corner", label: "Right corner" },
  { value: "opposite_wall", label: "Opposite wall" },
  { value: "main_background", label: "Main background" },
  { value: "window_light", label: "Window / light source" },
  { value: "ceiling_overhead", label: "Ceiling / overhead lights" },
  { value: "detail_background", label: "Detail / background" },
  { value: "unlabeled", label: "Other angle" },
];

export const SCOUT_MAX_UPLOADS = 6;
export const SCOUT_MAX_IMAGE_MB = 10;

export const SCENE_TYPE_LABEL = Object.fromEntries(
  SCOUT_SCENE_TYPES.map((o) => [o.value, o.label])
) as Record<ScoutSceneType, string>;

export const MOOD_LABEL = Object.fromEntries(SCOUT_MOODS.map((o) => [o.value, o.label])) as Record<
  ScoutMood,
  string
>;

export const SCOUT_APP_MODES: { value: ScoutAppMode; label: string }[] = [
  { value: "quick", label: "Quick — angle, lighting, settings, shot list" },
  { value: "pro", label: "Pro — ratios, coverage, continuity, audio" },
  { value: "creator", label: "Creator — vertical, thumbnail, BTS, hooks" },
  { value: "horror", label: "Horror — shadows, negative space, hard light" },
  { value: "commercial", label: "Commercial — product, luxury, brand-safe" },
  { value: "podcast", label: "Podcast — multi-cam, mics, eyelines" },
];

export const SCOUT_COLOR_GRADING_PREFS: { value: ScoutColorGradingPref; label: string }[] = [
  { value: "minimal", label: "Little / no grading" },
  { value: "light", label: "Light grading" },
  { value: "full", label: "Full grading" },
];

export const SCOUT_STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  needs_images: "Needs images",
  needs_questions: "Needs questions",
  ready_to_plan: "Ready to plan",
  ready_to_shoot: "Ready to shoot",
  shot: "Shot",
  archived: "Archived",
  uploading: "Uploading",
  analyzed: "Analyzed",
  planning: "Planning",
  planned: "DP plan ready",
  previs_ready: "Preview ready",
};
