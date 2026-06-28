import { GEAR_PACKAGES } from "@/lib/constants/presets";
import { Agreement } from "@/lib/types";
import { mergeGearItems } from "@/lib/production/gearImport";

export function agreementsForProject(agreements: Agreement[], projectId: string): Agreement[] {
  return agreements
    .filter((a) => a.projectId === projectId)
    .sort((a, b) => {
      const statusRank = (s: Agreement["status"]) => {
        if (s === "signed") return 0;
        if (s === "ready_for_signature") return 1;
        if (s === "draft") return 2;
        return 3;
      };
      const diff = statusRank(a.status) - statusRank(b.status);
      if (diff !== 0) return diff;
      const aTime = a.updatedAt?.toMillis?.() ?? 0;
      const bTime = b.updatedAt?.toMillis?.() ?? 0;
      return bTime - aTime;
    });
}

export function primaryAgreementForProject(
  agreements: Agreement[],
  projectId: string
): Agreement | null {
  return agreementsForProject(agreements, projectId)[0] ?? null;
}

export function gearItemsFromAgreement(agreement: Agreement): string[] {
  const items: string[] = [];
  const gear = agreement.gearDetails;
  if (gear?.gearPackage && gear.gearPackage !== "No Insight Gear Used") {
    items.push(`Package: ${gear.gearPackage}`);
    const preset = GEAR_PACKAGES.find((p) => p.name === gear.gearPackage);
    if (preset?.items?.length) items.push(...preset.items);
  }
  for (const item of gear?.gearItems ?? []) {
    if (item.name?.trim()) {
      items.push(item.category ? `${item.category}: ${item.name}` : item.name.trim());
    }
  }
  for (const line of agreement.equipmentRentalDetails?.lineItems ?? []) {
    if (line.name?.trim()) {
      items.push(`Rental: ${line.name}${line.quantity > 1 ? ` ×${line.quantity}` : ""}`);
    }
  }
  return items;
}

export interface BudgetLine {
  label: string;
  amount?: number;
}

export function budgetLinesFromAgreement(agreement: Agreement): BudgetLine[] {
  const lines: BudgetLine[] = [];
  const fee =
    agreement.payoutDetails?.totalProjectFee ?? agreement.paymentTerms?.totalFee;
  if (typeof fee === "number" && Number.isFinite(fee)) {
    lines.push({ label: "Total project fee", amount: fee });
  }
  const payout = agreement.payoutDetails;
  if (payout?.insightFeeAmount != null) {
    lines.push({ label: "Insight fee", amount: payout.insightFeeAmount });
  }
  if (payout?.aveFeeAmount != null) {
    lines.push({ label: "AVE fee", amount: payout.aveFeeAmount });
  }
  if (payout?.assistantFeeAmount != null) {
    lines.push({ label: "Assistant", amount: payout.assistantFeeAmount });
  }
  if (payout?.talentFeeAmount != null) {
    lines.push({ label: "Talent", amount: payout.talentFeeAmount });
  }
  if (payout?.editorFeeAmount != null) {
    lines.push({ label: "Editor", amount: payout.editorFeeAmount });
  }
  if (payout?.expensesAmount != null) {
    lines.push({ label: "Expenses", amount: payout.expensesAmount });
  }
  const gearDetails = agreement.gearDetails;
  if (gearDetails?.separateEquipmentFee != null && gearDetails.separateEquipmentFee > 0) {
    lines.push({ label: "Equipment fee", amount: gearDetails.separateEquipmentFee });
  }
  return lines;
}

export function importGearFromAgreement(existing: string[], agreement: Agreement): string[] {
  return mergeGearItems(existing, gearItemsFromAgreement(agreement));
}
