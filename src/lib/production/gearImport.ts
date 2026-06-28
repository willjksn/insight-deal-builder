import { ScoutGearList } from "@/lib/scout/types";

export function gearItemsFromScoutList(list: ScoutGearList): string[] {
  const sections: [string, string[]][] = [
    ["Camera", list.cameraBodies ?? []],
    ["Lens", list.lenses ?? []],
    ["Light", list.lights ?? []],
    ["Modifier", list.modifiers ?? []],
    ["Audio", list.audio ?? []],
    ["Stabilizer", list.stabilizers ?? []],
    ["Tripod", list.tripods ?? []],
  ];

  return sections.flatMap(([prefix, items]) =>
    items.filter(Boolean).map((item) => `${prefix}: ${item}`)
  );
}

export function mergeGearItems(existing: string[], incoming: string[]): string[] {
  const seen = new Set(existing.map((item) => item.toLowerCase()));
  const merged = [...existing];
  for (const item of incoming) {
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }
  return merged;
}
