import type {
  ColorPlan,
  DavinciBlueprint,
  EditInstruction,
  EditMapItem,
  EditPlan,
  LightingPlan,
  MusicPlan,
  MusicStructureBeat,
  SoundCue,
  SoundCueType,
  SoundPlan,
} from "@/lib/contentPlan/types";

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v.trim() : fallback;
}

function strArr(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    .map((x) => x.trim());
}

function asSoundType(v: unknown): SoundCueType {
  if (v === "foley" || v === "designed_sfx" || v === "ambience" || v === "production") {
    return v;
  }
  return "designed_sfx";
}

function parseCues(raw: unknown, fallbackType: SoundCueType): SoundCue[] {
  if (!Array.isArray(raw)) return [];
  const out: SoundCue[] = [];
  for (let i = 0; i < raw.length; i++) {
    const o = (raw[i] && typeof raw[i] === "object" ? raw[i] : {}) as Record<string, unknown>;
    const soundName = str(o.soundName);
    if (!soundName) continue;
    out.push({
      id: str(o.id, `${fallbackType}_${String(i + 1).padStart(2, "0")}`),
      soundName,
      soundType: asSoundType(o.soundType) || fallbackType,
      timelinePosition: str(o.timelinePosition, "0:00"),
      associatedShotId: str(o.associatedShotId) || undefined,
      associatedShotLabel: str(o.associatedShotLabel) || undefined,
      purpose: str(o.purpose),
      levelDirection: str(o.levelDirection) || undefined,
      fadeDirection: str(o.fadeDirection) || undefined,
    });
  }
  return out;
}

export function parseEditPlan(raw: unknown): EditPlan {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const instructionsRaw = Array.isArray(o.instructions) ? o.instructions : [];
  const mapRaw = Array.isArray(o.map) ? o.map : [];

  const instructions: EditInstruction[] = [];
  for (let i = 0; i < instructionsRaw.length; i++) {
    const row = (instructionsRaw[i] && typeof instructionsRaw[i] === "object"
      ? instructionsRaw[i]
      : {}) as Record<string, unknown>;
    const fromShotId = str(row.fromShotId);
    const toShotId = str(row.toShotId);
    if (!fromShotId && !toShotId && !str(row.cutTrigger)) continue;
    instructions.push({
      id: str(row.id, `edit_${String(i + 1).padStart(2, "0")}`),
      fromShotId: fromShotId || `shot_${i}`,
      toShotId: toShotId || `shot_${i + 1}`,
      fromShotLabel: str(row.fromShotLabel) || undefined,
      toShotLabel: str(row.toShotLabel) || undefined,
      approximateTimelinePosition: str(row.approximateTimelinePosition, "0:00"),
      editType: str(row.editType, "Hard Cut"),
      cutTrigger: str(row.cutTrigger),
      why: str(row.why),
      speedNotes: str(row.speedNotes) || undefined,
      teachMeNotes: str(row.teachMeNotes) || undefined,
    });
  }

  const map: EditMapItem[] = [];
  for (let i = 0; i < mapRaw.length; i++) {
    const row = (mapRaw[i] && typeof mapRaw[i] === "object" ? mapRaw[i] : {}) as Record<
      string,
      unknown
    >;
    const shotLabel = str(row.shotLabel, `Shot ${i + 1}`);
    map.push({
      id: str(row.id, `map_${String(i + 1).padStart(2, "0")}`),
      startTime: str(row.startTime, "0:00"),
      endTime: str(row.endTime, "0:00"),
      shotId: str(row.shotId, `shot_${String(i + 1).padStart(2, "0")}`),
      shotLabel,
      note: str(row.note) || undefined,
      transitionToNext: str(row.transitionToNext) || undefined,
    });
  }

  const tracks =
    o.davinciTracks && typeof o.davinciTracks === "object"
      ? (o.davinciTracks as Record<string, unknown>)
      : null;

  return {
    philosophy: str(o.philosophy),
    instructions,
    map,
    davinciTracks: tracks
      ? {
          video: strArr(tracks.video),
          audio: strArr(tracks.audio),
        }
      : undefined,
    timelineNotes: strArr(o.timelineNotes),
  };
}

export function parseSoundPlan(raw: unknown): SoundPlan {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    overview: str(o.overview),
    productionAudio: parseCues(o.productionAudio, "production"),
    foley: parseCues(o.foley, "foley"),
    designedSfx: parseCues(o.designedSfx, "designed_sfx"),
    mixNotes: strArr(o.mixNotes),
  };
}

export function parseMusicPlan(raw: unknown): MusicPlan {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const structureRaw = Array.isArray(o.structure) ? o.structure : [];
  const structure: MusicStructureBeat[] = [];
  for (const item of structureRaw) {
    const row = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
    const time = str(row.time);
    const note = str(row.note);
    if (!time && !note) continue;
    structure.push({ time: time || "0:00", note });
  }
  return {
    style: str(o.style),
    mood: str(o.mood),
    bpm: str(o.bpm),
    instrumentation: str(o.instrumentation),
    energyCurve: str(o.energyCurve),
    structure,
    beatCutOpportunities: strArr(o.beatCutOpportunities),
    beginAt: str(o.beginAt) || undefined,
    liftAt: str(o.liftAt) || undefined,
    dropAt: str(o.dropAt) || undefined,
    resolveAt: str(o.resolveAt) || undefined,
  };
}

export function parseColorPlan(raw: unknown): ColorPlan {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    lookName: str(o.lookName, "Natural look"),
    contrast: str(o.contrast),
    saturation: str(o.saturation),
    skinToneDirection: str(o.skinToneDirection),
    highlightTreatment: str(o.highlightTreatment),
    shadowTreatment: str(o.shadowTreatment),
    whiteBalanceIntent: str(o.whiteBalanceIntent),
    colorTemperatureContrast: str(o.colorTemperatureContrast) || undefined,
    grain: str(o.grain) || undefined,
    halation: str(o.halation) || undefined,
    vignette: str(o.vignette) || undefined,
    notes: strArr(o.notes),
  };
}

export function parseLightingPlan(raw: unknown): LightingPlan {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const setupsRaw = Array.isArray(o.setupByLocation) ? o.setupByLocation : [];
  const setupByLocation = setupsRaw
    .map((item) => {
      const row = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
      return {
        location: str(row.location),
        setup: str(row.setup),
      };
    })
    .filter((s) => s.location || s.setup);

  return {
    overview: str(o.overview),
    motivatedSource: str(o.motivatedSource),
    key: str(o.key),
    fill: str(o.fill),
    negativeFill: str(o.negativeFill) || undefined,
    backlight: str(o.backlight) || undefined,
    practicals: str(o.practicals) || undefined,
    backgroundSeparation: str(o.backgroundSeparation) || undefined,
    colorTemperature: str(o.colorTemperature) || undefined,
    exposurePriorities: str(o.exposurePriorities) || undefined,
    setupByLocation: setupByLocation.length ? setupByLocation : undefined,
    gearRecommendations: strArr(o.gearRecommendations),
    teachMeNotes: str(o.teachMeNotes) || undefined,
  };
}

export function parseDavinciBlueprint(raw: unknown, edit?: EditPlan | null): DavinciBlueprint {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const eventsRaw = Array.isArray(o.events) ? o.events : [];
  const events = eventsRaw
    .map((item, i) => {
      const row = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
      return {
        timelineStart: str(row.timelineStart, "0:00"),
        timelineEnd: str(row.timelineEnd) || undefined,
        shotId: str(row.shotId) || undefined,
        shotLabel: str(row.shotLabel) || undefined,
        note: str(row.note, `Event ${i + 1}`),
      };
    })
    .filter((e) => e.note);

  const video =
    strArr(o.videoTracks).length > 0
      ? strArr(o.videoTracks)
      : edit?.davinciTracks?.video?.length
        ? edit.davinciTracks.video
        : ["V1 — Main Footage", "V2 — B-Roll / Overlays", "V3 — Titles / Graphics"];
  const audio =
    strArr(o.audioTracks).length > 0
      ? strArr(o.audioTracks)
      : edit?.davinciTracks?.audio?.length
        ? edit.davinciTracks.audio
        : [
            "A1 — Dialogue",
            "A2 — Production Sound",
            "A3 — Foley",
            "A4 — SFX",
            "A5 — Music",
            "A6 — Ambience",
          ];

  return {
    videoTracks: video,
    audioTracks: audio,
    assemblyNotes: strArr(o.assemblyNotes),
    events:
      events.length > 0
        ? events
        : (edit?.map || []).map((m) => ({
            timelineStart: m.startTime,
            timelineEnd: m.endTime,
            shotId: m.shotId,
            shotLabel: m.shotLabel,
            note: m.transitionToNext
              ? `${m.shotLabel} → ${m.transitionToNext}`
              : m.shotLabel,
          })),
  };
}
