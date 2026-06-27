import { AgreementType } from "@/lib/types";

export const WIZARD_STEP_DEFS = [
  { id: "type", label: "Type" },
  { id: "parties", label: "Parties" },
  { id: "project", label: "Project" },
  { id: "roles", label: "Roles" },
  { id: "payout", label: "Payout" },
  { id: "gear", label: "Gear" },
  { id: "deliverables", label: "Deliverables" },
  { id: "payment", label: "Payment" },
  { id: "policies", label: "Policies" },
  { id: "clauses", label: "Clauses" },
  { id: "preview", label: "Preview" },
  { id: "sign", label: "Sign" },
] as const;

const RENTAL_SKIP = new Set([3, 4, 6]);
const PAYEE_SKIP = new Set([3, 4, 5, 6]);

export function getWizardStepLabel(stepIndex: number, agreementType: AgreementType): string {
  if (agreementType === "equipment_rental") {
    if (stepIndex === 2) return "Rental Period";
    if (stepIndex === 5) return "Equipment";
    if (stepIndex === 7) return "Payment";
  }
  if (agreementType === "talent_agreement") {
    if (stepIndex === 2) return "Engagement";
    if (stepIndex === 5) return "Talent & Tax";
    if (stepIndex === 7) return "Payment";
  }
  if (agreementType === "contractor_agreement") {
    if (stepIndex === 2) return "Project";
    if (stepIndex === 5) return "Services & Tax";
    if (stepIndex === 7) return "Payment";
  }
  if (agreementType === "location_agreement") {
    if (stepIndex === 2) return "Use Period";
    if (stepIndex === 5) return "Location & Props";
    if (stepIndex === 7) return "Payment";
  }
  return WIZARD_STEP_DEFS[stepIndex]?.label ?? "Step";
}

export function isWizardStepSkipped(stepIndex: number, agreementType: AgreementType): boolean {
  if (agreementType === "equipment_rental") return RENTAL_SKIP.has(stepIndex);
  if (agreementType === "talent_agreement" || agreementType === "contractor_agreement" || agreementType === "location_agreement") {
    return PAYEE_SKIP.has(stepIndex);
  }
  return false;
}

export function advanceWizardStep(stepIndex: number, agreementType: AgreementType, direction: 1 | -1): number {
  const max = WIZARD_STEP_DEFS.length - 1;
  let next = stepIndex + direction;
  while (next >= 0 && next <= max && isWizardStepSkipped(next, agreementType)) {
    next += direction;
  }
  return Math.max(0, Math.min(max, next));
}

export function getAgreementTypeLabel(type: AgreementType): string {
  switch (type) {
    case "internal_collaboration":
      return "Internal Collaboration";
    case "equipment_rental":
      return "Equipment Rental";
    case "talent_agreement":
      return "Talent Agreement";
    case "contractor_agreement":
      return "Contractor Agreement";
    case "location_agreement":
      return "Location & Prop Agreement";
    default:
      return "Client Project";
  }
}
