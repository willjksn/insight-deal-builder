import { ScoutGearList, ScoutGearProfile, ScoutProject } from "@/lib/scout/types";

export function parseGearList(value?: string): string[] {
  if (!value?.trim()) return [];
  return [...new Set(value.split(/[,;]/).map((s) => s.trim()).filter(Boolean))];
}

function pickAvailable(
  sessionValues: string[],
  profileValues: string[],
  masterValues: string[]
): string[] {
  if (profileValues.length) return profileValues;
  if (masterValues.length) return masterValues;
  return sessionValues.filter(Boolean);
}

export type ScoutGearInventory = {
  cameraBodies: string[];
  lenses: string[];
  lights: string[];
  modifiers: string[];
  audio: string[];
  stabilization: string[];
  profileName?: string;
  fromMasterList?: boolean;
};

export function inventoryFromGearList(gearList: ScoutGearList): Omit<ScoutGearInventory, "profileName" | "fromMasterList"> {
  return {
    cameraBodies: gearList.cameraBodies ?? [],
    lenses: gearList.lenses ?? [],
    lights: [...(gearList.lights ?? []), ...(gearList.modifiers ?? [])],
    modifiers: gearList.modifiers ?? [],
    audio: gearList.audio ?? [],
    stabilization: [...(gearList.stabilizers ?? []), ...(gearList.tripods ?? [])],
  };
}

export function buildGearInventory(
  project: ScoutProject,
  gearProfile?: ScoutGearProfile | null,
  gearList?: ScoutGearList | null
): ScoutGearInventory {
  const master = gearList ? inventoryFromGearList(gearList) : null;
  const profileLights = [...(gearProfile?.lights ?? []), ...(gearProfile?.modifiers ?? [])];

  const cameraBodies = pickAvailable(
    parseGearList(project.cameraBody),
    gearProfile?.cameraBodies ?? [],
    master?.cameraBodies ?? []
  );
  const lenses = pickAvailable(
    parseGearList(project.lensOptions),
    gearProfile?.lenses ?? [],
    master?.lenses ?? []
  );
  const lights = pickAvailable(parseGearList(project.lightingGear), profileLights, master?.lights ?? []);
  const audio = pickAvailable(
    parseGearList(project.audioGear),
    gearProfile?.audio ?? [],
    master?.audio ?? []
  );
  const stabilization = pickAvailable(
    parseGearList(project.stabilizationGear),
    [...(gearProfile?.stabilizers ?? []), ...(gearProfile?.tripods ?? [])],
    master?.stabilization ?? []
  );

  return {
    cameraBodies,
    lenses,
    lights,
    modifiers: gearProfile?.modifiers ?? master?.modifiers ?? [],
    audio,
    stabilization,
    profileName: gearProfile?.name,
    fromMasterList: !gearProfile?.name && Boolean(master && (master.cameraBodies.length || master.lenses.length)),
  };
}

function formatInventoryList(label: string, items: string[]): string {
  if (!items.length) return `${label}: (none listed — ask user or use only what they typed in session fields)`;
  return `${label}:\n${items.map((item) => `  - ${item}`).join("\n")}`;
}

export function buildGearInventoryBlock(inventory: ScoutGearInventory): string {
  const header = inventory.profileName
    ? `Gear kit "${inventory.profileName}" — choose ONLY from these items:`
    : inventory.fromMasterList
      ? "Your saved gear list — choose ONLY from these items:"
      : "Available gear for this session — choose ONLY from these items:";

  return [
    header,
    formatInventoryList("Camera bodies", inventory.cameraBodies),
    formatInventoryList("Lenses", inventory.lenses),
    formatInventoryList("Lights & modifiers", inventory.lights),
    formatInventoryList("Audio", inventory.audio),
    formatInventoryList("Stabilization", inventory.stabilization),
  ].join("\n");
}

export const GEAR_CONSTRAINT_INSTRUCTIONS = `When recommending camera, lens, lights, audio, or stabilization:
- Pick the best fit for the scene idea, mood, and location from the AVAILABLE GEAR lists only.
- Use exact model names from those lists (do not substitute brands or gear the user does not own).
- Explain briefly why each chosen item fits this scene.
- If the scene idea implies a lens or light the user does not have, recommend the closest option they DO have and note the tradeoff.`;

export function gearListHasItems(gearList: ScoutGearList | null | undefined): boolean {
  if (!gearList) return false;
  return (
    (gearList.cameraBodies?.length ?? 0) +
      (gearList.lenses?.length ?? 0) +
      (gearList.lights?.length ?? 0) +
      (gearList.modifiers?.length ?? 0) +
      (gearList.audio?.length ?? 0) +
      (gearList.stabilizers?.length ?? 0) +
      (gearList.tripods?.length ?? 0) >
    0
  );
}
