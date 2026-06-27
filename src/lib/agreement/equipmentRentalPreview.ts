import { EquipmentRentalDetails } from "@/lib/types";
import { AgreementPreviewData } from "@/lib/agreement/preview";
import { calculateRentalSubtotal, formatRentalPeriod } from "@/lib/agreement/equipmentRental";

function formatCurrency(amount?: number) {
  if (amount === undefined || amount === null) return "—";
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function appendEquipmentRentalPreview(lines: string[], agreement: AgreementPreviewData): void {
  const rental = agreement.equipmentRentalDetails;
  if (!rental || agreement.agreementType !== "equipment_rental") return;

  lines.push("RENTAL PERIOD");
  lines.push(`Period: ${formatRentalPeriod(rental)}`);
  if (rental.pickupLocation) lines.push(`Pickup: ${rental.pickupLocation}`);
  if (rental.returnLocation) lines.push(`Return: ${rental.returnLocation}`);
  lines.push("");

  lines.push("EQUIPMENT SCHEDULE");
  if (!rental.lineItems.length) {
    lines.push("No equipment items listed.");
  } else {
    for (const item of rental.lineItems) {
      lines.push(
        `• ${item.quantity}x ${item.name} — ${formatCurrency(item.dailyRate)}/day × ${item.days} day(s) = ${formatCurrency(item.lineTotal)}`
      );
      if (item.serialNumber) lines.push(`  Serial: ${item.serialNumber}`);
      if (item.replacementValue) lines.push(`  Replacement value: ${formatCurrency(item.replacementValue)}`);
      if (item.conditionOut) lines.push(`  Condition out: ${item.conditionOut}`);
    }
    lines.push(`Subtotal: ${formatCurrency(calculateRentalSubtotal(rental.lineItems))}`);
  }
  lines.push("");

  lines.push("RENTAL TERMS");
  if (rental.depositAmount != null) lines.push(`Deposit: ${formatCurrency(rental.depositAmount)}`);
  if (rental.lateFeePerDay != null) lines.push(`Late fee: ${formatCurrency(rental.lateFeePerDay)}/day`);
  lines.push(`Insurance required: ${rental.insuranceRequired ? "Yes" : "No"}`);
  if (rental.renterInsuranceNotes) lines.push(rental.renterInsuranceNotes);
  if (rental.responsibilityNotes) lines.push(rental.responsibilityNotes);
  lines.push("");
}

export function appendEquipmentRentalPdf(
  addText: (text: string, size?: number, bold?: boolean) => void,
  addSection: (title: string, content: string) => void,
  rental: EquipmentRentalDetails
): void {
  addSection("Rental Period", formatRentalPeriod(rental));
  if (rental.pickupLocation) addSection("Pickup Location", rental.pickupLocation);
  if (rental.returnLocation) addSection("Return Location", rental.returnLocation);

  addText("EQUIPMENT SCHEDULE", 11, true);
  if (!rental.lineItems.length) {
    addText("No equipment items listed.", 10);
  } else {
    for (const item of rental.lineItems) {
      addText(
        `${item.quantity}x ${item.name} — ${formatCurrency(item.dailyRate)}/day × ${item.days} day(s) = ${formatCurrency(item.lineTotal)}`,
        10
      );
      if (item.serialNumber) addText(`Serial: ${item.serialNumber}`, 9);
      if (item.replacementValue) addText(`Replacement value: ${formatCurrency(item.replacementValue)}`, 9);
    }
    addText(`Subtotal: ${formatCurrency(calculateRentalSubtotal(rental.lineItems))}`, 10, true);
  }

  if (rental.depositAmount != null) addSection("Deposit", formatCurrency(rental.depositAmount));
  if (rental.lateFeePerDay != null) addSection("Late Return Fee", `${formatCurrency(rental.lateFeePerDay)}/day`);
  if (rental.insuranceRequired && rental.renterInsuranceNotes) {
    addSection("Insurance", rental.renterInsuranceNotes);
  }
}
