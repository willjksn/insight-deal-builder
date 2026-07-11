import { BrandProfile, BrandProfileType } from "@/lib/contentIdeas/types";

export function emptyBrandProfile(type: BrandProfileType = "business"): Omit<BrandProfile, "id" | "userId" | "createdAt" | "updatedAt"> {
  return {
    type,
    basic: {
      profileName: "",
    },
    brandIdentity: {},
    creatorIdentity: {},
    audience: {},
    business: {},
    productionPreferences: {
      preferredPlatforms: [],
    },
    safety: {},
  };
}

export const CONTENT_GOAL_OPTIONS: { id: string; label: string }[] = [
  { id: "awareness", label: "Increase awareness" },
  { id: "followers", label: "Grow followers" },
  { id: "engagement", label: "Increase engagement" },
  { id: "leads", label: "Generate leads" },
  { id: "appointments", label: "Book appointments" },
  { id: "sell_product", label: "Sell a product" },
  { id: "sell_service", label: "Sell a service" },
  { id: "event", label: "Promote an event" },
  { id: "partnerships", label: "Attract brand partnerships" },
  { id: "demonstrate_quality", label: "Demonstrate production quality" },
  { id: "authority", label: "Build authority" },
  { id: "educate", label: "Educate" },
  { id: "entertain", label: "Entertain" },
  { id: "community", label: "Build community" },
  { id: "spec_commercial", label: "Spec commercial / portfolio" },
];

export const PLATFORM_OPTIONS = [
  "Instagram Reels",
  "Instagram Feed",
  "TikTok",
  "YouTube Shorts",
  "YouTube",
  "LinkedIn",
  "Paid advertisement",
  "Website",
];

export const FORMAT_OPTIONS = [
  "cinematic_commercial",
  "lifestyle_reel",
  "narrative_short",
  "product_demo",
  "educational",
  "talking_head",
  "testimonial",
  "horror",
  "beauty",
  "behind_the_scenes",
  "teaser",
  "direct_response",
];

export const LOOK_OPTIONS = [
  "Cinematic",
  "Luxury",
  "Premium",
  "Natural",
  "Moody",
  "Horror",
  "Documentary",
  "Lifestyle",
  "Polished social",
];

export const TONE_OPTIONS = [
  "Inspiring",
  "Mysterious",
  "Funny",
  "Confident",
  "Elegant",
  "Suspenseful",
  "Empowering",
  "Trustworthy",
  "Energetic",
];
