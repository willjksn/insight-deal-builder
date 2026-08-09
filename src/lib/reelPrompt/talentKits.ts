import type { ReelTalentKit } from "@/lib/reelPrompt/types";

/** Built-in continuity kits for consistent UGC / cinematic reels. */
export const REEL_TALENT_KITS: ReelTalentKit[] = [
  {
    id: "stormi",
    name: "Stormi",
    continuity:
      "Same young woman lead across every clip: warm confident presence, natural smile, consistent face/hair/makeup, modern casual wardrobe unless the beat says otherwise. Phone-first UGC energy when style is ugc_ad; cinematic but still recognizable as the same person when style is cinematic_reel.",
    appearance: "Young adult woman, expressive eyes, natural glam, approachable",
    wardrobe: "Clean casual / soft streetwear; keep outfit consistent unless a beat changes it",
    voiceEnergy: "Friendly, direct-to-camera, confident, not corporate",
    doNot: [
      "Do not change ethnicity, age bracket, or face identity between clips",
      "Do not add random extra characters unless the beat requires it",
      "Avoid over-smoothed CGI skin; keep lifelike texture",
    ],
  },
  {
    id: "custom",
    name: "Custom / from script",
    continuity:
      "Use the script characters exactly. Keep wardrobe, age, and identity locked across clips unless a beat explicitly changes them.",
    doNot: ["Do not invent a new lead if the script already names one"],
  },
];

export function getReelTalentKit(id: string | null | undefined): ReelTalentKit | null {
  if (!id) return null;
  return REEL_TALENT_KITS.find((k) => k.id === id) ?? null;
}
