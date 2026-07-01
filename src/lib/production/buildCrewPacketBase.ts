import { formatShotTypeLabel } from "@/lib/production/shotLabels";
import {
  CrewPacketBeat,
  CrewPacketMasterShot,
  CrewPrintoutPacket,
  CREW_PACKET_ROLE_LABELS,
  CrewPacketRoleId,
} from "@/lib/production/crewPacketTypes";
import { ProductionBoard, ProductionDay } from "@/lib/production/types";
import { ScriptDocument, ScriptScene, ScriptSuggestedShot } from "@/lib/scriptWriter/types";

export function locationFromSceneHeading(heading: string): string {
  const cleaned = heading.trim();
  const match = cleaned.match(/(?:INT\.|EXT\.|I\/E\.)\s+([^-–]+)/i);
  if (match) return match[1].trim();
  const dash = cleaned.split(/[-–]/)[0]?.trim();
  return dash || cleaned || "—";
}

function sceneMap(script?: ScriptDocument | null): Map<string, ScriptScene> {
  const map = new Map<string, ScriptScene>();
  for (const scene of script?.scenes ?? []) {
    map.set(scene.sceneNumber.trim(), scene);
  }
  return map;
}

function shotLabelFromSuggested(shot: ScriptSuggestedShot): string {
  if (shot.shotName?.trim()) return shot.shotName.trim();
  return formatShotTypeLabel(shot.shotType);
}

function shotLabelFromDay(shot: ProductionDay["shots"][0]): string {
  if (shot.shotName?.trim()) return shot.shotName.trim();
  if (shot.shotType) return formatShotTypeLabel(shot.shotType);
  return shot.label.replace(/^\d+\.\s*/, "");
}

function parseLightingFromNotes(notes?: string): string {
  if (!notes?.trim()) return "—";
  const parts = notes.split(" · ");
  const lighting = parts.find((p) =>
    /light|t\d|stop|warm|cool|blue|practical|moon|key|fill|rim/i.test(p)
  );
  return lighting?.trim() || parts[parts.length - 1]?.trim() || notes.trim();
}

export function buildMasterShots(
  day: ProductionDay,
  script?: ScriptDocument | null
): CrewPacketMasterShot[] {
  const scenes = sceneMap(script);
  const suggested = script?.suggestedShots ?? [];
  const suggestedByNumber = new Map(suggested.map((s) => [s.shotNumber, s]));

  if (day.shots.length > 0) {
    return [...day.shots]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((shot, index) => {
        const num = shot.scoutShotNumber ?? index + 1;
        const suggestedShot = suggestedByNumber.get(num);
        const sceneRef = shot.sceneRef ?? suggestedShot?.sceneNumber;
        const scene = sceneRef ? scenes.get(sceneRef.trim()) : undefined;
        const location = scene ? locationFromSceneHeading(scene.heading) : day.primaryLocation || "—";
        const action =
          shot.subjectAction?.trim() ||
          suggestedShot?.subjectAction?.trim() ||
          suggestedShot?.description?.trim() ||
          shot.notes?.split(" · ")[0]?.trim() ||
          shot.label;
        const lightingNotes =
          suggestedShot?.lighting?.trim() ||
          parseLightingFromNotes(shot.notes) ||
          "—";
        return {
          shotNumber: num,
          location,
          shotLabel: suggestedShot ? shotLabelFromSuggested(suggestedShot) : shotLabelFromDay(shot),
          action,
          lightingNotes,
        };
      });
  }

  return suggested
    .slice()
    .sort((a, b) => a.shotNumber - b.shotNumber)
    .map((shot) => {
      const scene = scenes.get(shot.sceneNumber.trim());
      return {
        shotNumber: shot.shotNumber,
        location: scene ? locationFromSceneHeading(scene.heading) : "—",
        shotLabel: shotLabelFromSuggested(shot),
        action: shot.subjectAction?.trim() || shot.description.trim(),
        lightingNotes: shot.lighting?.trim() || "—",
      };
    });
}

function buildBeats(script?: ScriptDocument | null): CrewPacketBeat[] {
  const pack = script?.productionPack;
  if (pack?.timedBeats?.length) {
    return pack.timedBeats.map((b, i) => ({
      beat: b.visual.slice(0, 48) || `Beat ${i + 1}`,
      description: [b.visual, b.dialogue, b.audio, b.onScreenText].filter(Boolean).join(" · "),
    }));
  }
  if (script?.scenes?.length) {
    return script.scenes.map((scene) => ({
      beat: scene.heading.trim(),
      description: scene.action.trim().slice(0, 280) || scene.heading.trim(),
    }));
  }
  return [];
}

function buildVisualTone(script?: ScriptDocument | null, board?: ProductionBoard | null): string {
  const parts: string[] = [];
  const look = script?.lookAndFeel?.trim() || board?.lookAndFeel?.trim();
  if (look) parts.push(look);
  const cinematic = script?.productionPack?.cinematicLook;
  if (cinematic?.lighting) parts.push(cinematic.lighting);
  if (cinematic?.color) parts.push(cinematic.color);
  if (cinematic?.cameraStyle) parts.push(cinematic.cameraStyle);
  if (script?.productionPack?.tone) parts.push(script.productionPack.tone);
  return parts.join(". ") || "—";
}

function buildLocations(script?: ScriptDocument | null, board?: ProductionBoard | null): string[] {
  const set = new Set<string>();
  for (const loc of script?.productionPack?.locationNotes ?? []) {
    if (loc.trim()) set.add(loc.trim());
  }
  for (const loc of board?.locations ?? []) {
    if (loc.name.trim()) set.add(loc.name.trim());
  }
  for (const scene of script?.scenes ?? []) {
    const name = locationFromSceneHeading(scene.heading);
    if (name && name !== "—") set.add(name);
  }
  return Array.from(set);
}

export function buildCrewPacketBase(params: {
  board: ProductionBoard;
  day: ProductionDay;
  script?: ScriptDocument | null;
  projectName: string;
}): Omit<CrewPrintoutPacket, "roleSections" | "lightingTargets"> & {
  roleSections: [];
  lightingTargets: [];
} {
  const { board, day, script, projectName } = params;
  const title = board.filmTitle?.trim() || script?.title?.trim() || projectName;
  const premise =
    script?.productionPack?.premise?.trim() ||
    script?.logline?.trim() ||
    board.logline?.trim() ||
    "—";

  return {
    title,
    subtitle: `Crew Printout Packet — Day ${day.dayNumber}${day.title ? `: ${day.title}` : ""}`,
    premise,
    primaryLocations: buildLocations(script, board),
    visualTone: buildVisualTone(script, board),
    beats: buildBeats(script),
    masterShots: buildMasterShots(day, script),
    lightingTargets: [],
    roleSections: [],
    generatedAt: new Date().toISOString(),
  };
}

export const DEFAULT_CREW_ROLE_ORDER: CrewPacketRoleId[] = [
  "director_producer",
  "dp_camera",
  "gaffer_lighting",
  "sound",
  "talent",
  "art_props",
];

export function defaultRoleTitle(roleId: CrewPacketRoleId): string {
  return `${CREW_PACKET_ROLE_LABELS[roleId]} Printout`;
}
