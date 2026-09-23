import type { ShootGuideReference } from "./types";

export type StillSize = { width: number; height: number };

export function looksLikeCompositeStill(ref: { fileName?: string }): boolean {
  return /storyboard|moodboard|grid|collage|montage|animatic|contact.?sheet/i.test(
    ref.fileName || ""
  );
}

/** Prefer location stills; pick the largest pixel width (establishing / widest frame). */
export function pickWidestStill<T extends { id: string; kind: string; fileName?: string }>(
  refs: T[],
  sizes: Record<string, StillSize>,
  options?: { singleFrameOnly?: boolean }
): T | null {
  const location = refs.filter((r) => r.kind === "location");
  const mood = refs.filter((r) => r.kind === "mood");
  let pool = [...location, ...mood];
  if (options?.singleFrameOnly) {
    const singles = pool.filter((r) => r.kind === "location" && !looksLikeCompositeStill(r));
    pool = singles.length ? singles : pool.filter((r) => !looksLikeCompositeStill(r));
  }
  if (!pool.length) return refs[0] ?? null;

  return [...pool].sort((a, b) => {
    const sa = sizes[a.id];
    const sb = sizes[b.id];
    const aw = sa?.width ?? 0;
    const bw = sb?.width ?? 0;
    if (bw !== aw) return bw - aw;
    const aa = aw * (sa?.height ?? 0);
    const ba = bw * (sb?.height ?? 0);
    return ba - aa;
  })[0];
}

export function locationStills(refs: ShootGuideReference[]): ShootGuideReference[] {
  return (refs ?? []).filter((r) => r.kind === "location");
}
