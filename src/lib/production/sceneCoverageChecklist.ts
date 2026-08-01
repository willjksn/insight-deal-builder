import type { ScriptWriterBrief } from "@/lib/scriptWriter/brief";
import type { ProductionDay, ProductionDayShot } from "@/lib/production/types";
import type { ScriptDocument } from "@/lib/scriptWriter/types";
import { sceneNumbersFromScript } from "@/lib/scriptWriter/scriptMappers";

export type SceneCoverageTemplateId =
  | "full"
  | "five_shot"
  | "dialogue"
  | "single_actor"
  | "horror"
  | "product"
  | "walking";

export type SceneCoverageChecklistItem = {
  id: string;
  label: string;
  done: boolean;
  /** When set, auto-check if any matching shotType on this scene is done. */
  autoShotTypes?: string[];
};

export type SceneCoverageChecklist = {
  sceneRef: string;
  sceneHeading?: string;
  templateId: SceneCoverageTemplateId;
  items: SceneCoverageChecklistItem[];
  seededFrom?: {
    detailedShotList?: boolean;
    contentType?: string;
    castSize?: string;
    mood?: string;
  };
};

type ItemDef = Omit<SceneCoverageChecklistItem, "done">;

const FULL_TRACKING: ItemDef[] = [
  { id: "establishing", label: "Establishing shot", autoShotTypes: ["master_wide"] },
  { id: "master_wide", label: "Master wide", autoShotTypes: ["master_wide"] },
  { id: "medium_wide", label: "Medium wide", autoShotTypes: ["medium_shot"] },
  { id: "two_shot", label: "Two-shot" },
  { id: "ots_a", label: "Over-the-shoulder Actor A" },
  { id: "ots_b", label: "Over-the-shoulder Actor B" },
  { id: "medium_a", label: "Medium Actor A", autoShotTypes: ["medium_shot"] },
  { id: "medium_b", label: "Medium Actor B", autoShotTypes: ["medium_shot"] },
  { id: "cu_a", label: "Close-up Actor A", autoShotTypes: ["close_up"] },
  { id: "cu_b", label: "Close-up Actor B", autoShotTypes: ["close_up"] },
  { id: "reaction_a", label: "Reaction Actor A", autoShotTypes: ["reaction_shot"] },
  { id: "reaction_b", label: "Reaction Actor B", autoShotTypes: ["reaction_shot"] },
  { id: "pov", label: "Point-of-view shot" },
  { id: "insert_1", label: "Insert 1", autoShotTypes: ["insert_shot"] },
  { id: "insert_2", label: "Insert 2", autoShotTypes: ["insert_shot"] },
  { id: "cutaway_1", label: "Cutaway 1" },
  { id: "entrance", label: "Entrance" },
  { id: "exit", label: "Exit" },
  { id: "moving", label: "Moving shot", autoShotTypes: ["movement_shot"] },
  { id: "clean_plate", label: "Clean plate" },
  { id: "room_tone", label: "Room tone", autoShotTypes: ["room_tone"] },
  { id: "wild_lines", label: "Wild lines", autoShotTypes: ["wild_line"] },
  { id: "slow_mo", label: "Slow-motion option" },
  { id: "vertical", label: "Vertical version", autoShotTypes: ["vertical_social_shot"] },
  { id: "safety_take", label: "Safety take" },
];

const FIVE_SHOT: ItemDef[] = [
  { id: "wide", label: "Wide shot — full action", autoShotTypes: ["master_wide"] },
  { id: "medium", label: "Medium shot — actor performing", autoShotTypes: ["medium_shot"] },
  { id: "close_up", label: "Close-up — emotion or detail", autoShotTypes: ["close_up"] },
  { id: "ots_or_pov", label: "Over-the-shoulder or point of view" },
  {
    id: "insert_or_reaction",
    label: "Insert or reaction",
    autoShotTypes: ["insert_shot", "reaction_shot"],
  },
];

const SINGLE_ACTOR: ItemDef[] = [
  { id: "establishing", label: "Establishing shot", autoShotTypes: ["master_wide"] },
  { id: "master_wide", label: "Master wide", autoShotTypes: ["master_wide"] },
  { id: "medium_full", label: "Medium full-body", autoShotTypes: ["medium_shot"] },
  { id: "mcu", label: "Medium close-up", autoShotTypes: ["medium_shot", "close_up"] },
  { id: "close_up", label: "Close-up", autoShotTypes: ["close_up"] },
  { id: "profile", label: "Profile shot" },
  { id: "ots_what_they_see", label: "Over-the-shoulder toward what they see" },
  { id: "pov", label: "Point-of-view shot" },
  { id: "hands_insert", label: "Hands or object inserts", autoShotTypes: ["insert_shot"] },
  { id: "reaction", label: "Reactions", autoShotTypes: ["reaction_shot"] },
  { id: "movement", label: "Movement coverage", autoShotTypes: ["movement_shot"] },
  { id: "clean_plate", label: "Clean empty room plate" },
  { id: "room_tone", label: "Room tone", autoShotTypes: ["room_tone"] },
];

const DIALOGUE: ItemDef[] = [
  { id: "establishing", label: "Establishing shot", autoShotTypes: ["master_wide"] },
  { id: "master_wide", label: "Master wide", autoShotTypes: ["master_wide"] },
  { id: "two_shot", label: "Two-shot" },
  { id: "ots_a", label: "Over-the-shoulder on each actor" },
  { id: "medium", label: "Medium on each actor", autoShotTypes: ["medium_shot"] },
  { id: "close_up", label: "Close-up on each actor", autoShotTypes: ["close_up"] },
  { id: "listening", label: "Listening reactions", autoShotTypes: ["reaction_shot"] },
  { id: "inserts", label: "Important inserts", autoShotTypes: ["insert_shot"] },
  { id: "cutaways", label: "Relevant cutaways" },
  { id: "entrance_exit", label: "Entrance and exit" },
  { id: "room_tone", label: "Room tone", autoShotTypes: ["room_tone"] },
];

const HORROR_EXTRA: ItemDef[] = [
  { id: "empty_space", label: "Wide shot showing empty space", autoShotTypes: ["master_wide"] },
  { id: "slow_push", label: "Slow push-in", autoShotTypes: ["movement_shot"] },
  { id: "empty_doorway", label: "Empty doorway or hallway" },
  { id: "behind_actor", label: "Shot behind the actor" },
  { id: "low_high", label: "Low angle / high angle" },
  { id: "shadow", label: "Shadow or silhouette" },
  { id: "negative_space", label: "Negative-space composition" },
  { id: "clean_plate", label: "Clean plate without actor" },
  { id: "wild_sfx", label: "Wild sound effects", autoShotTypes: ["wild_line"] },
];

const PRODUCT: ItemDef[] = [
  { id: "lifestyle_wide", label: "Wide lifestyle shot", autoShotTypes: ["master_wide"] },
  { id: "medium_use", label: "Medium shot using the product", autoShotTypes: ["medium_shot"] },
  { id: "hero", label: "Product hero shot", autoShotTypes: ["close_up", "insert_shot"] },
  { id: "logo", label: "Close-up of logo", autoShotTypes: ["insert_shot", "close_up"] },
  { id: "hands", label: "Hands interacting with product", autoShotTypes: ["insert_shot"] },
  { id: "details", label: "Product detail shots", autoShotTypes: ["insert_shot"] },
  { id: "enjoyment", label: "Reaction or enjoyment shot", autoShotTypes: ["reaction_shot"] },
  { id: "ots_product", label: "Over-the-shoulder product use" },
  { id: "slow_mo", label: "Slow-motion option" },
  { id: "clean_bg", label: "Clean background option" },
  { id: "vertical", label: "Vertical version", autoShotTypes: ["vertical_social_shot"] },
  { id: "horizontal", label: "Horizontal version" },
  { id: "text_room", label: "Shot with room for text" },
];

const WALKING: ItemDef[] = [
  { id: "wide_profile", label: "Wide profile", autoShotTypes: ["master_wide"] },
  { id: "wide_front", label: "Wide front", autoShotTypes: ["master_wide"] },
  { id: "wide_rear", label: "Wide rear", autoShotTypes: ["master_wide"] },
  { id: "medium_side", label: "Medium side", autoShotTypes: ["medium_shot"] },
  { id: "medium_front", label: "Medium front", autoShotTypes: ["medium_shot"] },
  { id: "face_cu", label: "Close-up of face", autoShotTypes: ["close_up"] },
  { id: "feet", label: "Feet walking", autoShotTypes: ["insert_shot"] },
  { id: "hands_clothing", label: "Hands or clothing movement", autoShotTypes: ["insert_shot"] },
  { id: "follow", label: "Follow shot", autoShotTypes: ["movement_shot"] },
  { id: "leading", label: "Leading shot", autoShotTypes: ["movement_shot"] },
  { id: "destination", label: "Destination reveal" },
  { id: "start_stop", label: "Start and stop of walk" },
];

function defsToItems(defs: ItemDef[]): SceneCoverageChecklistItem[] {
  return defs.map((d) => ({ ...d, done: false }));
}

function uniqueById(defs: ItemDef[]): ItemDef[] {
  const seen = new Set<string>();
  const out: ItemDef[] = [];
  for (const d of defs) {
    if (seen.has(d.id)) continue;
    seen.add(d.id);
    out.push(d);
  }
  return out;
}

export function resolveCoverageTemplateId(params: {
  detailedShotList?: boolean;
  brief?: Pick<ScriptWriterBrief, "contentType" | "castSize" | "mood" | "genre"> | null;
}): SceneCoverageTemplateId {
  const detailed = params.detailedShotList !== false;
  const brief = params.brief;
  if (!detailed) return "five_shot";

  const contentType = brief?.contentType;
  const castSize = brief?.castSize;
  const mood = brief?.mood;
  const genre = (brief?.genre ?? "").toLowerCase();

  if (contentType === "commercial" || contentType === "social_reel" || contentType === "brand_story") {
    return "product";
  }
  if (mood === "horror" || genre.includes("horror") || genre.includes("thriller")) {
    return "horror";
  }
  if (castSize === "solo" || castSize === "voiceover_only" || castSize === "no_people") {
    return "single_actor";
  }
  if (castSize === "two" || castSize === "small_group" || castSize === "large_ensemble") {
    return "dialogue";
  }
  return "full";
}

export function coverageItemsForTemplate(templateId: SceneCoverageTemplateId): ItemDef[] {
  switch (templateId) {
    case "five_shot":
      return FIVE_SHOT;
    case "single_actor":
      return SINGLE_ACTOR;
    case "dialogue":
      return DIALOGUE;
    case "horror":
      return uniqueById([...DIALOGUE, ...HORROR_EXTRA]);
    case "product":
      return PRODUCT;
    case "walking":
      return WALKING;
    case "full":
    default:
      return FULL_TRACKING;
  }
}

export function templateLabel(templateId: SceneCoverageTemplateId): string {
  switch (templateId) {
    case "five_shot":
      return "Five-shot safety (basic shot list)";
    case "single_actor":
      return "Single-actor coverage";
    case "dialogue":
      return "Dialogue coverage";
    case "horror":
      return "Suspense / horror coverage";
    case "product":
      return "Product / brand coverage";
    case "walking":
      return "Walking coverage";
    case "full":
    default:
      return "Full tracking sheet";
  }
}

/** Build checklists for each scene on a day from script-writer settings. */
export function buildSceneCoverageChecklists(params: {
  sceneRefs: string[];
  sceneHeadings?: Record<string, string>;
  detailedShotList?: boolean;
  brief?: Pick<ScriptWriterBrief, "contentType" | "castSize" | "mood" | "genre"> | null;
}): SceneCoverageChecklist[] {
  const templateId = resolveCoverageTemplateId(params);
  const items = defsToItems(coverageItemsForTemplate(templateId));
  const refs = params.sceneRefs.length ? params.sceneRefs : ["1"];

  return refs.map((sceneRef) => ({
    sceneRef,
    sceneHeading: params.sceneHeadings?.[sceneRef],
    templateId,
    items: items.map((i) => ({ ...i })),
    seededFrom: {
      detailedShotList: params.detailedShotList !== false,
      contentType: params.brief?.contentType,
      castSize: params.brief?.castSize,
      mood: params.brief?.mood,
    },
  }));
}

/** Preserve done flags when re-seeding from script refresh. */
export function mergeSceneCoverageChecklists(
  existing: SceneCoverageChecklist[] | undefined,
  next: SceneCoverageChecklist[]
): SceneCoverageChecklist[] {
  const byRef = new Map((existing ?? []).map((c) => [c.sceneRef, c]));
  return next.map((checklist) => {
    const prev = byRef.get(checklist.sceneRef);
    if (!prev) return checklist;
    const doneById = new Map(prev.items.map((i) => [i.id, i.done]));
    return {
      ...checklist,
      items: checklist.items.map((item) => ({
        ...item,
        done: doneById.get(item.id) ?? item.done,
      })),
    };
  });
}

function normalizeShotType(shotType?: string): string {
  return (shotType ?? "").trim().toLowerCase().replace(/\s+/g, "_");
}

/** Auto-tick coverage items when matching scene shots are marked done. */
export function syncCoverageChecklistWithShots(
  checklists: SceneCoverageChecklist[] | undefined,
  shots: ProductionDayShot[]
): SceneCoverageChecklist[] | undefined {
  if (!checklists?.length) return checklists;

  return checklists.map((checklist) => {
    const sceneShots = shots.filter(
      (s) => String(s.sceneRef ?? "").trim() === String(checklist.sceneRef).trim()
    );
    const doneTypes = new Set(
      sceneShots.filter((s) => s.done).map((s) => normalizeShotType(s.shotType)).filter(Boolean)
    );
    // If sceneRef missing on shots, fall back to all day shots for single-scene days
    const pool =
      sceneShots.length > 0
        ? doneTypes
        : new Set(
            shots.filter((s) => s.done).map((s) => normalizeShotType(s.shotType)).filter(Boolean)
          );

    return {
      ...checklist,
      items: checklist.items.map((item) => {
        if (!item.autoShotTypes?.length) return item;
        const autoDone = item.autoShotTypes.some((t) => pool.has(normalizeShotType(t)));
        return autoDone ? { ...item, done: true } : item;
      }),
    };
  });
}

export function collectSceneRefsFromShots(shots: ProductionDayShot[]): string[] {
  const refs: string[] = [];
  const seen = new Set<string>();
  for (const shot of shots) {
    const ref = String(shot.sceneRef ?? "").trim();
    if (!ref || seen.has(ref)) continue;
    seen.add(ref);
    refs.push(ref);
  }
  return refs;
}

export function sceneHeadingsFromShots(shots: ProductionDayShot[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const shot of shots) {
    const ref = String(shot.sceneRef ?? "").trim();
    if (!ref || map[ref] || !shot.sceneHeading?.trim()) continue;
    map[ref] = shot.sceneHeading.trim();
  }
  return map;
}

function sceneHeadingsFromScript(script: ScriptDocument | null | undefined): Record<string, string> {
  const map: Record<string, string> = {};
  for (const scene of script?.scenes ?? []) {
    const num = String(scene.sceneNumber ?? "").trim();
    if (num && scene.heading?.trim()) map[num] = scene.heading.trim();
  }
  return map;
}

/** Seed/merge required coverage for one production day from script-writer settings. */
export function seedDayCoverageChecklists(params: {
  day: Pick<ProductionDay, "scenes" | "shots" | "coverageChecklists">;
  script?: ScriptDocument | null;
  detailedShotList?: boolean;
  brief?: Pick<ScriptWriterBrief, "contentType" | "castSize" | "mood" | "genre"> | null;
}): SceneCoverageChecklist[] {
  const shots = params.day.shots ?? [];
  const fromScript = params.script ? sceneNumbersFromScript(params.script) : [];
  const sceneRefs =
    fromScript.length > 0
      ? fromScript
      : collectSceneRefsFromShots(shots).length > 0
        ? collectSceneRefsFromShots(shots)
        : params.day.scenes?.length
          ? params.day.scenes
          : ["1"];
  const sceneHeadings = {
    ...sceneHeadingsFromShots(shots),
    ...sceneHeadingsFromScript(params.script),
  };
  const seeded = buildSceneCoverageChecklists({
    sceneRefs,
    sceneHeadings,
    detailedShotList: params.detailedShotList,
    brief: params.brief,
  });
  return (
    syncCoverageChecklistWithShots(
      mergeSceneCoverageChecklists(params.day.coverageChecklists, seeded),
      shots
    ) ?? seeded
  );
}

/** Seed/merge coverage checklists across all board days (Coverage desk refresh). */
export function seedBoardCoverageChecklists(params: {
  days: ProductionDay[];
  script?: ScriptDocument | null;
  detailedShotList?: boolean;
  brief?: Pick<ScriptWriterBrief, "contentType" | "castSize" | "mood" | "genre"> | null;
}): ProductionDay[] {
  return params.days.map((day) => ({
    ...day,
    coverageChecklists: seedDayCoverageChecklists({
      day,
      script: params.script,
      detailedShotList: params.detailedShotList,
      brief: params.brief,
    }),
  }));
}

export function coverageChecklistProgress(checklists: SceneCoverageChecklist[] | undefined): {
  done: number;
  total: number;
} {
  let done = 0;
  let total = 0;
  for (const c of checklists ?? []) {
    for (const item of c.items) {
      total += 1;
      if (item.done) done += 1;
    }
  }
  return { done, total };
}
