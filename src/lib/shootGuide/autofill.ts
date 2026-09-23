import type {
  ShootGuide,
  ShootGuideOverview,
  ShootGuidePatch,
  ShootGuideSetup,
  ShootGuideShot,
  VisualPriority,
} from "./types";
import { isNamedCreativeStyle } from "./types";

type AutofillInput = {
  prompt: string;
  creativeIntent: string;
  visualPriorities: VisualPriority[];
  shotCount: number;
  useMyEquipment: boolean;
  showIdealWhenNotOwned?: boolean;
};

const PRIORITY_FOCUS: Record<VisualPriority, string> = {
  emotion: "the emotional turn",
  performance: "the performance",
  face: "the face and eyes",
  movement: "physical effort and motion",
  environment: "the space around them",
  product: "the product as hero",
  dialogue: "the spoken beat",
  suspense: "tension in the frame",
  action: "the action",
};

const STYLE_OBJECTIVE: Record<string, string> = {
  cinematic: "Make it feel finished — motivated camera, controlled highlights, a clear last image.",
  horror: "Let the audience search the frame. Hold longer than is comfortable, then take the safety away.",
  suspense: "Build unease with stillness and withheld information, not constant camera energy.",
  energetic: "Keep the image alive. Reset between setups so the energy does not turn into shake.",
  luxury: "Protect skin and materials. Slow the camera. Let negative space feel expensive.",
  intimate: "Stay close enough to read breath and micro-expression without crowding the subject.",
  commercial: "Every shot should sell one clear idea: who, what, and why it looks worth wanting.",
  natural: "Use available light first. Camera should feel present, not produced.",
  romantic: "Favor skin, eyelines, and warmth. Soften the room; keep the last frame on connection.",
  documentary: "Cover truthfully. Wider for context, then honest closer for the human beat.",
  dramatic: "Play contrast and eyeline. Let blocking carry the turn, then land on a still closer.",
};

const STYLE_STRATEGY: Record<string, string> = {
  cinematic: "Hold frames a beat longer than social. Prefer a locked or barely-moving camera except when the move is motivated.",
  horror: "Start locked. Save any uneasy move for the reveal. Leave dark negative space in the wides.",
  suspense: "Match the reveal. Keep one locked frame you can return to so the audience feels the change.",
  energetic: "Small push, slide, or body-mounted energy on the working shots; lock the hero so it still reads.",
  luxury: "Minimal movement, longer lens if you have it, and a slow settle into the product or face.",
  intimate: "Work closer sooner. Skip the very wide unless the room is part of the emotion.",
  commercial: "Clean hero, detail, lifestyle context, then a pack-shot or end-card closer.",
  natural: "Available practicals and window light. Move the subject before you add a fixture.",
  romantic: "Soft key, warm practicals, and a closer that holds the eyeline.",
  documentary: "Observe first. Do not over-cover. Get the line or the action, then a reaction.",
  dramatic: "Coverage that can cut on a look. One wide for geography, then committed tights.",
};

const STYLE_LIGHTING: Record<string, string> = {
  cinematic: "Soft key ~45° off camera, slight edge for separation, practicals dimmed under the key. Start WB around 4000–4500K and sneak warmth onto skin if the room is cool.",
  horror: "Underexpose the room. Harder or more directional key, deep negative fill, and one motivated practical. Do not fill the shadows unless the beat needs it.",
  suspense: "Keep the key off the far side of the face. Hold a darker background so the subject can disappear into it.",
  energetic: "Clean, even enough to move. Kick an edge for sweat and muscle; avoid a flat overhead.",
  luxury: "Large soft source, polished bounce, tight control of speculars on product or jewelry.",
  intimate: "Soft, close key. Dim the room so the face is the brightest thing.",
  commercial: "Clean key plus a controlled kicker. Product needs a dedicated source or card; do not leave it in the subject's key only.",
  natural: "Window or existing practical as key. Add fill only if faces fall apart.",
  romantic: "Warm key, cooler or darker room. Catchlight in both eyes on the closer.",
  documentary: "Mix and match available. If you add a light, hide it as a practical.",
  dramatic: "Stronger ratio. Let the fill side fall off. Edge only if the silhouette needs a cut.",
};

type ShotSeed = Pick<
  ShootGuideShot,
  "title" | "purpose" | "framing" | "cameraHeight" | "cameraPosition" | "movement" | "focusStrategy" | "reason"
>;

function joinFocus(priorities: VisualPriority[]): string {
  const labels = priorities.map((p) => PRIORITY_FOCUS[p]).filter(Boolean);
  if (labels.length === 0) return "the core moment of the scene";
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`;
}

function styleKey(creativeIntent: string): string {
  const tone = creativeIntent.trim().toLowerCase();
  if (isNamedCreativeStyle(tone)) return tone;
  return "cinematic";
}

function coverageArc(shotCount: number): string {
  if (shotCount <= 3) {
    return "Keep it to three beats: geography, the work, and a payoff closer.";
  }
  if (shotCount <= 5) {
    return "Open wide enough to read the space, then step in through action and effort into a hero finish.";
  }
  return "Build a full ladder: geography, action, detail, working angle, reaction, and a closer you can end on.";
}

export function isThinOverview(overview: ShootGuideOverview | undefined): boolean {
  if (!overview) return true;
  const strategy = overview.visualStrategy || "";
  const objective = overview.visualObjective || "";
  const gear = overview.gearSummary || "";
  return (
    !strategy.trim() ||
    /next sprint|will be generated|you can edit this shell/i.test(strategy) ||
    !objective.trim() ||
    /^prioritize\s/i.test(objective) ||
    /when shots are generated/i.test(gear)
  );
}

export function shotsNeedAutofill(shots: ShootGuideShot[] | undefined): boolean {
  const list = shots ?? [];
  if (list.length === 0) return false;
  return list.every(
    (s) =>
      !s.purpose?.trim() &&
      (/^shot\s*\d+$/i.test(s.title.trim()) || !s.title.trim())
  );
}

export function setupNeedsAutofill(setup: ShootGuideSetup | undefined): boolean {
  if (!setup) return true;
  return ![
    setup.locationNotes,
    setup.lightingNotes,
    setup.cameraSettings,
    setup.equipmentList,
    setup.cameraPlacement,
  ].some((v) => String(v || "").trim());
}

export function buildOverview(input: AutofillInput): ShootGuideOverview {
  const prompt = input.prompt.trim();
  const tone = input.creativeIntent.trim() || "cinematic";
  const key = styleKey(tone);
  const focus = joinFocus(input.visualPriorities);
  const styleObjective = STYLE_OBJECTIVE[key] ?? STYLE_OBJECTIVE.cinematic;
  const styleStrategy = STYLE_STRATEGY[key] ?? STYLE_STRATEGY.cinematic;

  const gearSummary = input.useMyEquipment
    ? input.showIdealWhenNotOwned !== false
      ? "Shoot it on gear you already own. If a shot wants a longer lens or different support, keep the closest catalog match and note the distance or stop change — and still show the ideal as a reference, not a shopping list."
      : "Shoot it on gear you already own. If the ideal lens or support is not in the catalog, pick the closest match and change camera distance or height instead of adding a rental."
    : "Recommend the right camera, lens, support, and lights for this look. Inventory matching is off, so this is the ideal package, not a catalog constraint.";

  return {
    sceneSummary: prompt || "No scene description yet.",
    toneStyle: tone,
    visualObjective: `Get ${focus} on camera. ${styleObjective}`,
    recommendedShotCount: input.shotCount,
    visualStrategy: `${coverageArc(input.shotCount)} ${styleStrategy}`,
    gearSummary,
  };
}

export function buildSetup(input: AutofillInput): ShootGuideSetup {
  const key = styleKey(input.creativeIntent);
  const lighting = STYLE_LIGHTING[key] ?? STYLE_LIGHTING.cinematic;
  const owned = input.useMyEquipment;
  return {
    locationNotes:
      "Use the real room. Clear the first wide of clutter, then ignore leftover mess in the tights. Park bags and stands opposite the hero background.",
    lightingNotes: lighting,
    cameraSettings:
      "Start 24fps, 180° shutter, WB from the key. Lock exposure on the first frame you would actually use, then match the rest of the scene to it.",
    equipmentList: owned
      ? "Body + one working lens + one tighter lens if you have it, sticks or a stable support, one key you already own, negative fill, and a backup battery/media plan. Add a gimbal or Easyrig only if a shot truly needs a move."
      : "Body, a wider working lens, a tighter portrait/detail lens, sticks, one key with a modifier, negative fill, and a simple edge or practical.",
    cameraPlacement:
      "Give the subject a clean background first (often a 3/4 or profile). Leave a lane so a longer-lens closer can happen without rebuilding the whole lighting plot.",
  };
}

export function buildShotSequence(
  count: number,
  priorities: VisualPriority[],
  creativeIntent: string
): ShotSeed[] {
  const wants = new Set(priorities);
  const key = styleKey(creativeIntent);
  const lockedFirst = key === "horror" || key === "suspense";
  const energetic = key === "energetic";

  const establish: ShotSeed = {
    title: "Establish the space",
    purpose: "Show where we are and who we are with before the coverage gets closer.",
    framing: "Wide / medium-wide",
    cameraHeight: "Eye level",
    cameraPosition: "Front 3/4 or head-on, enough room in the frame to read the location",
    movement: lockedFirst ? "Locked off" : energetic ? "Tiny drift or slow push" : "Locked or barely drifting",
    focusStrategy: "Hold the subject sharp; let the room fall off if the lens allows",
    reason: "Without geography the closer shots feel like clips, not a scene.",
  };
  const detail: ShotSeed = {
    title: wants.has("product") ? "Product / insert hero" : wants.has("action") || wants.has("movement") ? "Action detail" : "Telling insert",
    purpose: wants.has("product")
      ? "Sell the object cleanly so it can cut against the human coverage."
      : "Get a specific physical beat (hands, feet, effort) that the wides cannot give you.",
    framing: "CU / insert",
    cameraHeight: wants.has("movement") ? "Low, near the action" : "Match the working height",
    cameraPosition: "On the moving part or the product, not the whole body",
    movement: lockedFirst ? "Locked" : "Locked or a very small push",
    focusStrategy: "Rack only if the beat is a handoff; otherwise nail the plane and hold",
    reason: "Editors need a cutaway that still belongs to this scene.",
  };
  const working: ShotSeed = {
    title: wants.has("dialogue") ? "Working coverage / the line" : "Working angle",
    purpose: wants.has("dialogue")
      ? "Cover the line so we can cut to a usable performance without jumping in size."
      : "See the work happening — profile or 3/4 that reads body and face together.",
    framing: "Medium / MCU",
    cameraHeight: "Eye level",
    cameraPosition: "Side 3/4 or true profile, background still clean",
    movement: energetic ? "Gentle push or follow" : lockedFirst ? "Locked" : "Locked or tiny push",
    focusStrategy: "Near eye if the face is in frame; otherwise the working hand/body plane",
    reason: "This is the shot you can live in if the scene only gets one angle.",
  };
  const character: ShotSeed = {
    title: wants.has("emotion") || wants.has("face") ? "Effort / emotion beat" : "Character beat",
    purpose: "Catch the moment the work turns into feeling — breath, strain, a look — not just activity.",
    framing: "MCU / CU",
    cameraHeight: "Eye level or slightly below",
    cameraPosition: "Closer on the face or upper body, same side as the working angle if you can",
    movement: lockedFirst ? "Locked, hold the negative space" : "Locked or a tiny push into the eyes",
    focusStrategy: "Near eye, shallow enough to isolate",
    reason: "Purpose drives the tighter lens: emotion, not more of the same wide.",
  };
  const closer: ShotSeed = {
    title: "Hero finish",
    purpose: "End on a still, readable image you would actually cut to black on — confidence, product, or the last look.",
    framing: wants.has("face") || wants.has("emotion") ? "CU" : "MCU / CU",
    cameraHeight: "Eye level",
    cameraPosition: "Clean background, subject dominant in the frame",
    movement: "Locked",
    focusStrategy: "Near eye or product plane, no hunting",
    reason: "You need a last frame that is designed, not whatever was on the card when you wrapped.",
  };

  const extras: ShotSeed[] = [
    {
      title: "Reverse / second side",
      purpose: "Give editorial a second eyeline or a clean opposite so the scene can breathe.",
      framing: "Medium",
      cameraHeight: "Eye level",
      cameraPosition: "Opposite the working angle, still hiding clutter",
      movement: "Locked",
      focusStrategy: "Match the working shot's plane",
      reason: "One-sided coverage traps the cut.",
    },
    {
      title: "Clean plate",
      purpose: "Hold an empty frame of the space for VFX, continuity, or a button at the end.",
      framing: "Match the establish",
      cameraHeight: "Match the establish",
      cameraPosition: "Same as establish, subject out",
      movement: "Locked",
      focusStrategy: "Same as establish",
      reason: "Cheap insurance and a useful end card.",
    },
    {
      title: "Safety wide",
      purpose: "One extra geography frame if the first establish is too stylized to cut with.",
      framing: "Wide",
      cameraHeight: "Eye level",
      cameraPosition: "Further back than the hero establish",
      movement: "Locked",
      focusStrategy: "Deep enough to hold the room",
      reason: "Editorial always wants a simpler wide.",
    },
  ];

  const core = [establish, detail, working, character, closer];
  if (count <= 3) return [establish, working, closer];
  if (count <= 5) return core.slice(0, count);
  return [...core, ...extras].slice(0, count);
}

export function applyShotSequence(
  shots: ShootGuideShot[],
  sequence: ShotSeed[]
): ShootGuideShot[] {
  return shots.map((shot, i) => {
    const seed = sequence[i];
    if (!seed) return shot;
    return { ...shot, ...seed };
  });
}

export function autofillInputFromGuide(guide: Pick<
  ShootGuide,
  | "prompt"
  | "creativeIntent"
  | "overview"
  | "visualPriorities"
  | "desiredShotCount"
  | "useMyEquipment"
  | "showIdealWhenNotOwned"
>): AutofillInput {
  return {
    prompt: guide.prompt || guide.overview?.sceneSummary || "",
    creativeIntent: guide.overview?.toneStyle || guide.creativeIntent || "cinematic",
    visualPriorities: guide.visualPriorities ?? [],
    shotCount: guide.overview?.recommendedShotCount || guide.desiredShotCount || 5,
    useMyEquipment: guide.useMyEquipment,
    showIdealWhenNotOwned: guide.showIdealWhenNotOwned,
  };
}

export function hydrateGuideIfNeeded(guide: ShootGuide): ShootGuidePatch | null {
  const input = autofillInputFromGuide(guide);
  const patch: ShootGuidePatch = {};
  let changed = false;

  if (isThinOverview(guide.overview)) {
    const overview = buildOverview(input);
    patch.overview = {
      ...overview,
      sceneSummary: guide.overview?.sceneSummary?.trim() || overview.sceneSummary,
      recommendedShotCount:
        guide.overview?.recommendedShotCount || overview.recommendedShotCount,
    };
    changed = true;
  }
  if (setupNeedsAutofill(guide.setup)) {
    patch.setup = buildSetup(input);
    changed = true;
  }
  if (shotsNeedAutofill(guide.shots)) {
    patch.shots = applyShotSequence(
      guide.shots,
      buildShotSequence(guide.shots.length, input.visualPriorities, input.creativeIntent)
    );
    changed = true;
  }
  return changed ? patch : null;
}

export function overviewAfterToneChange(
  guide: ShootGuide,
  toneStyle: string
): ShootGuideOverview {
  const current = guide.overview;
  const rebuilt = buildOverview({
    ...autofillInputFromGuide(guide),
    creativeIntent: toneStyle,
  });
  return {
    ...rebuilt,
    sceneSummary: current?.sceneSummary || rebuilt.sceneSummary,
    recommendedShotCount: current?.recommendedShotCount || rebuilt.recommendedShotCount,
    toneStyle,
  };
}
