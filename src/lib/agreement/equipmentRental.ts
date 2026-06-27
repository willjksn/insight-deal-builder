import {
  EquipmentCatalogItem,
  EquipmentRentalDetails,
  EquipmentRentalLineItem,
  PaymentTerms,
} from "@/lib/types";
import { DEFAULT_GEAR_CLAUSE } from "@/lib/constants/presets";

export function calculateRentalLineTotal(quantity: number, dailyRate: number, days: number): number {
  return Math.round(quantity * dailyRate * days * 100) / 100;
}

export function calculateRentalSubtotal(lineItems: EquipmentRentalLineItem[]): number {
  return Math.round(lineItems.reduce((sum, item) => sum + (item.lineTotal || 0), 0) * 100) / 100;
}

export function recalcRentalLineItem(
  item: Omit<EquipmentRentalLineItem, "lineTotal"> & { lineTotal?: number }
): EquipmentRentalLineItem {
  return {
    ...item,
    lineTotal: calculateRentalLineTotal(item.quantity, item.dailyRate, item.days),
  };
}

export function createEmptyRentalLineItem(partial?: Partial<EquipmentRentalLineItem>): EquipmentRentalLineItem {
  const quantity = partial?.quantity ?? 1;
  const dailyRate = partial?.dailyRate ?? 0;
  const days = partial?.days ?? 1;
  return recalcRentalLineItem({
    id: crypto.randomUUID(),
    name: "",
    quantity,
    dailyRate,
    days,
    lineTotal: 0,
    ...partial,
  });
}

export function catalogItemToLineItem(item: EquipmentCatalogItem, days = 1): EquipmentRentalLineItem {
  return recalcRentalLineItem({
    id: crypto.randomUUID(),
    catalogItemId: item.id.startsWith("preset-") ? undefined : item.id,
    name: item.name,
    category: item.category,
    serialNumber: item.serialNumber,
    replacementValue: item.replacementValue,
    quantity: 1,
    dailyRate: item.dailyRate,
    days,
  });
}

export const EMPTY_EQUIPMENT_RENTAL_DETAILS: EquipmentRentalDetails = {
  rentalStartDate: "",
  rentalEndDate: "",
  pickupLocation: "",
  returnLocation: "",
  lineItems: [],
  depositAmount: 0,
  lateFeePerDay: 75,
  insuranceRequired: true,
  renterInsuranceNotes:
    "Renter must provide certificate of insurance naming Insight Media Group LLC as additional insured with coverage limits adequate for replacement value of rented equipment.",
  responsibilityNotes: DEFAULT_GEAR_CLAUSE,
};

export function syncRentalPaymentTerms(
  rental: EquipmentRentalDetails,
  existing?: PaymentTerms
): PaymentTerms {
  const subtotal = calculateRentalSubtotal(rental.lineItems);
  const deposit = rental.depositAmount ?? Math.round(subtotal * 0.5 * 100) / 100;
  const balance = Math.max(0, Math.round((subtotal - deposit) * 100) / 100);
  return {
    totalFee: subtotal,
    paymentStructure: existing?.paymentStructure || "50% deposit / 50% before pickup",
    depositAmount: deposit,
    balanceAmount: balance,
    paymentNotes:
      existing?.paymentNotes ||
      "Deposit and signed agreement are required before equipment release. Balance is due before or at pickup unless otherwise agreed in writing. Late returns and damage may be charged to the card or deposit on file.",
  };
}

export function formatRentalPeriod(rental: EquipmentRentalDetails): string {
  if (!rental.rentalStartDate && !rental.rentalEndDate) return "—";
  if (rental.rentalStartDate && rental.rentalEndDate) {
    return `${rental.rentalStartDate} through ${rental.rentalEndDate}`;
  }
  return rental.rentalStartDate || rental.rentalEndDate || "—";
}
