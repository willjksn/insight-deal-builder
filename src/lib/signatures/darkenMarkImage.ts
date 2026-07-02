import { Agreement } from "@/lib/types";

/** How much to pull ink toward black (lower = darker on PDF). */
export const SIGNATURE_INK_DARKEN_FACTOR = 0.38;

export function darkenMarkPixels(
  data: Uint8ClampedArray,
  factor = SIGNATURE_INK_DARKEN_FACTOR
): void {
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha < 12) continue;
    data[i] = Math.round(data[i] * factor);
    data[i + 1] = Math.round(data[i + 1] * factor);
    data[i + 2] = Math.round(data[i + 2] * factor);
    data[i + 3] = Math.min(255, Math.round(alpha * 1.12));
  }
}

export function darkenCanvasInk(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  factor = SIGNATURE_INK_DARKEN_FACTOR
): void {
  const imageData = ctx.getImageData(0, 0, width, height);
  darkenMarkPixels(imageData.data, factor);
  ctx.putImageData(imageData, 0, 0);
}

export async function darkenMarkDataUrlClient(
  dataUrl: string,
  factor = SIGNATURE_INK_DARKEN_FACTOR
): Promise<string> {
  if (typeof document === "undefined" || !dataUrl.startsWith("data:image")) {
    return dataUrl;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0);
      darkenCanvasInk(ctx, canvas.width, canvas.height, factor);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export async function prepareAgreementMarksClient(agreement: Agreement): Promise<Agreement> {
  const signatures = await Promise.all(
    agreement.signatures.map(async (sig) => ({
      ...sig,
      signatureDataUrl: await darkenMarkDataUrlClient(sig.signatureDataUrl),
    }))
  );
  const initials = await Promise.all(
    agreement.initials.map(async (entry) => ({
      ...entry,
      initialsDataUrl: await darkenMarkDataUrlClient(entry.initialsDataUrl),
    }))
  );
  return { ...agreement, signatures, initials };
}
