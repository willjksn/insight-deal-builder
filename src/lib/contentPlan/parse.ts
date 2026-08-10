import type {
  ContentShot,
  CreativeBrief,
  HowToShoot,
  ScriptLine,
  ShotStatus,
  StoryBeat,
} from "@/lib/contentPlan/types";

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v.trim() : fallback;
}

function num(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function strArr(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    .map((x) => x.trim());
}

export function parseCreativeBrief(raw: unknown): CreativeBrief {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    workingTitle: str(o.workingTitle, "Untitled plan"),
    coreConcept: str(o.coreConcept),
    objective: str(o.objective),
    targetViewer: str(o.targetViewer),
    hook: str(o.hook),
    mainMessage: str(o.mainMessage),
    emotionalGoal: str(o.emotionalGoal),
    productBrandMoment: str(o.productBrandMoment),
    cta: str(o.cta),
    visualStyle: str(o.visualStyle),
    cameraPhilosophy: str(o.cameraPhilosophy),
    editingPhilosophy: str(o.editingPhilosophy),
    soundPhilosophy: str(o.soundPhilosophy),
    whyItWorks: str(o.whyItWorks),
  };
}

export function parseStoryBeats(raw: unknown): StoryBeat[] {
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as { beats?: unknown })?.beats)
      ? (raw as { beats: unknown[] }).beats
      : [];
  const beats: StoryBeat[] = [];
  for (let i = 0; i < list.length; i++) {
    const o = (list[i] && typeof list[i] === "object" ? list[i] : {}) as Record<
      string,
      unknown
    >;
    const label = str(o.label, `Beat ${i + 1}`);
    if (!label && !str(o.description)) continue;
    beats.push({
      id: str(o.id, `beat_${String(i + 1).padStart(2, "0")}`),
      startTime: str(o.startTime, "0:00"),
      endTime: str(o.endTime, "0:00"),
      label,
      description: str(o.description),
    });
  }
  return beats;
}

export function parseScriptLines(raw: unknown): ScriptLine[] {
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as { lines?: unknown })?.lines)
      ? (raw as { lines: unknown[] }).lines
      : [];
  const lines: ScriptLine[] = [];
  for (let i = 0; i < list.length; i++) {
    const o = (list[i] && typeof list[i] === "object" ? list[i] : {}) as Record<
      string,
      unknown
    >;
    const dialogue = str(o.dialogue);
    const onScreenText = str(o.onScreenText);
    if (!dialogue && !onScreenText && str(o.kind) !== "action") continue;
    const kindRaw = str(o.kind);
    const kind =
      kindRaw === "vo" ||
      kindRaw === "direct" ||
      kindRaw === "text_only" ||
      kindRaw === "action" ||
      kindRaw === "dialogue"
        ? kindRaw
        : dialogue
          ? "dialogue"
          : onScreenText
            ? "text_only"
            : "action";
    lines.push({
      id: str(o.id, `line_${String(i + 1).padStart(2, "0")}`),
      speaker: str(o.speaker, kind === "vo" ? "VO" : "TALENT"),
      dialogue,
      timing: str(o.timing) || undefined,
      delivery: str(o.delivery) || undefined,
      onScreenText: onScreenText || undefined,
      kind,
    });
  }
  return lines;
}

function parseHowTo(raw: unknown): HowToShoot {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    steps: strArr(o.steps),
    commonMistakes: strArr(o.commonMistakes),
    continuity: strArr(o.continuity),
  };
}

function asStatus(v: unknown): ShotStatus {
  if (
    v === "ready" ||
    v === "shooting" ||
    v === "completed" ||
    v === "needs_pickup" ||
    v === "dropped"
  ) {
    return v;
  }
  return "planned";
}

export function parseContentShots(raw: unknown): ContentShot[] {
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as { shots?: unknown })?.shots)
      ? (raw as { shots: unknown[] }).shots
      : [];
  const shots: ContentShot[] = [];
  for (let i = 0; i < list.length; i++) {
    const o = (list[i] && typeof list[i] === "object" ? list[i] : {}) as Record<
      string,
      unknown
    >;
    const shotNumber = num(o.shotNumber, i + 1);
    const visualDescription = str(o.visualDescription);
    const shotName = str(o.shotName, `Shot ${shotNumber}`);
    if (!visualDescription && !shotName) continue;
    const howToShoot = parseHowTo(o.howToShoot);
    if (!howToShoot.steps.length) {
      howToShoot.steps = [
        "Set camera and lens as listed for this shot.",
        "Frame using composition notes, then roll before action starts.",
        "Capture the full action plus 2 seconds of pad after the beat.",
        `Repeat for ${num(o.takesRecommended, 3)} takes.`,
      ];
    }
    shots.push({
      id: str(o.id, `shot_${String(shotNumber).padStart(2, "0")}`),
      shotNumber,
      shotName,
      storyPurpose: str(o.storyPurpose),
      startTime: str(o.startTime, "0:00"),
      endTime: str(o.endTime, "0:00"),
      estimatedDuration: str(o.estimatedDuration, "2s"),
      visualDescription,
      shotSize: str(o.shotSize, "MS"),
      cameraBody: str(o.cameraBody) || undefined,
      lens: str(o.lens) || undefined,
      focalLength: str(o.focalLength) || undefined,
      frameRate: str(o.frameRate) || undefined,
      shutter: str(o.shutter) || undefined,
      aperture: str(o.aperture) || undefined,
      isoStrategy: str(o.isoStrategy) || undefined,
      whiteBalance: str(o.whiteBalance) || undefined,
      ndRecommendation: str(o.ndRecommendation) || undefined,
      cameraHeight: str(o.cameraHeight) || undefined,
      cameraDistance: str(o.cameraDistance) || undefined,
      cameraAngle: str(o.cameraAngle) || undefined,
      movement: str(o.movement, "Locked"),
      movementInstructions: str(o.movementInstructions) || undefined,
      composition: str(o.composition) || undefined,
      subjectPlacement: str(o.subjectPlacement) || undefined,
      foreground: str(o.foreground) || undefined,
      background: str(o.background) || undefined,
      depthNotes: str(o.depthNotes) || undefined,
      headroom: str(o.headroom) || undefined,
      lookRoom: str(o.lookRoom) || undefined,
      focusStrategy: str(o.focusStrategy) || undefined,
      focusStart: str(o.focusStart) || undefined,
      focusEnd: str(o.focusEnd) || undefined,
      lightingIntent: str(o.lightingIntent) || undefined,
      keyLightDirection: str(o.keyLightDirection) || undefined,
      fillStrategy: str(o.fillStrategy) || undefined,
      backlightStrategy: str(o.backlightStrategy) || undefined,
      practicals: str(o.practicals) || undefined,
      motivatedSource: str(o.motivatedSource) || undefined,
      setDesignIdeas: str(o.setDesignIdeas) || undefined,
      setDressing: (() => {
        const items = strArr(o.setDressing).slice(0, 8);
        return items.length ? items : undefined;
      })(),
      performanceDirection: str(o.performanceDirection) || undefined,
      blocking: str(o.blocking) || undefined,
      propAction: str(o.propAction) || undefined,
      productionAudio: str(o.productionAudio) || undefined,
      editorNotes: str(o.editorNotes) || undefined,
      transitionInto: str(o.transitionInto) || undefined,
      transitionOut: str(o.transitionOut) || undefined,
      speedRampNotes: str(o.speedRampNotes) || undefined,
      referenceImageUrl: str(o.referenceImageUrl) || undefined,
      cutTrigger: str(o.cutTrigger) || undefined,
      soundEffects: str(o.soundEffects) || undefined,
      foley: str(o.foley) || undefined,
      musicCue: str(o.musicCue) || undefined,
      graphics: str(o.graphics) || undefined,
      colorLook: str(o.colorLook) || undefined,
      coveragePriority: str(o.coveragePriority) || undefined,
      takesRecommended: num(o.takesRecommended, 3),
      safetyShot: Boolean(o.safetyShot),
      pickupNeeded: Boolean(o.pickupNeeded),
      howToShoot,
      status: asStatus(o.status),
      teachMeNotes: str(o.teachMeNotes) || undefined,
    });
  }
  return shots;
}
