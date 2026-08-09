import type { Firestore } from "firebase-admin/firestore";
import { PRODUCTION_BOARDS_COLLECTION } from "@/lib/firebase/productionFirestore";
import {
  EMPTY_SHOOTING_KIT,
  normalizeShootingKit,
  shootingKitFromLegacy,
  shootingKitHasGear,
  type ProductionShootingKit,
} from "@/lib/production/shootingKit";
import type { ProductionBoard } from "@/lib/production/types";
import { formatShootingKitForPrompt } from "@/lib/scriptWriter/shootingKitPrompt";
import { loadProductionBoardForProject } from "@/lib/scriptWriter/resolveShootingKit";
import type { ContentPlan, ContentPlanInputs } from "@/lib/contentPlan/types";

export function splitGearList(raw?: string): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function kitFromContentPlanInputs(
  inputs: ContentPlanInputs
): ProductionShootingKit {
  return normalizeShootingKit({
    cameraBodies: splitGearList(inputs.camerasAvailable),
    lenses: splitGearList(inputs.lensesAvailable),
    lights: splitGearList(inputs.lightingAvailable),
    other: [
      ...splitGearList(inputs.equipmentAvailable),
    ],
  });
}

export function mergeShootingKits(
  primary: ProductionShootingKit,
  secondary: ProductionShootingKit
): ProductionShootingKit {
  const a = normalizeShootingKit(primary);
  const b = normalizeShootingKit(secondary);
  const merge = (x: string[], y: string[]) => {
    const seen = new Set(x.map((s) => s.toLowerCase()));
    const out = [...x];
    for (const item of y) {
      const key = item.toLowerCase();
      if (seen.has(key)) continue;
      out.push(item);
      seen.add(key);
    }
    return out;
  };
  return {
    cameraBodies: merge(a.cameraBodies, b.cameraBodies),
    lenses: merge(a.lenses, b.lenses),
    supports: merge(a.supports, b.supports),
    lights: merge(a.lights, b.lights),
    grip: merge(a.grip, b.grip),
    audio: merge(a.audio, b.audio),
    props: merge(a.props, b.props),
    other: merge(a.other, b.other),
    cameraSettingsNotes:
      a.cameraSettingsNotes?.trim() || b.cameraSettingsNotes?.trim() || undefined,
  };
}

export function hydrateInputsFromKit(
  inputs: ContentPlanInputs,
  kit: ProductionShootingKit
): ContentPlanInputs {
  const k = normalizeShootingKit(kit);
  return {
    ...inputs,
    camerasAvailable:
      inputs.camerasAvailable?.trim() ||
      (k.cameraBodies.length ? k.cameraBodies.join(", ") : inputs.camerasAvailable),
    lensesAvailable:
      inputs.lensesAvailable?.trim() ||
      (k.lenses.length ? k.lenses.join(", ") : inputs.lensesAvailable),
    lightingAvailable:
      inputs.lightingAvailable?.trim() ||
      (k.lights.length ? k.lights.join(", ") : inputs.lightingAvailable),
    equipmentAvailable:
      inputs.equipmentAvailable?.trim() ||
      ([...k.supports, ...k.grip, ...k.audio, ...k.other].length
        ? [...k.supports, ...k.grip, ...k.audio, ...k.other].join(", ")
        : inputs.equipmentAvailable),
  };
}

async function loadFallbackUserBoardKit(
  db: Firestore,
  userId: string
): Promise<ProductionShootingKit | null> {
  const q = await db
    .collection(PRODUCTION_BOARDS_COLLECTION)
    .where("userId", "==", userId)
    .limit(8)
    .get();
  for (const doc of q.docs) {
    const board = doc.data() as ProductionBoard;
    const kit = shootingKitFromLegacy(board.shootingKit, board.gearItems ?? []);
    if (shootingKitHasGear(kit)) return kit;
  }
  return null;
}

export function formatContentPlanGearPrompt(
  kit: ProductionShootingKit,
  useAvailableGearOnly: boolean
): string {
  const has = shootingKitHasGear(kit);
  if (useAvailableGearOnly && has) {
    return formatShootingKitForPrompt(kit);
  }
  if (useAvailableGearOnly && !has) {
    return [
      "AVAILABLE GEAR CONSTRAINT: useAvailableGearOnly is true, but no kit was listed.",
      "Use realistic small-crew cinema gear (e.g. one cinema body + 2–3 primes).",
      "Do NOT invent exotic rental packages, exotic anamorphics, or large lighting trucks.",
    ].join("\n");
  }
  if (!useAvailableGearOnly && has) {
    return [
      "PREFERRED GEAR (may suggest optional rentals if justified):",
      formatShootingKitForPrompt(kit),
    ].join("\n");
  }
  return "";
}

export async function resolveContentPlanGear(
  db: Firestore,
  plan: Pick<ContentPlan, "inputs" | "projectId" | "userId">
): Promise<{
  kit: ProductionShootingKit;
  promptBlock: string;
  source: "inputs" | "project_board" | "user_board" | "empty";
}> {
  const inputKit = kitFromContentPlanInputs(plan.inputs);
  let kit = inputKit;
  let source: "inputs" | "project_board" | "user_board" | "empty" = shootingKitHasGear(
    inputKit
  )
    ? "inputs"
    : "empty";

  if (plan.projectId) {
    const board = await loadProductionBoardForProject(db, plan.projectId);
    if (board) {
      const boardKit = shootingKitFromLegacy(board.shootingKit, board.gearItems ?? []);
      if (shootingKitHasGear(boardKit)) {
        kit = mergeShootingKits(inputKit, boardKit);
        source = shootingKitHasGear(inputKit) ? "inputs" : "project_board";
      }
    }
  } else if (
    plan.inputs.useAvailableGearOnly &&
    !shootingKitHasGear(kit) &&
    plan.userId
  ) {
    const fallback = await loadFallbackUserBoardKit(db, plan.userId);
    if (fallback) {
      kit = fallback;
      source = "user_board";
    }
  }

  if (!shootingKitHasGear(kit)) {
    kit = EMPTY_SHOOTING_KIT;
    source = "empty";
  }

  return {
    kit,
    promptBlock: formatContentPlanGearPrompt(kit, plan.inputs.useAvailableGearOnly),
    source,
  };
}
