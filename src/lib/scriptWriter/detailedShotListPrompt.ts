export const SCRIPT_WRITER_DETAILED_SHOT_LIST_RULES = `DETAILED SHOT LIST MODE (enabled — mandatory):
- suggestedShots must be a shootable DP/camera breakdown — NOT one vague line per scene.
- Write like a working shot list on a horror trailer, commercial, or narrative set: every row should tell the crew HOW to execute the shot.

Coverage per scene (minimum):
  • 1 master_wide (establishing / wide)
  • 1+ medium_shot for main action or dialogue
  • 1+ close_up for emotion, detail, or key story beat
- Add insert_shot, reaction_shot, and movement_shot wherever the script warrants them.
- Number shots sequentially across the whole project (1, 2, 3…).
- Order by scene number, then logical shooting order within each scene.

REQUIRED fields on EVERY suggestedShots row (detailed mode):
  sceneNumber, shotNumber, shotType (enum only), shotName (short label e.g. "WS — Home theater establishing"),
  description (what the frame contains — composition, depth, foreground/background),
  subjectAction (what talent/props do during the take),
  cameraMovement (specific: static, slow dolly in 18" over 4s, handheld micro-sway, pan L→R follow, etc.),
  lens (e.g. 24mm, 50mm, 85mm, 100mm macro),
  framing (screen direction, headroom, lead room, angle — e.g. "MCU screen-left, negative space right for figure"),
  cameraHeight (eye level, low angle, high angle, tabletop for insert, exact note if relevant),
  blocking (where talent/props are in the space relative to camera and set),
  lighting (key/fill/rim/practical sources, ratio, color temp, what motivates the light),
  exposureNotes (fps/shutter if not project default, T-stop or aperture, EI/ISO, IRE targets for S-Cinetone or Log),
  audioNotes (dialogue/mos, wild lines, room tone, SFX to capture, mic strategy if relevant),
  setupNotes (tripod/slider/gimbal, lens swap, flags/diffusion, safety, slate, plate/clean plate needs),
  purpose (story/emotional beat this shot serves),
  duration (approx hold length e.g. "3–5 sec" or "until action completes").

Quality bar — each shot should answer:
  Where is the camera? What lens? How is it mounted and moving?
  Where is talent/props? What do they do?
  What lights the scene and at what contrast?
  What do we hear? How long is the take?
  Why are we shooting this coverage?

Example row (match this depth, adapt to the script):
{
  "sceneNumber": "1",
  "shotNumber": 4,
  "shotType": "close_up",
  "shotName": "CU — Stormi annoyed",
  "description": "MCU on Stormi screen-left; home-theater screen soft OOF in BG right; face lit primarily by screen flicker.",
  "subjectAction": "Stormi exhales, brow furrows, reaches for remote but hesitates.",
  "cameraMovement": "static on sticks; optional 2% slow push-in last 2 sec",
  "lens": "100mm",
  "framing": "MCU, eyes upper third, lead room screen-right toward the glitch source",
  "cameraHeight": "eye level, lens height ~5'4\" aligned with Stormi seated",
  "blocking": "Stormi center couch; screen dominates BG; remote in right hand at chest",
  "lighting": "Screen as key; no fill; deep shadow camera-left cheek; ratio ~6:1; 6500K screen vs 3200K dim practical OFF",
  "exposureNotes": "24p 1/50, T2.8, EI 800, expose skin 42–48 IRE S-Cinetone; allow screen to clip slightly",
  "audioNotes": "MOS; capture projector fan; note timecode for sync SFX insert later",
  "setupNotes": "Matte box flag top to kill ceiling spill; shoot clean plate of empty couch after scene",
  "purpose": "First human reaction to the glitch — sell annoyance before fear",
  "duration": "4–6 sec"
}

- Short trailers and skits still get explicit WS / MS / CU rows — do not collapse coverage.
- Horror, thriller, and VFX-heavy scripts: include inserts for screens, reflections, and reaction singles.`;

export const SCRIPT_WRITER_BASIC_SHOT_LIST_RULES = `- suggestedShots: one or two key shots per scene with shootable coverage (description, lens, lighting, purpose).`;

export function shotListPromptRules(detailedShotList: boolean): string {
  return detailedShotList ? SCRIPT_WRITER_DETAILED_SHOT_LIST_RULES : SCRIPT_WRITER_BASIC_SHOT_LIST_RULES;
}
