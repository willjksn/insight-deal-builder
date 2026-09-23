import { AgreementPreviewData } from "@/lib/agreement/preview";
import { formatFeeLabel, formatPayeeTaxBlock } from "@/lib/agreement/payeeEngagement";

export function appendTalentAgreementPreview(lines: string[], agreement: AgreementPreviewData): void {
  const talent = agreement.talentAgreementDetails;
  if (!talent || agreement.agreementType !== "talent_agreement") return;

  lines.push("TALENT ENGAGEMENT");
  if (talent.talentRole) lines.push(`Role: ${talent.talentRole}`);
  if (talent.engagementStartDate || talent.engagementEndDate) {
    lines.push(`Engagement: ${talent.engagementStartDate || "—"} through ${talent.engagementEndDate || "—"}`);
  }
  if (talent.shootDates) lines.push(`Shoot dates: ${talent.shootDates}`);
  if (talent.location) lines.push(`Location: ${talent.location}`);
  if (talent.appearanceDescription) lines.push(`Appearance: ${talent.appearanceDescription}`);
  lines.push(`Fee: ${formatFeeLabel(talent.feeAmount, talent.feeType)}`);
  if (talent.usageScope) lines.push(`Usage: ${talent.usageScope}`);
  const taxLines = formatPayeeTaxBlock(talent.payeeTax);
  if (taxLines.length) {
    lines.push("");
    lines.push("PAYEE / TAX INFO");
    taxLines.forEach((l) => lines.push(l));
  }
  lines.push("");
}

export function appendContractorAgreementPreview(lines: string[], agreement: AgreementPreviewData): void {
  const contractor = agreement.contractorAgreementDetails;
  if (!contractor || agreement.agreementType !== "contractor_agreement") return;

  lines.push("CONTRACTOR SERVICES");
  if (contractor.contractorRole) lines.push(`Role: ${contractor.contractorRole}`);
  if (contractor.serviceStartDate || contractor.serviceEndDate) {
    lines.push(`Service period: ${contractor.serviceStartDate || "—"} through ${contractor.serviceEndDate || "—"}`);
  }
  if (contractor.shootDates) lines.push(`Work / shoot dates: ${contractor.shootDates}`);
  if (contractor.servicesDescription) lines.push(`Services: ${contractor.servicesDescription}`);
  lines.push(`Fee: ${formatFeeLabel(contractor.feeAmount, contractor.feeType)}`);
  if (contractor.overtimeTerms) lines.push(`Overtime: ${contractor.overtimeTerms}`);
  if (contractor.kitRentalFee) {
    lines.push(`Kit rental: $${contractor.kitRentalFee.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`);
  }
  if (contractor.kitRentalNotes) lines.push(`Kit notes: ${contractor.kitRentalNotes}`);
  if (contractor.onScreenCredit) lines.push(`Credit: ${contractor.onScreenCredit}`);
  const taxLines = formatPayeeTaxBlock(contractor.payeeTax);
  if (taxLines.length) {
    lines.push("");
    lines.push("PAYEE / TAX INFO");
    taxLines.forEach((l) => lines.push(l));
  }
  lines.push("");
}

export function appendTalentAgreementPdf(
  addSection: (title: string, content: string) => void,
  agreement: AgreementPreviewData
): void {
  const talent = agreement.talentAgreementDetails;
  if (!talent) return;
  addSection(
    "Talent Engagement",
    [
      talent.talentRole && `Role: ${talent.talentRole}`,
      talent.shootDates && `Shoot dates: ${talent.shootDates}`,
      talent.location && `Location: ${talent.location}`,
      `Fee: ${formatFeeLabel(talent.feeAmount, talent.feeType)}`,
      talent.usageScope && `Usage: ${talent.usageScope}`,
    ]
      .filter(Boolean)
      .join("\n")
  );
  const tax = formatPayeeTaxBlock(talent.payeeTax);
  if (tax.length) addSection("Payee / Tax Info", tax.join("\n"));
}

export function appendContractorAgreementPdf(
  addSection: (title: string, content: string) => void,
  agreement: AgreementPreviewData
): void {
  const contractor = agreement.contractorAgreementDetails;
  if (!contractor) return;
  addSection(
    "Contractor Services",
    [
      contractor.contractorRole && `Role: ${contractor.contractorRole}`,
      contractor.shootDates && `Work / shoot dates: ${contractor.shootDates}`,
      contractor.servicesDescription && `Services: ${contractor.servicesDescription}`,
      `Fee: ${formatFeeLabel(contractor.feeAmount, contractor.feeType)}`,
      contractor.overtimeTerms && `Overtime: ${contractor.overtimeTerms}`,
      contractor.kitRentalFee
        ? `Kit rental: $${contractor.kitRentalFee.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
        : "",
      contractor.onScreenCredit && `Credit: ${contractor.onScreenCredit}`,
    ]
      .filter(Boolean)
      .join("\n")
  );
  const tax = formatPayeeTaxBlock(contractor.payeeTax);
  if (tax.length) addSection("Payee / Tax Info", tax.join("\n"));
}
