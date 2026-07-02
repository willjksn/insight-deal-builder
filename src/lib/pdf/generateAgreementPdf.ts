import jsPDF from "jspdf";
import { Agreement } from "@/lib/types";
import { formatDate } from "@/lib/utils/format";
import { getPdfFilename } from "@/lib/agreement/preview";
import { getAgreementDocumentMeta } from "@/lib/agreement/documentMeta";
import { PRODUCER_LEGAL_NAME } from "@/lib/constants/legalTerms";
import { resolveAgreementClauses } from "@/lib/constants/clauses";
import { appendEquipmentRentalPdf } from "@/lib/agreement/equipmentRentalPreview";
import {
  appendContractorAgreementPdf,
  appendTalentAgreementPdf,
} from "@/lib/agreement/payeeAgreementPreview";
import { appendLocationAgreementPdf } from "@/lib/agreement/locationAgreementPreview";
import { prepareAgreementMarksClient } from "@/lib/signatures/darkenMarkImage";
import { paymentTermsDocumentLines } from "@/lib/agreement/paymentDiscount";

function formatCurrency(amount?: number) {
  if (amount === undefined) return "—";
  return `$${amount.toLocaleString("en-US")}`;
}

export function generateAgreementPdf(agreement: Agreement): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const margin = 50;
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxWidth = pageWidth - margin * 2;
  let y = margin;
  const meta = getAgreementDocumentMeta(agreement);
  const { isInternal, isRental, isTalent, isContractor, isLocation, isPayee } = meta;
  const pd = agreement.projectDetails;

  const addText = (text: string, size = 10, bold = false) => {
    doc.setFontSize(size);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    const lines = doc.splitTextToSize(text, maxWidth);
    for (const line of lines) {
      if (y > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += size * 1.35;
    }
  };

  const addSection = (title: string, content: string) => {
    y += 6;
    addText(title, 11, true);
    addText(content || "—", 10);
  };

  addText(PRODUCER_LEGAL_NAME, 11, true);
  y += 10;
  addText(
    meta.title.toUpperCase(),
    16,
    true
  );
  y += 4;
  addText(meta.preamble, 9);
  y += 6;
  addText(agreement.title, 12);
  y += 8;

  addSection("Project", pd.projectName);
  if (pd.clientName) addSection("Client", pd.clientName);
  addSection("Project Type", `${pd.projectType} · ${pd.shootType}`);
  if (pd.shootDate) addSection("Shoot Date", formatDate(pd.shootDate));
  if (pd.location) addSection("Location", pd.location);
  addSection("Overview", pd.projectOverview);

  if (isInternal && pd.clientOwner) {
    addSection("Client Ownership", pd.clientOwner);
    if (pd.leadProducer) addSection("Lead Producer", pd.leadProducer);
  }

  if (agreement.roles.length) {
    addText("ROLES AND RESPONSIBILITIES", 11, true);
    for (const role of agreement.roles) {
      addText(`• ${role.personOrCompanyName} — ${role.role}`, 10);
    }
    y += 6;
  }

  if (agreement.deliverables.length && !isPayee && !isRental) {
    addText("DELIVERABLES", 11, true);
    for (const d of agreement.deliverables) {
      addText(`• ${d.quantity}x ${d.name}`, 10);
    }
    y += 6;
  }

  if (isInternal && agreement.payoutDetails) {
    const p = agreement.payoutDetails;
    addText("PAYMENT BREAKDOWN", 11, true);
    addText(`Total Project Fee: ${formatCurrency(p.totalProjectFee)}`, 10);
    if (p.insightFeeAmount)
      addText(`Insight: ${formatCurrency(p.insightFeeAmount)} (${p.insightFeePercentage || 0}%)`, 10);
    if (p.aveFeeAmount) addText(`Partner: ${formatCurrency(p.aveFeeAmount)}`, 10);
    if (p.assistantFeeAmount) addText(`Assistant: ${formatCurrency(p.assistantFeeAmount)}`, 10);
    if (p.talentFeeAmount) addText(`Talent: ${formatCurrency(p.talentFeeAmount)}`, 10);
    if (p.editorFeeAmount) addText(`Editor: ${formatCurrency(p.editorFeeAmount)}`, 10);
    if (p.expensesAmount) addText(`Expenses: ${formatCurrency(p.expensesAmount)}`, 10);
    y += 6;
  }

  addText("COMMERCIAL TERMS", 11, true);
  for (const line of paymentTermsDocumentLines(agreement.paymentTerms, formatCurrency)) {
    addText(line, 10);
  }
  if (!isRental && !isPayee) {
    addText(
      `Revisions: ${agreement.revisionPolicy.includedRevisionRounds} round(s) within ${agreement.revisionPolicy.revisionRequestWindowDays} days of delivery`,
      10
    );
    addText(
      [
        `Organic social: ${agreement.usageRights.organicSocialIncluded ? "Included" : "Not included"}`,
        `Website: ${agreement.usageRights.websiteUseIncluded ? "Included" : "Not included"}`,
        `Paid ads: ${agreement.usageRights.paidAdsIncluded ? "Included" : "Not included"}`,
        `Full buyout: ${agreement.usageRights.fullBuyout ? "Included as stated" : "Not included unless expressly stated"}`,
        `Raw footage included: ${agreement.rawFootagePolicy.rawFootageIncluded ? "Yes" : "No"}`,
      ].join(" · "),
      10
    );
  }
  if (
    agreement.cancellationPolicy.rescheduleAllowed &&
    agreement.cancellationPolicy.rescheduleNoticeRequiredHours
  ) {
    addText(
      `Reschedule notice: at least ${agreement.cancellationPolicy.rescheduleNoticeRequiredHours} hours`,
      10
    );
  }
  y += 6;

  if (isRental && agreement.equipmentRentalDetails) {
    appendEquipmentRentalPdf(addText, addSection, agreement.equipmentRentalDetails);
    y += 6;
  }
  if (isTalent) appendTalentAgreementPdf(addSection, agreement);
  if (isContractor) appendContractorAgreementPdf(addSection, agreement);
  if (isLocation) appendLocationAgreementPdf(addSection, agreement);

  if (!isRental && !isPayee && agreement.gearDetails?.insightGearUsed) {
    addSection("Gear Package", agreement.gearDetails.gearPackage);
    if (agreement.gearDetails.gearResponsibilityClause) {
      addSection("Equipment Responsibility", agreement.gearDetails.gearResponsibilityClause);
    }
  }

  addText("TERMS AND CONDITIONS", 11, true);
  addText(
    "The following terms are incorporated into this Agreement. Initials or signatures indicate acceptance where required.",
    9
  );
  y += 4;

  for (const clause of resolveAgreementClauses(agreement)) {
    addSection(clause.title, clause.body);
    const initialed = agreement.initials.filter((i) => i.clauseId === clause.id);
    for (const initial of initialed) {
      try {
        doc.addImage(initial.initialsDataUrl, "PNG", margin, y, 50, 25);
        y += 30;
      } catch {
        y += 10;
      }
    }
  }

  y += 10;
  addText("SIGNATURES", 11, true);
  for (const sig of agreement.signatures) {
    if (y > doc.internal.pageSize.getHeight() - 120) {
      doc.addPage();
      y = margin;
    }
    addText(`${sig.signerName}${sig.signerTitle ? ` — ${sig.signerTitle}` : ""}`, 10, true);
    addText(`Signed: ${formatDate(sig.signedAt)}`, 9);
    try {
      doc.addImage(sig.signatureDataUrl, "PNG", margin, y, 180, 60);
      y += 75;
    } catch {
      y += 20;
    }
  }

  for (const party of agreement.parties.filter((p) => p.signatureRequired)) {
    const signed = agreement.signatures.some((s) => s.partyId === party.id);
    if (!signed) {
      addText(`${party.signerName} (${party.roleInAgreement}): ___________________`, 10);
      y += 20;
    }
  }

  return doc;
}

export async function downloadAgreementPdf(agreement: Agreement) {
  const prepared = await prepareAgreementMarksClient(agreement);
  const doc = generateAgreementPdf(prepared);
  doc.save(getPdfFilename(prepared));
}

export function getAgreementPdfBlob(agreement: Agreement): Blob {
  return generateAgreementPdf(agreement).output("blob");
}
