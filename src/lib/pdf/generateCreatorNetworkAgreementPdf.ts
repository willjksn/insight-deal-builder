import jsPDF from "jspdf";
import { PRODUCER_LEGAL_NAME } from "@/lib/constants/legalTerms";
import {
  CREATOR_NETWORK_AGREEMENT,
  CREATOR_NETWORK_AGREEMENT_UPDATED,
  CREATOR_NETWORK_AGREEMENT_VERSION,
  type CreatorAgreementDocument,
} from "@/lib/creators/networkAgreementContent";
import type { CreatorNetworkAgreement } from "@/lib/creators/types";
function formatSignedAt(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short",
  }).formatToParts(d);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return `${get("month")} ${get("day")}, ${get("year")} ${get("hour")}:${get("minute")}${get("dayPeriod").toLowerCase()} ${get("timeZoneName")}`;
}

export function generateCreatorNetworkAgreementPdf(
  document: CreatorAgreementDocument = CREATOR_NETWORK_AGREEMENT,
  record?: CreatorNetworkAgreement | null,
  opts?: { creatorDisplayName?: string }
): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const margin = 50;
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxWidth = pageWidth - margin * 2;
  let y = margin;

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

  addText(PRODUCER_LEGAL_NAME, 11, true);
  y += 8;
  addText(document.title.toUpperCase(), 14, true);
  y += 4;
  addText(document.subtitle, 9);
  y += 4;
  addText(
    `Version ${CREATOR_NETWORK_AGREEMENT_VERSION} · Updated ${CREATOR_NETWORK_AGREEMENT_UPDATED}`,
    9
  );
  y += 10;

  if (record?.status === "signed") {
    addText("ELECTRONIC SIGNATURE RECORD", 11, true);
    addText(`Signer: ${record.signerName || opts?.creatorDisplayName || "—"}`, 10);
    if (record.signerEmail) addText(`Email: ${record.signerEmail}`, 10);
    addText(`Signed: ${formatSignedAt(record.signedAt)}`, 10);
    addText(`Agreement version: ${record.version || CREATOR_NETWORK_AGREEMENT_VERSION}`, 10);
    if (record.ipAddress) addText(`IP address: ${record.ipAddress}`, 10);
    y += 8;
  } else {
    addText("Unsigned copy — for review only.", 10, true);
    y += 8;
  }

  for (const section of document.sections) {
    y += 4;
    addText(section.title, 11, true);
    for (const paragraph of section.paragraphs ?? []) {
      addText(paragraph, 10);
      y += 2;
    }
    for (const bullet of section.bullets ?? []) {
      addText(`• ${bullet}`, 10);
    }
    y += 4;
  }

  y += 8;
  addText(
    "This PDF is a record of the Creator Network Independent Contractor Agreement as presented in ShootSpine. Have licensed counsel review before relying on these terms.",
    8
  );

  return doc;
}

export function downloadCreatorNetworkAgreementPdf(
  record?: CreatorNetworkAgreement | null,
  opts?: { creatorDisplayName?: string }
) {
  const pdf = generateCreatorNetworkAgreementPdf(CREATOR_NETWORK_AGREEMENT, record, opts);
  const signed = record?.status === "signed";
  const stamp = record?.signedAt?.slice(0, 10) || CREATOR_NETWORK_AGREEMENT_VERSION;
  const name = (opts?.creatorDisplayName || record?.signerName || "creator")
    .replace(/[^\w\- ]+/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();
  pdf.save(
    signed
      ? `creator-network-agreement-${name}-${stamp}.pdf`
      : `creator-network-agreement-${CREATOR_NETWORK_AGREEMENT_VERSION}.pdf`
  );
}
