import { Agreement } from "@/lib/types";
import { generateAgreementPdf } from "@/lib/pdf/generateAgreementPdf";
import { prepareAgreementMarksServer } from "@/lib/signatures/darkenMarkImage.server";

/** Server-only — import from API routes, not client components. */
export async function getAgreementPdfBase64(agreement: Agreement): Promise<string> {
  const prepared = await prepareAgreementMarksServer(agreement);
  const arrayBuffer = generateAgreementPdf(prepared).output("arraybuffer") as ArrayBuffer;
  return Buffer.from(arrayBuffer).toString("base64");
}
