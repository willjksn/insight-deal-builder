import sharp from "sharp";
import { fetchImageInlineData, type GeminiPart } from "@/lib/ai/geminiClient";
import { getAdminStorage } from "@/lib/firebase/admin";
import type { ShootGuideReference, ShootGuideReferenceKind } from "@/lib/shootGuide/types";
import { pickWidestStill, looksLikeCompositeStill } from "@/lib/shootGuide/widestStill";

const MAX_PER_KIND = 2;
const MAX_PLOT_STILLS = 3;
const MAX_BYTES = 8 * 1024 * 1024;

function mimeFromPath(path: string, fallback = "image/jpeg"): string {
  const ext = path.split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  return fallback;
}

async function sizeFromBytes(buffer: Buffer): Promise<{ width: number; height: number }> {
  try {
    const meta = await sharp(buffer).metadata();
    return { width: meta.width ?? 0, height: meta.height ?? 0 };
  } catch {
    return { width: 0, height: 0 };
  }
}

async function downloadFromAdmin(
  storagePath: string
): Promise<{ mimeType: string; buffer: Buffer } | null> {
  const storage = getAdminStorage();
  if (!storage || !storagePath) return null;
  try {
    const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    const bucket = bucketName ? storage.bucket(bucketName) : storage.bucket();
    const file = bucket.file(storagePath);
    const [buffer] = await file.download();
    if (!buffer?.length || buffer.length > MAX_BYTES) return null;
    const [metadata] = await file.getMetadata().catch(() => [{ contentType: "" }]);
    const mime =
      String((metadata as { contentType?: string }).contentType || "")
        .split(";")[0]
        .trim() || mimeFromPath(storagePath);
    return { mimeType: mime, buffer };
  } catch {
    return null;
  }
}

type LoadedStill = {
  ref: ShootGuideReference;
  mimeType: string;
  data: string;
  width: number;
  height: number;
};

async function loadStill(ref: ShootGuideReference): Promise<LoadedStill | null> {
  const fromAdmin = await downloadFromAdmin(ref.storagePath);
  if (fromAdmin) {
    const size = await sizeFromBytes(fromAdmin.buffer);
    return {
      ref,
      mimeType: fromAdmin.mimeType,
      data: fromAdmin.buffer.toString("base64"),
      ...size,
    };
  }
  if (!ref.storageUrl) return null;
  const inline = await fetchImageInlineData(ref.storageUrl);
  if (!inline) return null;
  const size = await sizeFromBytes(Buffer.from(inline.data, "base64"));
  return { ref, mimeType: inline.mimeType, data: inline.data, ...size };
}

export async function referenceToInlineData(
  ref: ShootGuideReference
): Promise<{ mimeType: string; data: string } | null> {
  const loaded = await loadStill(ref);
  if (!loaded) return null;
  return { mimeType: loaded.mimeType, data: loaded.data };
}

export async function visionImageParts(
  refs: ShootGuideReference[]
): Promise<{
  parts: GeminiPart[];
  used: ShootGuideReference[];
  widestLocationId: string | null;
  overlayLocationId: string | null;
}> {
  const used: ShootGuideReference[] = [];
  const parts: GeminiPart[] = [];

  const locationRefs = refs.filter((r) => r.kind === "location" || r.kind === "mood");
  const loadedLocation = (await Promise.all(locationRefs.map(loadStill))).filter(
    (s): s is LoadedStill => Boolean(s)
  );
  const sizes: Record<string, { width: number; height: number }> = {};
  for (const s of loadedLocation) sizes[s.ref.id] = { width: s.width, height: s.height };
  const widest = pickWidestStill(
    loadedLocation.map((s) => s.ref),
    sizes
  );
  loadedLocation.sort((a, b) => {
    if (widest && a.ref.id === widest.id) return -1;
    if (widest && b.ref.id === widest.id) return 1;
    return b.width - a.width;
  });

  for (const still of loadedLocation.slice(0, MAX_PLOT_STILLS)) {
    const isComposite = looksLikeCompositeStill(still.ref);
    const isWidest = still.ref.id === widest?.id;
    const dim = still.width && still.height ? ` ${still.width}×${still.height}` : "";
    let tag = "[location still";
    if (isComposite) {
      tag = "[location still — STORYBOARD / grid. Use the WIDE or ESTABLISHING panel as the room. Do not place photoView markers on a multi-panel image";
    } else if (isWidest) {
      tag = "[location still — WIDEST / establishing single frame";
    } else {
      tag = "[location still — tighter crop or secondary";
    }
    parts.push({
      text: `${tag}${still.ref.fileName ? `: ${still.ref.fileName}` : ""}${dim}]`,
    });
    parts.push({ inlineData: { mimeType: still.mimeType, data: still.data } });
    used.push(still.ref);
  }

  const restKinds: ShootGuideReferenceKind[] = ["mood", "subject", "product"];
  for (const kind of restKinds) {
    const ofKind = refs.filter((r) => r.kind === kind && !used.some((u) => u.id === r.id)).slice(0, MAX_PER_KIND);
    for (const ref of ofKind) {
      const still = await loadStill(ref);
      if (!still) continue;
      parts.push({
        text: `[${kind} still${ref.fileName ? `: ${ref.fileName}` : ""}]`,
      });
      parts.push({ inlineData: { mimeType: still.mimeType, data: still.data } });
      used.push(ref);
    }
  }

  const overlay = pickWidestStill(
    loadedLocation.map((s) => s.ref),
    sizes,
    { singleFrameOnly: true }
  );
  const overlayId =
    overlay && !looksLikeCompositeStill(overlay) ? overlay.id : null;

  return { parts, used, widestLocationId: widest?.id ?? loadedLocation[0]?.ref.id ?? null, overlayLocationId: overlayId };
}
