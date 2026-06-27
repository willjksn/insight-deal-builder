import { Agreement } from "@/lib/types";
import { generateAgreementPdf } from "@/lib/pdf/generateAgreementPdf";

/** Server-only — import from API routes, not client components. */
export function getAgreementPdfBase64(agreement: Agreement): string {
  const arrayBuffer = generateAgreementPdf(agreement).output("arraybuffer") as ArrayBuffer;
  return Buffer.from(arrayBuffer).toString("base64");
}
