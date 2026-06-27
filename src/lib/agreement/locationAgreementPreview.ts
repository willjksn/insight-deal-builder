import { AgreementPreviewData } from "@/lib/agreement/preview";
import {
  calculateLocationAgreementTotal,
  calculateLocationFeeTotal,
  calculatePropsSubtotal,
  formatLocationKindLabel,
} from "@/lib/agreement/locationAgreement";
import { formatPayeeTaxBlock } from "@/lib/agreement/payeeEngagement";

function formatCurrency(amount?: number) {
  if (amount === undefined || amount === null) return "—";
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function appendLocationAgreementPreview(lines: string[], agreement: AgreementPreviewData): void {
  const loc = agreement.locationAgreementDetails;
  if (!loc || agreement.agreementType !== "location_agreement") return;

  lines.push("LOCATION & PROP");
  lines.push(`Covers: ${formatLocationKindLabel(loc.agreementKind)}`);
  lines.push(`Property: ${loc.propertyName || "—"}`);
  if (loc.propertyAddress) lines.push(`Address: ${loc.propertyAddress}`);
  if (loc.useStartDate || loc.useEndDate) {
    lines.push(`Use period: ${loc.useStartDate || "—"} through ${loc.useEndDate || "—"}`);
  }
  if (loc.shootDates) lines.push(`Shoot dates: ${loc.shootDates}`);
  if (loc.permittedUse) lines.push(`Permitted use: ${loc.permittedUse}`);
  if (loc.restrictions) lines.push(`Restrictions: ${loc.restrictions}`);

  if (loc.agreementKind !== "prop") {
    lines.push(
      `Location fee: ${formatCurrency(calculateLocationFeeTotal(loc))}${loc.locationFeeType === "day" ? ` (${formatCurrency(loc.locationFee)}/day × ${loc.locationDays} days)` : ""}`
    );
  }

  if (loc.agreementKind !== "location" && loc.propLineItems.length) {
    lines.push("PROP SCHEDULE");
    for (const item of loc.propLineItems) {
      lines.push(
        `• ${item.quantity}x ${item.name} — ${formatCurrency(item.dailyRate)}/day × ${item.days} day(s) = ${formatCurrency(item.lineTotal)}`
      );
    }
    lines.push(`Props subtotal: ${formatCurrency(calculatePropsSubtotal(loc.propLineItems))}`);
  }

  lines.push(`Total: ${formatCurrency(calculateLocationAgreementTotal(loc))}`);

  if (loc.insuranceRequired) {
    lines.push("Insurance required: Yes");
    if (loc.insuranceNotes) lines.push(loc.insuranceNotes);
  }

  const taxLines = formatPayeeTaxBlock(loc.payeeTax);
  if (taxLines.length) {
    lines.push("");
    lines.push("OWNER / TAX INFO");
    taxLines.forEach((l) => lines.push(l));
  }
  lines.push("");
}

export function appendLocationAgreementPdf(
  addSection: (title: string, content: string) => void,
  agreement: AgreementPreviewData
): void {
  const loc = agreement.locationAgreementDetails;
  if (!loc) return;

  addSection(
    "Location & Property",
    [
      `Covers: ${formatLocationKindLabel(loc.agreementKind)}`,
      `Property: ${loc.propertyName}`,
      loc.propertyAddress && `Address: ${loc.propertyAddress}`,
      loc.permittedUse && `Permitted use: ${loc.permittedUse}`,
      `Total: ${formatCurrency(calculateLocationAgreementTotal(loc))}`,
    ]
      .filter(Boolean)
      .join("\n")
  );

  if (loc.agreementKind !== "location" && loc.propLineItems.length) {
    const props = loc.propLineItems
      .map(
        (item) =>
          `${item.quantity}x ${item.name} — ${formatCurrency(item.dailyRate)}/day × ${item.days} = ${formatCurrency(item.lineTotal)}`
      )
      .join("\n");
    addSection("Prop Schedule", props);
  }

  const tax = formatPayeeTaxBlock(loc.payeeTax);
  if (tax.length) addSection("Owner / Tax Info", tax.join("\n"));
}
