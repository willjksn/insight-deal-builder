import jsPDF from "jspdf";
import { Agreement } from "@/lib/types";
import { PRODUCER_LEGAL_NAME } from "@/lib/constants/legalTerms";
import { formatDate } from "@/lib/utils/format";
import { getAgreementDocumentMeta } from "@/lib/agreement/documentMeta";
import { invoiceFilename } from "@/lib/invoices/paymentInvoice";

export type PaymentInvoicePdfInput = {
  agreement: Agreement;
  invoiceNumber: string;
  installmentLabel: string;
  amountDue: number;
  issuedAt: string;
  dueDate?: string;
  billToName: string;
  billToCompany?: string;
  billToEmail?: string;
  paymentUrl?: string | null;
  promotionSummary?: string | null;
};

function formatMoney(amount: number): string {
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function generatePaymentInvoicePdf(input: PaymentInvoicePdfInput): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const margin = 54;
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxWidth = pageWidth - margin * 2;
  let y = margin;
  const meta = getAgreementDocumentMeta(input.agreement);
  const pd = input.agreement.projectDetails;

  const addText = (text: string, size = 10, bold = false, color: [number, number, number] = [15, 23, 42]) => {
    doc.setFontSize(size);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setTextColor(...color);
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

  const addRightText = (text: string, size = 10, bold = false) => {
    doc.setFontSize(size);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setTextColor(15, 23, 42);
    doc.text(text, pageWidth - margin, y, { align: "right" });
  };

  addText(PRODUCER_LEGAL_NAME, 12, true);
  y += 4;
  addText("PAYMENT INVOICE", 18, true);
  y += 8;

  const metaY = y;
  addText(`Invoice #: ${input.invoiceNumber}`, 10, true);
  y += 2;
  addText(`Issue date: ${formatDate(input.issuedAt)}`, 10);
  y += 2;
  addText(`Due date: ${input.dueDate ? formatDate(input.dueDate) : "Upon receipt"}`, 10);
  y = metaY;
  addRightText(`Agreement: ${input.agreement.title}`, 10);
  addRightText(`Project: ${pd.projectName || "—"}`, 10);

  y += 20;
  addText("BILL TO", 10, true);
  addText(input.billToName, 11, true);
  if (input.billToCompany) addText(input.billToCompany, 10);
  if (input.billToEmail) addText(input.billToEmail, 10, false, [100, 116, 139]);

  y += 12;
  addText("DESCRIPTION", 10, true);
  y += 6;

  const tableTop = y;
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, tableTop, maxWidth, 24, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Item", margin + 8, tableTop + 16);
  doc.text("Amount", pageWidth - margin - 8, tableTop + 16, { align: "right" });

  y = tableTop + 34;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.text(`${input.installmentLabel} — ${meta.title}`, margin + 8, y);
  doc.text(formatMoney(input.amountDue), pageWidth - margin - 8, y, { align: "right" });
  y += 18;
  doc.line(margin, y, pageWidth - margin, y);
  y += 16;
  doc.setFont("helvetica", "bold");
  doc.text("Total due", margin + 8, y);
  doc.text(formatMoney(input.amountDue), pageWidth - margin - 8, y, { align: "right" });

  y += 24;
  if (input.promotionSummary) {
    addText(input.promotionSummary, 9, false, [109, 40, 217]);
    y += 4;
  }

  addText(
    `This invoice is issued under ${meta.title} for ${pd.projectName || input.agreement.title}. Payment applies to the ${input.installmentLabel.toLowerCase()} per your signed agreement.`,
    9,
    false,
    [71, 85, 105]
  );

  y += 8;
  if (input.paymentUrl) {
    addText("Pay online:", 10, true);
    addText(input.paymentUrl, 9, false, [2, 132, 199]);
  } else {
    addText(
      "Please remit payment per the terms in your agreement. Contact us if you need wire or check instructions.",
      9,
      false,
      [71, 85, 105]
    );
  }

  y += 16;
  addText("Thank you for your business.", 10, false, [71, 85, 105]);

  return doc;
}

export function getPaymentInvoicePdfFilename(invoiceNumber: string): string {
  return invoiceFilename(invoiceNumber);
}

export function downloadPaymentInvoicePdf(input: PaymentInvoicePdfInput): void {
  const doc = generatePaymentInvoicePdf(input);
  doc.save(getPaymentInvoicePdfFilename(input.invoiceNumber));
}
