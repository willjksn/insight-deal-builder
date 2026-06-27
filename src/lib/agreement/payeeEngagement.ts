import {
  ContractorAgreementDetails,
  PaymentTerms,
  PayeeTaxInfo,
  TalentAgreementDetails,
} from "@/lib/types";
import { hasW9Document } from "@/lib/w9/payeeTax";

export const EMPTY_TALENT_AGREEMENT_DETAILS: TalentAgreementDetails = {
  engagementStartDate: "",
  engagementEndDate: "",
  shootDates: "",
  location: "",
  talentRole: "On-camera talent",
  appearanceDescription: "",
  feeAmount: 0,
  feeType: "day",
  usageScope:
    "Organic social media, website, and internal marketing for the project named in this Agreement unless otherwise stated.",
  payeeTax: { entityType: "individual", w9OnFile: false },
};

export const EMPTY_CONTRACTOR_AGREEMENT_DETAILS: ContractorAgreementDetails = {
  serviceStartDate: "",
  serviceEndDate: "",
  contractorRole: "",
  servicesDescription: "",
  feeAmount: 0,
  feeType: "day",
  payeeTax: { entityType: "individual", w9OnFile: false },
};

export function syncPayeePaymentTerms(feeAmount: number, existing?: PaymentTerms): PaymentTerms {
  const totalFee = Math.max(0, Math.round(feeAmount * 100) / 100);
  return {
    totalFee,
    paymentStructure: existing?.paymentStructure || "100% due before shoot",
    depositAmount: totalFee,
    balanceAmount: 0,
    paymentNotes:
      existing?.paymentNotes ||
      "Payment is due on the dates stated in this Agreement. Contractor/talent is responsible for applicable taxes. Producer may withhold payment until a signed agreement and W-9 (if requested) are on file.",
  };
}

export function formatPayeeTaxBlock(tax?: PayeeTaxInfo): string[] {
  if (!tax) return [];
  const lines: string[] = [];
  if (tax.legalName) lines.push(`Legal name: ${tax.legalName}`);
  if (tax.businessName) lines.push(`Business name: ${tax.businessName}`);
  if (tax.mailingAddress) {
    const cityLine = [tax.city, tax.state, tax.zip].filter(Boolean).join(", ");
    lines.push(`Address: ${tax.mailingAddress}${cityLine ? `, ${cityLine}` : ""}`);
  }
  if (tax.entityType) lines.push(`Entity type: ${tax.entityType}`);
  if (hasW9Document(tax)) lines.push("W-9 on file: Yes");
  else if (tax.w9OnFile === false) lines.push("W-9 on file: No");
  if (tax.taxNotes) lines.push(`Tax notes: ${tax.taxNotes}`);
  return lines;
}

export function formatFeeLabel(feeAmount: number, feeType: string): string {
  const amt = `$${feeAmount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  if (feeType === "hourly") return `${amt}/hour`;
  if (feeType === "day") return `${amt}/day`;
  return `${amt} flat`;
}
