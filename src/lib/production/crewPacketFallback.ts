import {
  CrewPacketLightingRow,
  CrewPacketMasterShot,
  CrewPacketRoleSection,
  CrewPacketRoleShot,
  CrewPacketRoleId,
  CREW_PACKET_ROLE_LABELS,
} from "@/lib/production/crewPacketTypes";
import { DEFAULT_CREW_ROLE_ORDER, defaultRoleTitle } from "@/lib/production/buildCrewPacketBase";

function roleShot(
  shot: CrewPacketMasterShot,
  roleNote: string
): CrewPacketRoleShot {
  return {
    shotNumber: shot.shotNumber,
    location: shot.location,
    shotLabel: shot.shotLabel,
    action: shot.action,
    roleNote,
  };
}

function isAudioHeavy(shot: CrewPacketMasterShot): boolean {
  return /audio|sound|thump|scrape|hum|whisper|breath|silence|motor|creak|beep/i.test(
    `${shot.action} ${shot.lightingNotes} ${shot.shotLabel}`
  );
}

function isInsertOrProp(shot: CrewPacketMasterShot): boolean {
  return /insert|phone|bowl|popcorn|microwave|remote|recliner|prop|display|text|title/i.test(
    `${shot.shotLabel} ${shot.action}`
  );
}

function isPerformance(shot: CrewPacketMasterShot): boolean {
  return /she |he |stormij|whisper|scream|react|freeze|look|eat|walk|pour|spin|dialogue|"/i.test(
    shot.action
  );
}

function filterShotsForRole(
  roleId: CrewPacketRoleId,
  shots: CrewPacketMasterShot[]
): CrewPacketRoleShot[] {
  switch (roleId) {
    case "director_producer":
      return shots.map((s) => roleShot(s, "Story & pacing"));
    case "dp_camera":
      return shots
        .filter(
          (s) =>
            !/audio only|title card|black/i.test(`${s.shotLabel} ${s.action}`) &&
            !/^insert$/i.test(s.shotLabel)
        )
        .map((s) => roleShot(s, "Coverage & camera"));
    case "gaffer_lighting":
      return shots
        .filter(
          (s) =>
            s.lightingNotes !== "—" ||
            /wide|medium|close|theater|kitchen|hallway|exterior|porch/i.test(
              `${s.location} ${s.shotLabel}`
            )
        )
        .map((s) => roleShot(s, s.lightingNotes !== "—" ? s.lightingNotes : "Light this setup"));
    case "sound":
      return shots.filter((s) => isAudioHeavy(s)).map((s) => roleShot(s, "Capture clean audio"));
    case "talent":
      return shots.filter((s) => isPerformance(s)).map((s) => roleShot(s, "Performance beat"));
    case "art_props":
      return shots
        .filter((s) => isInsertOrProp(s) || /wide|reset|duplicate/i.test(s.action))
        .map((s) => roleShot(s, "Continuity & props"));
    default:
      return [];
  }
}

const ROLE_FOCUS: Record<CrewPacketRoleId, string[]> = {
  director_producer: [
    "Protect story rhythm and escalation — safe, strange, impossible, reveal.",
    "Prioritize must-have story beats if time runs short.",
    "Keep performances grounded; curiosity before terror.",
    "Do not over-explain scares — let negative space work.",
  ],
  dp_camera: [
    "Confirm frame rate and shutter before rolling.",
    "Use lens plan: wide for space, medium for action, long lens for compression.",
    "Motivated keys — screen side in theater, warm practicals in kitchen.",
    "Shoot clean plates for VFX or security-feed inserts when noted.",
  ],
  gaffer_lighting: [
    "Meter face before each hero setup; keep horror look dark, not bright.",
    "Kitchen warm and safe; theater cold and dangerous.",
    "Hallways and backgrounds 2+ stops under subject when possible.",
    "Check practicals and screen flicker before takes.",
  ],
  sound: [
    "Quiet sets beat loud fixes — control HVAC, appliances, and fan noise.",
    "Capture room tone in every location.",
    "Record wild tracks for props: doors, appliances, movement, whispers.",
    "Protect silence on scare beats — do not step on pauses.",
  ],
  talent: [
    "Start relaxed; fear builds slowly across the scene.",
    "Small reactions: eyes, breath, stillness before big beats.",
    "Hold continuity on wardrobe, props, and emotional line.",
    "Save the biggest reaction for the undeniable scare.",
  ],
  art_props: [
    "Track hero props — duplicates, phones, food, remotes, set dressing.",
    "Reset positions for time-loop or repeat setups.",
    "Prep screen inserts and practical effects before rolling.",
    "Match bowls, blankets, and recliner positions for continuity.",
  ],
};

const ROLE_CHECKLIST: Record<CrewPacketRoleId, string[]> = {
  director_producer: [
    "Confirm set is quiet and controlled before rolling.",
    "Get clean room tone in each location.",
    "Shoot inserts after performances when possible.",
    "Circle priority shots if schedule slips.",
  ],
  dp_camera: [
    "White balance and exposure set for each location look.",
    "Shoot clean plates for VFX or screen inserts.",
    "Check focus in low light; verify movement path is clear.",
    "Confirm media is rolling and slated.",
  ],
  gaffer_lighting: [
    "Meter subject face before each setup.",
    "Check practical bulbs and screen for flicker.",
    "Keep background darker than subject in horror beats.",
    "Add subtle rim so subject separates from black backgrounds.",
  ],
  sound: [
    "Record 30 seconds room tone per location.",
    "Capture wild tracks for key props and scares.",
    "Confirm lav/boom plan before each scene.",
    "Note silence cues for post — do not talk over pauses.",
  ],
  talent: [
    "Confirm wardrobe and props before each setup.",
    "Review dialogue lines and whisper levels.",
    "Note reset positions for repeat wide shots.",
    "Hydrate — horror tension is physical work.",
  ],
  art_props: [
    "Prep duplicate props and screen inserts.",
    "Track reset positions for repeat setups.",
    "Photo continuity references for hero props.",
    "Confirm microwave/practical effects are safe and repeatable.",
  ],
};

export function buildFallbackLightingTargets(
  shots: CrewPacketMasterShot[]
): CrewPacketLightingRow[] {
  const locations = [...new Set(shots.map((s) => s.location).filter((l) => l && l !== "—"))];
  const rows: CrewPacketLightingRow[] = [];
  for (const location of locations.slice(0, 4)) {
    const sample = shots.find((s) => s.location === location);
    rows.push({
      setup: `${location} — hero face`,
      howToMeter: "Meter at subject face, dome toward key source",
      target: /kitchen|warm/i.test(location + (sample?.lightingNotes ?? "")) ? "T2.8 warm key" : "T2.0–T2.8 motivated key",
      notes: sample?.lightingNotes !== "—" ? sample!.lightingNotes : "Keep background underexposed for mood",
    });
  }
  return rows;
}

export function buildFallbackRoleSections(
  shots: CrewPacketMasterShot[]
): CrewPacketRoleSection[] {
  return DEFAULT_CREW_ROLE_ORDER.map((roleId) => ({
    roleId,
    title: defaultRoleTitle(roleId),
    roleFocus: ROLE_FOCUS[roleId],
    onSetChecklist: ROLE_CHECKLIST[roleId],
    shotPriorities: filterShotsForRole(roleId, shots),
  }));
}

export function roleSectionSummary(roleId: CrewPacketRoleId): string {
  return CREW_PACKET_ROLE_LABELS[roleId];
}
