import { Agreement, AgreementType } from "@/lib/types";
import { formatDate } from "@/lib/utils/format";
import { getAgreementDocumentMeta } from "@/lib/agreement/documentMeta";
import { PRODUCER_LEGAL_NAME } from "@/lib/constants/legalTerms";
import { resolveAgreementClauses } from "@/lib/constants/clauses";
import { appendEquipmentRentalPreview } from "@/lib/agreement/equipmentRentalPreview";
import {
  appendContractorAgreementPreview,
  appendTalentAgreementPreview,
} from "@/lib/agreement/payeeAgreementPreview";
import { appendLocationAgreementPreview } from "@/lib/agreement/locationAgreementPreview";
import { getAgreementTypeLabel } from "@/lib/agreement/wizardSteps";
import { paymentTermsDocumentLines } from "@/lib/agreement/paymentDiscount";

export type AgreementPreviewData = Omit<Agreement, "id" | "createdAt" | "updatedAt">;

function formatCurrency(amount?: number) {
  if (amount === undefined || amount === null) return "—";
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function generateAgreementPreview(agreement: AgreementPreviewData, mode: "full" | "summary" | "client" = "full"): string {
  const lines: string[] = [];
  const meta = getAgreementDocumentMeta(agreement);
  const { isInternal, isRental, isTalent, isContractor, isLocation, isPayee } = meta;
  const pd = agreement.projectDetails;

  const docTitle = meta.title.toUpperCase();
  const preamble = meta.preamble;

  lines.push(PRODUCER_LEGAL_NAME);
  lines.push("");
  lines.push(docTitle);
  lines.push("");
  lines.push(preamble);
  lines.push("");
  lines.push(`Title: ${agreement.title}`);
  lines.push(`Project: ${pd.projectName}`);
  if (pd.clientName) lines.push(`Client: ${pd.clientName}`);
  lines.push(`Date: ${formatDate(new Date().toISOString())}`);
  lines.push("");

  if (mode === "summary") {
    lines.push("SUMMARY");
    lines.push(`Type: ${getAgreementTypeLabel(agreement.agreementType)}`);
    lines.push(`Fee: ${formatCurrency(agreement.paymentTerms.totalFee)}`);
    lines.push(`Deliverables: ${agreement.deliverables.length} items`);
    lines.push(`Parties: ${agreement.parties.length}`);
    return lines.join("\n");
  }

  lines.push("PROJECT INFORMATION");
  lines.push(`Project Type: ${pd.projectType}`);
  lines.push(`Shoot Type: ${pd.shootType}`);
  if (pd.shootDate) lines.push(`Shoot Date: ${formatDate(pd.shootDate)}`);
  if (pd.location) lines.push(`Location: ${pd.location}`);
  lines.push("");
  lines.push("PROJECT OVERVIEW");
  lines.push(pd.projectOverview || "—");
  lines.push("");

  if (isRental) {
    appendEquipmentRentalPreview(lines, agreement);
  }
  if (isTalent) {
    appendTalentAgreementPreview(lines, agreement);
  }
  if (isContractor) {
    appendContractorAgreementPreview(lines, agreement);
  }
  if (isLocation) {
    appendLocationAgreementPreview(lines, agreement);
  }

  if (isInternal && pd.clientOwner) {
    lines.push("CLIENT OWNERSHIP");
    lines.push(`Client relationship owned by: ${pd.clientOwner}`);
    if (pd.leadProducer) lines.push(`Lead Producer: ${pd.leadProducer}`);
    lines.push("");
  }

  if (agreement.roles.length > 0) {
    lines.push("ROLES AND RESPONSIBILITIES");
    for (const role of agreement.roles) {
      lines.push(`• ${role.personOrCompanyName} — ${role.role}`);
      for (const r of role.responsibilities) lines.push(`  - ${r}`);
    }
    lines.push("");
  }

  if (agreement.deliverables.length > 0 && !isRental && !isPayee) {
    lines.push("DELIVERABLES");
    for (const d of agreement.deliverables) {
      lines.push(`• ${d.quantity}x ${d.name}${d.format ? ` (${d.format})` : ""}`);
    }
    lines.push("");
  }

  if (isInternal && agreement.payoutDetails && mode !== "client") {
    const p = agreement.payoutDetails;
    lines.push("PAYMENT BREAKDOWN");
    lines.push(`Total Project Fee: ${formatCurrency(p.totalProjectFee)}`);
    if (p.insightFeeAmount) lines.push(`Insight Fee: ${formatCurrency(p.insightFeeAmount)} (${p.insightFeePercentage || 0}%)`);
    if (p.aveFeeAmount) lines.push(`Partner fee: ${formatCurrency(p.aveFeeAmount)}`);
    if (p.assistantFeeAmount) lines.push(`Assistant: ${formatCurrency(p.assistantFeeAmount)}`);
    if (p.talentFeeAmount) lines.push(`Talent: ${formatCurrency(p.talentFeeAmount)}`);
    if (p.editorFeeAmount) lines.push(`Editor: ${formatCurrency(p.editorFeeAmount)}`);
    if (p.expensesAmount) lines.push(`Expenses: ${formatCurrency(p.expensesAmount)}`);
    lines.push("");
  }

  lines.push("COMMERCIAL TERMS");
  lines.push(...paymentTermsDocumentLines(agreement.paymentTerms, (amount) => formatCurrency(amount)));
  if (!isRental && !isPayee) {
    lines.push(
      `Revisions: ${agreement.revisionPolicy.includedRevisionRounds} round(s) within ${agreement.revisionPolicy.revisionRequestWindowDays} days of delivery`
    );
    lines.push(`Organic social: ${agreement.usageRights.organicSocialIncluded ? "Included" : "Not included"}`);
    lines.push(`Website use: ${agreement.usageRights.websiteUseIncluded ? "Included" : "Not included"}`);
    lines.push(
      `Paid advertising: ${agreement.usageRights.paidAdsIncluded ? "Included" : "Not included — separate written approval required"}`
    );
    lines.push(`Full buyout: ${agreement.usageRights.fullBuyout ? "Included as stated" : "Not included unless expressly stated"}`);
    lines.push(`Raw footage included: ${agreement.rawFootagePolicy.rawFootageIncluded ? "Yes" : "No"}`);
  }
  if (agreement.cancellationPolicy.rescheduleAllowed && agreement.cancellationPolicy.rescheduleNoticeRequiredHours) {
    lines.push(`Reschedule notice: at least ${agreement.cancellationPolicy.rescheduleNoticeRequiredHours} hours`);
  }
  lines.push("");

  lines.push("TERMS AND CONDITIONS");
  lines.push("The following terms are incorporated into this Agreement. Initials or signatures indicate acceptance where required.");
  lines.push("");

  for (const clause of resolveAgreementClauses(agreement)) {
    lines.push(clause.title.toUpperCase());
    lines.push(clause.body);
    lines.push("");
  }

  lines.push("SIGNATURE BLOCK");
  for (const party of agreement.parties.filter((p) => p.signatureRequired)) {
    const signed = agreement.signatures.find((s) => s.partyId === party.id);
    lines.push(`${party.signerName} (${party.roleInAgreement}): ${signed ? "Signed" : "Pending"}`);
  }

  return lines.join("\n");
}

export function getPdfFilename(agreement: AgreementPreviewData): string {
  const project = agreement.projectDetails.projectName.replace(/[^a-z0-9]/gi, "_");
  const type = getAgreementTypeLabel(agreement.agreementType).replace(/[^a-z0-9]/gi, "_");
  const date = new Date().toISOString().split("T")[0];
  return `${project}_${type}_${date}.pdf`;
}
