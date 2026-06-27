import { LocationAgreementDetails, LocationPropLineItem, PaymentTerms } from "@/lib/types";

export const EMPTY_LOCATION_AGREEMENT_DETAILS: LocationAgreementDetails = {
  agreementKind: "location",
  propertyName: "",
  propertyAddress: "",
  useStartDate: "",
  useEndDate: "",
  shootDates: "",
  permittedUse: "Filming, photography, and related production activities for the project named in this Agreement.",
  restrictions:
    "No structural alterations, no hazardous activities without prior written approval, and restore location to prior condition except normal wear.",
  insuranceRequired: true,
  insuranceNotes:
    "Producer must provide certificate of insurance naming property owner as additional insured with coverage limits adequate for the shoot, if required by owner.",
  locationFee: 0,
  locationFeeType: "flat",
  locationDays: 1,
  propLineItems: [],
  payeeTax: { entityType: "individual", w9OnFile: false },
};

export function calculatePropLineTotal(item: Omit<LocationPropLineItem, "lineTotal"> & { lineTotal?: number }): number {
  return Math.round(item.quantity * item.dailyRate * item.days * 100) / 100;
}

export function recalcPropLineItem(
  item: Omit<LocationPropLineItem, "lineTotal"> & { lineTotal?: number }
): LocationPropLineItem {
  return { ...item, lineTotal: calculatePropLineTotal(item) };
}

export function calculateLocationFeeTotal(details: LocationAgreementDetails): number {
  if (details.agreementKind === "prop") return 0;
  const fee = details.locationFee ?? 0;
  if (details.locationFeeType === "day") {
    return Math.round(fee * (details.locationDays || 1) * 100) / 100;
  }
  return fee;
}

export function calculatePropsSubtotal(lineItems: LocationPropLineItem[]): number {
  return Math.round(lineItems.reduce((sum, item) => sum + (item.lineTotal || 0), 0) * 100) / 100;
}

export function calculateLocationAgreementTotal(details: LocationAgreementDetails): number {
  const locationPart =
    details.agreementKind === "prop" ? 0 : calculateLocationFeeTotal(details);
  const propsPart =
    details.agreementKind === "location" ? 0 : calculatePropsSubtotal(details.propLineItems);
  return Math.round((locationPart + propsPart) * 100) / 100;
}

export function syncLocationPaymentTerms(
  details: LocationAgreementDetails,
  existing?: PaymentTerms
): PaymentTerms {
  const totalFee = calculateLocationAgreementTotal(details);
  return {
    totalFee,
    paymentStructure: existing?.paymentStructure || "100% due before shoot",
    depositAmount: existing?.depositAmount ?? totalFee,
    balanceAmount: existing?.balanceAmount ?? 0,
    paymentNotes:
      existing?.paymentNotes ||
      "Location/prop fees are due as stated in this Agreement. Producer may withhold payment until signed agreement and any required insurance proof are on file.",
  };
}

export function createEmptyPropLineItem(partial?: Partial<LocationPropLineItem>): LocationPropLineItem {
  return recalcPropLineItem({
    id: crypto.randomUUID(),
    name: "",
    quantity: 1,
    dailyRate: 0,
    days: 1,
    lineTotal: 0,
    ...partial,
  });
}

export function formatLocationKindLabel(kind: LocationAgreementDetails["agreementKind"]): string {
  switch (kind) {
    case "location":
      return "Location only";
    case "prop":
      return "Prop rental only";
    case "location_and_prop":
      return "Location + props";
  }
}
