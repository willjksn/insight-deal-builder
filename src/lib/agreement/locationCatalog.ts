import { LocationAgreementDetails, LocationCatalogItem, LocationPropLineItem } from "@/lib/types";
import { createEmptyPropLineItem, recalcPropLineItem } from "@/lib/agreement/locationAgreement";

export function catalogPropsToLineItems(
  presets: LocationCatalogItem["propPresets"],
  days = 1
): LocationPropLineItem[] {
  return (presets ?? []).map((preset) =>
    recalcPropLineItem({
      id: crypto.randomUUID(),
      name: preset.name,
      quantity: 1,
      dailyRate: preset.dailyRate,
      days,
      lineTotal: 0,
      conditionNotes: preset.notes,
    })
  );
}

export function catalogItemToLocationDetails(
  item: LocationCatalogItem
): Partial<LocationAgreementDetails> {
  return {
    propertyName: item.propertyName,
    propertyAddress: item.propertyAddress,
    permittedUse: item.defaultPermittedUse,
    restrictions: item.defaultRestrictions,
    insuranceRequired: item.insuranceRequired ?? true,
    insuranceNotes: item.insuranceNotes,
    locationFee: item.locationFee,
    locationFeeType: item.locationFeeType,
    propLineItems: catalogPropsToLineItems(item.propPresets),
  };
}
