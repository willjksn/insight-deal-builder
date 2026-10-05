import type { ProductionDayShot, ProductionShotMedia } from "@/lib/production/types";

export function capturedTakes(shot: Pick<ProductionDayShot, "media">): ProductionShotMedia[] {
  return (shot.media ?? []).filter((item) => item.role === "captured_footage");
}

export function plannedMedia(shot: Pick<ProductionDayShot, "media" | "referenceImageUrl">): ProductionShotMedia[] {
  const fromMedia = (shot.media ?? []).filter((item) => item.role === "planned_reference" || item.role === "ai_previs");
  if (fromMedia.length || !shot.referenceImageUrl) return fromMedia;
  return [{ id: "legacy-reference", role: "planned_reference", url: shot.referenceImageUrl, label: "Planned" }];
}

function replaceMedia(shot: ProductionDayShot, media: ProductionShotMedia[]): ProductionDayShot {
  return { ...shot, media };
}

export function appendCapturedTake(shot: ProductionDayShot, take: ProductionShotMedia): ProductionDayShot {
  return replaceMedia(shot, [...(shot.media ?? []), { ...take, role: "captured_footage" }]);
}

export function updateCapturedTake(
  shot: ProductionDayShot,
  takeId: string,
  patch: Partial<ProductionShotMedia>
): ProductionDayShot {
  return replaceMedia(
    shot,
    (shot.media ?? []).map((item) => (item.id === takeId && item.role === "captured_footage" ? { ...item, ...patch, role: "captured_footage" } : item))
  );
}

/** Unlink a take from the shot. The stored file is left in place. */
export function unlinkCapturedTake(shot: ProductionDayShot, takeId: string): ProductionDayShot {
  return replaceMedia(
    shot,
    (shot.media ?? []).filter((item) => !(item.id === takeId && item.role === "captured_footage"))
  );
}

/** One preferred take. Other captured clips stay attached. */
export function selectCapturedTake(shot: ProductionDayShot, takeId: string): ProductionDayShot {
  return replaceMedia(
    shot,
    (shot.media ?? []).map((item) =>
      item.role === "captured_footage" ? { ...item, preferred: item.id === takeId } : item
    )
  );
}
