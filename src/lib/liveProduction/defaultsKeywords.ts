/** Default discovery keywords for future Opportunity Agent + saved searches. */
export const DEFAULT_LIVE_PRODUCTION_KEYWORDS = [
  "audio visual",
  "audiovisual",
  "AV production",
  "event production",
  "live production",
  "LED wall",
  "video wall",
  "staging",
  "stage production",
  "sound reinforcement",
  "concert production",
  "festival production",
  "conference AV",
  "conference production",
  "lighting production",
  "truss",
  "rigging",
  "IMAG",
  "live streaming",
  "event technology",
  "technical production",
  "production services",
  "special events",
  "event rental",
  "production equipment rental",
] as const;

export type LiveProductionTargetProfile = {
  homeLocation: string;
  radiusMiles: number;
  minimumProject: number;
  preferredProject: number;
  services: string[];
  exclude: string[];
  keywords: string[];
};

export function defaultImgLiveProductionProfile(): LiveProductionTargetProfile {
  return {
    homeLocation: "Charlotte, NC",
    radiusMiles: 250,
    minimumProject: 5000,
    preferredProject: 15000,
    services: [
      "LED",
      "Audio",
      "Lighting",
      "Truss",
      "Conference AV",
      "Concerts",
      "Festivals",
      "Corporate Events",
      "Church Events",
      "IMAG",
      "Streaming",
    ],
    exclude: ["permanent AV installation", "residential AV", "jobs under $2,500"],
    keywords: [...DEFAULT_LIVE_PRODUCTION_KEYWORDS],
  };
}
