import { Agreement } from "@/lib/types";

export function getEmailSubject(agreement: Agreement): string {
  const name = agreement.projectDetails.projectName || agreement.title;
  if (agreement.agreementType === "equipment_rental") {
    return `Equipment Rental Agreement for ${name}`;
  }
  if (agreement.agreementType === "talent_agreement") {
    return `Talent Agreement for ${name}`;
  }
  if (agreement.agreementType === "contractor_agreement") {
    return `Contractor Agreement for ${name}`;
  }
  if (agreement.agreementType === "location_agreement") {
    return `Location & Prop Agreement for ${name}`;
  }
  if (agreement.agreementType === "client_project") {
    return `Project Agreement for ${name}`;
  }
  return `Internal Collaboration Agreement for ${name}`;
}

export function getEmailBody(agreement: Agreement, productionCompany = "Insight Media Group LLC"): string {
  const name = agreement.projectDetails.projectName || agreement.title;
  const recipientName =
    agreement.parties.find((p) => p.type === "client")?.signerName ||
    agreement.parties.find((p) => p.roleInAgreement === "Renter")?.signerName ||
    agreement.parties.find((p) => p.roleInAgreement === "Talent")?.signerName ||
    agreement.parties.find((p) => p.roleInAgreement === "Contractor")?.signerName ||
    agreement.parties.find((p) => p.roleInAgreement === "Property Owner")?.signerName ||
    agreement.projectDetails.clientName ||
    "there";

  if (agreement.agreementType === "equipment_rental") {
    return `Hi ${recipientName},

Attached is the equipment rental agreement for ${name}. Please review the equipment schedule, rental period, and terms. Sign electronically to confirm acceptance.

Thank you,
${productionCompany}`;
  }

  if (agreement.agreementType === "talent_agreement") {
    return `Hi ${recipientName},

Attached is the talent agreement for ${name}. Please review compensation, appearance/release terms, and sign electronically. Government ID verification is required before signing.

Thank you,
${productionCompany}`;
  }

  if (agreement.agreementType === "contractor_agreement") {
    return `Hi ${recipientName},

Attached is the contractor agreement for ${name}. Please review services, compensation, and independent contractor terms, then sign electronically.

Thank you,
${productionCompany}`;
  }

  if (agreement.agreementType === "location_agreement") {
    return `Hi ${recipientName},

Attached is the location and property use agreement for ${name}. Please review permitted use, fees, insurance requirements, and sign electronically.

Thank you,
${productionCompany}`;
  }

  if (agreement.agreementType === "client_project") {
    return `Hi ${recipientName},

Attached is the project agreement for ${name}. Please review and sign electronically. Once signed and the required payment is received, your project date will be confirmed.

Thank you,
${productionCompany}`;
  }

  return `Attached is the internal collaboration agreement for ${name}. This confirms roles, payout, equipment use, responsibilities, and delivery expectations before production begins.`;
}

export function getMailtoLink(agreement: Agreement, recipientEmail?: string): string {
  const subject = encodeURIComponent(getEmailSubject(agreement));
  const body = encodeURIComponent(getEmailBody(agreement));
  const to = recipientEmail ? encodeURIComponent(recipientEmail) : "";
  return `mailto:${to}?subject=${subject}&body=${body}`;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function buildClientAgreementSendEmail(params: {
  agreement: Agreement;
  signingUrl: string;
  expiresAt: string;
  productionCompany?: string;
  /** Same signing token — client pays deposit/balance after signing */
  paymentUrl?: string | null;
}): { subject: string; html: string; text: string } {
  const { agreement, signingUrl, expiresAt, paymentUrl } = params;
  const productionCompany = params.productionCompany || "Insight Media Group LLC";
  const subject = getEmailSubject(agreement);
  const intro = getEmailBody(agreement, productionCompany);

  const showPaymentLink =
    Boolean(paymentUrl) &&
    (agreement.agreementType === "client_project" ||
      agreement.agreementType === "equipment_rental") &&
    agreement.paymentTerms.totalFee > 0;

  const paymentLabel =
    agreement.agreementType === "equipment_rental"
      ? "pay your rental deposit or balance by card"
      : "pay your deposit or balance by card";

  const paymentText = showPaymentLink
    ? `\n\nAfter you sign, ${paymentLabel} here:\n${paymentUrl}`
    : "";

  const paymentHtml = showPaymentLink
    ? `<p>After you sign, <strong><a href="${paymentUrl}">${paymentLabel}</a></strong> (secure Stripe checkout).</p>`
    : "";

  const text = `${intro}

Review and sign electronically here (link expires ${expiresAt}):
${signingUrl}${paymentText}

The agreement PDF is attached for your records.

Thank you,
${productionCompany}`;

  const html = `
    <p>${intro.replace(/\n/g, "<br/>")}</p>
    <p><strong><a href="${signingUrl}">Review and sign your agreement</a></strong></p>
    ${paymentHtml}
    <p style="color:#64748b;font-size:13px;">This signing link expires ${expiresAt}. The agreement PDF is attached.</p>
    <p>Thank you,<br/>${productionCompany}</p>
  `;

  return { subject, html, text };
}
