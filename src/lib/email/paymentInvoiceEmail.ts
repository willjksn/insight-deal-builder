import { Agreement } from "@/lib/types";
import { PRODUCER_LEGAL_NAME } from "@/lib/constants/legalTerms";
import { formatDate } from "@/lib/utils/format";

function formatMoney(amount: number): string {
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function buildPaymentInvoiceEmail(params: {
  agreement: Agreement;
  invoiceNumber: string;
  installmentLabel: string;
  amountDue: number;
  dueDate?: string;
  paymentUrl?: string | null;
  billToName: string;
}): { subject: string; html: string; text: string } {
  const project = params.agreement.projectDetails.projectName || params.agreement.title;
  const dueLabel = params.dueDate ? formatDate(params.dueDate) : "upon receipt";
  const subject = `Invoice ${params.invoiceNumber} — ${params.installmentLabel} for ${project}`;

  const text = `Hi ${params.billToName},

Please find attached invoice ${params.invoiceNumber} for ${formatMoney(params.amountDue)} (${params.installmentLabel}) on ${project}.

Due: ${dueLabel}
${params.paymentUrl ? `\nPay online: ${params.paymentUrl}\n` : ""}
Thank you,
${PRODUCER_LEGAL_NAME}`;

  const html = `
    <p>Hi ${params.billToName},</p>
    <p>Please find attached invoice <strong>${params.invoiceNumber}</strong> for
    <strong>${formatMoney(params.amountDue)}</strong> (${params.installmentLabel}) on <strong>${project}</strong>.</p>
    <p><strong>Due:</strong> ${dueLabel}</p>
    ${params.paymentUrl ? `<p><a href="${params.paymentUrl}">Pay online</a></p>` : ""}
    <p style="color:#64748b;font-size:12px;">${PRODUCER_LEGAL_NAME}</p>
  `;

  return { subject, html, text };
}
