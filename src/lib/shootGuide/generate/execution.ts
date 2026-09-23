import { buildChecklistFromGuide, mergeChecklist } from "@/lib/shootGuide/checklist";
import { applyEquipmentMatch } from "@/lib/shootGuide/matchEquipment";
import type { CatalogGear } from "@/lib/shootGuide/matchEquipment";
import type { ShootGuide, ShootGuidePatch } from "@/lib/shootGuide/types";

export function buildExecutionPatch(
  guide: ShootGuide,
  catalog: CatalogGear[]
): ShootGuidePatch {
  const { shots, plan } = applyEquipmentMatch(guide.shots ?? [], catalog, {
    useMyEquipment: guide.useMyEquipment,
    showIdealWhenNotOwned: guide.showIdealWhenNotOwned,
  });
  const nextGuide = { ...guide, shots, equipmentPlan: plan };
  const checklist = mergeChecklist(guide.checklist, buildChecklistFromGuide(nextGuide));
  return {
    shots,
    equipmentPlan: plan,
    checklist,
  };
}
