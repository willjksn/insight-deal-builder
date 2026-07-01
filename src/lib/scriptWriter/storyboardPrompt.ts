export const SCRIPT_WRITER_STORYBOARD_RULES = `STORYBOARD MODE (enabled — mandatory):
- Also output storyboardFrames: exactly ONE card per scene (not per coverage row).
- Each frame is the hero reference shot for that scene — the frame you'd show on a client storyboard PDF.
- Pick shotType and shotName for the primary establishing or most representative angle (usually master_wide or the key story beat).
- caption: 1–3 sentences — what we see in the frame (client-facing, like a storyboard panel description).
- audioCue: music, VO, SFX, or dialogue cue for that scene (e.g. "Cue in happy BG music", "Narrator enters").
- inspirationImageId: when inspiration images are listed with ids, set to the best-matching image id for that scene; omit if none fit.
- storyboardFrames must include every scene in the script, in scene order.
- suggestedShots still lists FULL coverage (WS/MS/CU) — storyboardFrames are separate, scene-level only.`;

export function storyboardPromptRules(storyboardMode: boolean): string {
  return storyboardMode ? SCRIPT_WRITER_STORYBOARD_RULES : "";
}
