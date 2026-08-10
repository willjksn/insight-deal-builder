import type { Firestore } from "firebase-admin/firestore";
import { PRODUCTION_BOARDS_COLLECTION } from "@/lib/firebase/productionFirestore";
import {
  EMPTY_SHOOTING_KIT,
  shootingKitFromLegacy,
  shootingKitHasGear,
  type ProductionShootingKit,
} from "@/lib/production/shootingKit";
import type { ProductionBoard } from "@/lib/production/types";
import { formatShootingKitForPrompt } from "@/lib/scriptWriter/shootingKitPrompt";
import { loadProductionBoardForProject } from "@/lib/scriptWriter/resolveShootingKit";
import type { ContentPlan } from "@/lib/contentPlan/types";
import {
  kitFromContentPlanInputs,
  mergeShootingKits,
} from "@/lib/contentPlan/gearKit";

export {
  applyShootingKitToInputs,
  equipmentOptionsByKitCategory,
  hydrateInputsFromKit,
  kitFromContentPlanInputs,
  kitFromEquipmentCatalog,
  mergeShootingKits,
  splitGearList,
} from "@/lib/contentPlan/gearKit";

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
