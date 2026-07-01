import { callGeminiJsonText } from "@/lib/scout/geminiClient";
import { scoutAiUsesMock } from "@/lib/scout/cineScoutAi";
import { buildCrewPacketBase } from "@/lib/production/buildCrewPacketBase";
import {
  buildFallbackLightingTargets,
  buildFallbackRoleSections,
} from "@/lib/production/crewPacketFallback";
import {
  CrewPacketLightingRow,
  CrewPacketRoleSection,
  CrewPrintoutPacket,
  CrewPacketRoleId,
  CREW_PACKET_ROLE_LABELS,
} from "@/lib/production/crewPacketTypes";
import { ProductionBoard, ProductionDay } from "@/lib/production/types";
import { ScriptDocument } from "@/lib/scriptWriter/types";
import { DEFAULT_CREW_ROLE_ORDER, defaultRoleTitle } from "@/lib/production/buildCrewPacketBase";

const CREW_PACKET_SYSTEM = `You generate on-set crew printout packets for short film and commercial productions.
Return ONLY valid JSON matching the schema. Be specific to the project — no generic filler.

Each role section must include:
- roleFocus: 3-5 bullets about what THIS role cares about on THIS shoot
- onSetChecklist: 4-6 actionable checkbox items for set
- shotPriorities: subset of master shots relevant to that role, with a short roleNote per shot

Role IDs (use exactly): director_producer, dp_camera, gaffer_lighting, sound, talent, art_props

Rules:
- director_producer sees all or most story-critical shots
- dp_camera: coverage, camera movement, framing — skip pure audio-only rows unless camera still rolls
- gaffer_lighting: shots where lighting is critical
- sound: inserts, scares, dialogue, room tone, appliance/prop sounds
- talent: performance shots with the actor on camera
- art_props: inserts, props, continuity, duplicates, screen inserts
- lightingTargets: 3-6 rows with setup, howToMeter, target, notes — use gear/metering language when provided`;

function buildUserPrompt(base: ReturnType<typeof buildCrewPacketBase>): string {
  const shotsJson = JSON.stringify(base.masterShots.slice(0, 60), null, 0);
  return `Project: ${base.title}
Premise: ${base.premise}
Locations: ${base.primaryLocations.join(", ")}
Visual tone: ${base.visualTone}
Beats: ${base.beats.map((b) => `${b.beat}: ${b.description}`).join(" | ")}

Master shot list (${base.masterShots.length} shots):
${shotsJson}

Generate lightingTargets and roleSections for all six crew roles.`;
}

function parseRoleId(raw: string): CrewPacketRoleId | null {
  const key = raw.trim() as CrewPacketRoleId;
  return CREW_PACKET_ROLE_LABELS[key] ? key : null;
}

function parseRoleSections(raw: unknown, masterShots: CrewPrintoutPacket["masterShots"]): CrewPacketRoleSection[] {
  if (!Array.isArray(raw)) return buildFallbackRoleSections(masterShots);
  const validNumbers = new Set(masterShots.map((s) => s.shotNumber));
  const masterByNumber = new Map(masterShots.map((s) => [s.shotNumber, s]));

  const sections: CrewPacketRoleSection[] = [];
  for (const item of raw) {
    const row = item as Partial<CrewPacketRoleSection>;
    const roleId = parseRoleId(String(row.roleId ?? ""));
    if (!roleId) continue;
    const shotPriorities = (Array.isArray(row.shotPriorities) ? row.shotPriorities : [])
      .map((sp) => {
        const s = sp as Partial<CrewPacketRoleSection["shotPriorities"][0]>;
        const num = Number(s.shotNumber);
        if (!validNumbers.has(num)) return null;
        const master = masterByNumber.get(num)!;
        return {
          shotNumber: num,
          location: s.location?.trim() || master.location,
          shotLabel: s.shotLabel?.trim() || master.shotLabel,
          action: s.action?.trim() || master.action,
          roleNote: s.roleNote?.trim() || "—",
        };
      })
      .filter(Boolean) as CrewPacketRoleSection["shotPriorities"];

    sections.push({
      roleId,
      title: row.title?.trim() || defaultRoleTitle(roleId),
      roleFocus: Array.isArray(row.roleFocus)
        ? row.roleFocus.filter((f): f is string => typeof f === "string" && f.trim().length > 0).slice(0, 6)
        : [],
      onSetChecklist: Array.isArray(row.onSetChecklist)
        ? row.onSetChecklist.filter((f): f is string => typeof f === "string" && f.trim().length > 0).slice(0, 8)
        : [],
      shotPriorities,
    });
  }

  const seen = new Set(sections.map((s) => s.roleId));
  for (const roleId of DEFAULT_CREW_ROLE_ORDER) {
    if (!seen.has(roleId)) {
      sections.push(buildFallbackRoleSections(masterShots).find((s) => s.roleId === roleId)!);
    }
  }
  return sections.sort(
    (a, b) => DEFAULT_CREW_ROLE_ORDER.indexOf(a.roleId) - DEFAULT_CREW_ROLE_ORDER.indexOf(b.roleId)
  );
}

function parseLightingTargets(raw: unknown, fallback: CrewPacketLightingRow[]): CrewPacketLightingRow[] {
  if (!Array.isArray(raw) || raw.length === 0) return fallback;
  const rows = raw
    .map((item) => {
      const row = item as Partial<CrewPacketLightingRow>;
      if (!row.setup?.trim()) return null;
      return {
        setup: row.setup.trim(),
        howToMeter: row.howToMeter?.trim() || "Meter at subject face",
        target: row.target?.trim() || "T2.8",
        notes: row.notes?.trim() || "—",
      };
    })
    .filter(Boolean) as CrewPacketLightingRow[];
  return rows.length ? rows.slice(0, 8) : fallback;
}

export async function generateCrewPacket(params: {
  board: ProductionBoard;
  day: ProductionDay;
  script?: ScriptDocument | null;
  projectName: string;
}): Promise<CrewPrintoutPacket> {
  const base = buildCrewPacketBase(params);
  const fallbackLighting = buildFallbackLightingTargets(base.masterShots);
  const fallbackRoles = buildFallbackRoleSections(base.masterShots);

  if (base.masterShots.length === 0) {
    return {
      ...base,
      lightingTargets: fallbackLighting,
      roleSections: fallbackRoles,
      generatedAt: new Date().toISOString(),
    };
  }

  if (scoutAiUsesMock()) {
    return {
      ...base,
      lightingTargets: fallbackLighting,
      roleSections: fallbackRoles,
      generatedAt: new Date().toISOString(),
    };
  }

  try {
    const raw = (await callGeminiJsonText(
      `${CREW_PACKET_SYSTEM}

Return JSON:
{
  "lightingTargets": [{ "setup", "howToMeter", "target", "notes" }],
  "roleSections": [{
    "roleId": "director_producer|dp_camera|gaffer_lighting|sound|talent|art_props",
    "title": "optional",
    "roleFocus": ["string"],
    "onSetChecklist": ["string"],
    "shotPriorities": [{ "shotNumber", "location", "shotLabel", "action", "roleNote" }]
  }]
}`,
      buildUserPrompt(base)
    )) as {
      lightingTargets?: unknown;
      roleSections?: unknown;
    };

    return {
      ...base,
      lightingTargets: parseLightingTargets(raw.lightingTargets, fallbackLighting),
      roleSections: parseRoleSections(raw.roleSections, base.masterShots),
      generatedAt: new Date().toISOString(),
    };
  } catch {
    return {
      ...base,
      lightingTargets: fallbackLighting,
      roleSections: fallbackRoles,
      generatedAt: new Date().toISOString(),
    };
  }
}
