import type jsPDF from "jspdf";
import { BRAND_LOGO_ASPECT_RATIO, BRAND_LOGO_PDF_BASE64 } from "@/lib/brand/logoAssets.generated";

/** Add horizontal logo to jsPDF; returns height used in pt. */
export function addBrandLogoToPdf(doc: jsPDF, x: number, y: number, maxWidth: number): number {
  if (!BRAND_LOGO_PDF_BASE64?.startsWith("data:image/png")) return 0;

  const height = maxWidth / BRAND_LOGO_ASPECT_RATIO;
  try {
    doc.addImage(BRAND_LOGO_PDF_BASE64, "PNG", x, y, maxWidth, height);
    return height;
  } catch {
    return 0;
  }
}
