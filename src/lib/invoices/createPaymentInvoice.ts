import { FieldValue, Firestore } from "firebase-admin/firestore";
import { Agreement, PaymentInvoiceRecord } from "@/lib/types";
import { generatePaymentInvoicePdf } from "@/lib/pdf/generatePaymentInvoicePdf";
import { getPaymentInvoicePdfFilename } from "@/lib/pdf/generatePaymentInvoicePdf";
import {
  appendPaymentInvoice,
  getInvoiceContext,
  markPaymentInvoicesPaid,
} from "@/lib/invoices/paymentInvoice";
import { uploadPaymentInvoicePdf } from "@/lib/invoices/storage";
import { buildPaymentInvoiceEmail } from "@/lib/email/paymentInvoiceEmail";
import { sendClientAgreementEmail } from "@/lib/notifications/delivery";
import { getClientPaymentUrl } from "@/lib/signing/server";
import { isStripeConfigured } from "@/lib/stripe/config";
import { agreementAcceptsStripePayments } from "@/lib/stripe/eligibility";

export type CreatePaymentInvoiceParams = {
  agreement: Agreement;
  installmentId: string;
  sendEmail: boolean;
  recipientEmail?: string;
  paymentSigningToken?: string | null;
  appUrl: string;
};

export type CreatePaymentInvoiceResult = {
  invoice: PaymentInvoiceRecord;
  emailed: boolean;
  emailTo?: string;
};

export async function createPaymentInvoice(
  params: CreatePaymentInvoiceParams
): Promise<CreatePaymentInvoiceResult> {
  const ctx = getInvoiceContext(params.agreement, params.installmentId);
  const invoiceId = crypto.randomUUID();

  const paymentUrl =
    params.paymentSigningToken &&
    isStripeConfigured() &&
    agreementAcceptsStripePayments(params.agreement)
      ? getClientPaymentUrl(params.paymentSigningToken, params.appUrl)
      : null;

  const pdf = generatePaymentInvoicePdf({
    agreement: params.agreement,
    invoiceNumber: ctx.invoiceNumber,
    installmentLabel: ctx.row.label,
    amountDue: ctx.outstanding,
    issuedAt: ctx.issuedAt,
    dueDate: ctx.dueDate,
    billToName: ctx.billTo.name,
    billToCompany: ctx.billTo.company,
    billToEmail: ctx.billTo.email,
    paymentUrl,
    promotionSummary: ctx.promotionSummary,
  });

  const buffer = Buffer.from(pdf.output("arraybuffer") as ArrayBuffer);
  const storagePath = await uploadPaymentInvoicePdf(params.agreement.id, invoiceId, buffer);

  const invoice: PaymentInvoiceRecord = {
    id: invoiceId,
    installmentId: params.installmentId,
    invoiceNumber: ctx.invoiceNumber,
    amountDue: ctx.outstanding,
    status: "sent",
    issuedAt: ctx.issuedAt,
    dueDate: ctx.dueDate,
    storagePath,
  };

  let emailed = false;
  let emailTo: string | undefined;

  if (params.sendEmail) {
    emailTo = (params.recipientEmail || ctx.billTo.email || "").trim();
    if (!emailTo) {
      throw new Error("Recipient email is required to send the invoice.");
    }

    const emailContent = buildPaymentInvoiceEmail({
      agreement: params.agreement,
      invoiceNumber: ctx.invoiceNumber,
      installmentLabel: ctx.row.label,
      amountDue: ctx.outstanding,
      dueDate: ctx.dueDate,
      paymentUrl,
      billToName: ctx.billTo.name,
    });

    const emailResult = await sendClientAgreementEmail({
      to: emailTo,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
      pdfFilename: getPaymentInvoicePdfFilename(ctx.invoiceNumber),
      pdfBase64: buffer.toString("base64"),
    });

    invoice.sentTo = emailTo;
    invoice.sentAt = new Date().toISOString();
    invoice.resendEmailId = emailResult.id;
    emailed = true;
  }

  return { invoice, emailed, emailTo };
}

export function applyPaymentInvoiceToTracking(
  agreement: Agreement,
  invoice: PaymentInvoiceRecord
): Agreement["paymentTracking"] {
  return appendPaymentInvoice(agreement.paymentTracking, invoice);
}

export async function persistAgreementPaymentTracking(
  db: Firestore,
  agreementId: string,
  paymentTracking: Agreement["paymentTracking"]
): Promise<void> {
  await db.collection("agreements").doc(agreementId).update({
    paymentTracking,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export function applyPaidInvoicesToTracking(
  tracking: Agreement["paymentTracking"],
  installmentId: string,
  paidAt: string,
  stripe?: { stripeCheckoutSessionId?: string; stripePaymentIntentId?: string }
): Agreement["paymentTracking"] {
  const base = tracking ?? { installments: [] };
  return markPaymentInvoicesPaid(base, installmentId, paidAt, stripe) ?? base;
}

export { markPaymentInvoicesPaid };
