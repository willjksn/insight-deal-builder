export const SCRIPT_WRITER_DETAILED_SHOT_LIST_RULES = `DETAILED SHOT LIST MODE (enabled — mandatory):
- suggestedShots must be a full production coverage breakdown, NOT one vague line per scene.
- For EVERY scene include at minimum:
  • 1 master_wide (establishing / wide)
  • 1+ medium_shot for main action or dialogue
  • 1+ close_up for emotion, detail, or key story beat
- Add insert_shot, reaction_shot, and movement_shot wherever the script warrants them.
- Number shots sequentially across the whole project (1, 2, 3…).
- Each shot must include: sceneNumber, shotNumber, shotType (enum only), shotName (short label e.g. "WS — Gym exterior"),
  description (what we see), subjectAction, cameraMovement, lens (e.g. 24mm, 50mm), lighting (brief note).
- Order shots by scene number, then logical shooting order within each scene.
- Short trailers and skits still get explicit WS / MS / CU rows — do not collapse coverage.`;

export const SCRIPT_WRITER_BASIC_SHOT_LIST_RULES = `- suggestedShots: one or two key shots per scene with shootable coverage.`;

export function shotListPromptRules(detailedShotList: boolean): string {
  return detailedShotList ? SCRIPT_WRITER_DETAILED_SHOT_LIST_RULES : SCRIPT_WRITER_BASIC_SHOT_LIST_RULES;
}
