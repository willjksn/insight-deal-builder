import sharp from "sharp";
import { Agreement } from "@/lib/types";
import { darkenMarkPixels, SIGNATURE_INK_DARKEN_FACTOR } from "@/lib/signatures/darkenMarkImage";

async function darkenMarkDataUrlServer(
  dataUrl: string,
  factor = SIGNATURE_INK_DARKEN_FACTOR
): Promise<string> {
  const match = /^data:image\/\w+;base64,(.+)$/i.exec(dataUrl);
  if (!match) return dataUrl;

  try {
    const input = Buffer.from(match[1], "base64");
    const { data, info } = await sharp(input)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const pixels = new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength);
    darkenMarkPixels(pixels, factor);

    const out = await sharp(Buffer.from(pixels), {
      raw: {
        width: info.width,
        height: info.height,
        channels: info.channels,
      },
    })
      .png()
      .toBuffer();

    return `data:image/png;base64,${out.toString("base64")}`;
  } catch {
    return dataUrl;
  }
}

export async function prepareAgreementMarksServer(agreement: Agreement): Promise<Agreement> {
  const signatures = await Promise.all(
    agreement.signatures.map(async (sig) => ({
      ...sig,
      signatureDataUrl: await darkenMarkDataUrlServer(sig.signatureDataUrl),
    }))
  );
  const initials = await Promise.all(
    agreement.initials.map(async (entry) => ({
      ...entry,
      initialsDataUrl: await darkenMarkDataUrlServer(entry.initialsDataUrl),
    }))
  );
  return { ...agreement, signatures, initials };
}
