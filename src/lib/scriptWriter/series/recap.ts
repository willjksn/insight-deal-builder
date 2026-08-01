import type { ScriptDocument } from "@/lib/scriptWriter/types";

/** Build a durable series recap + ending beat after a script is written. */
export function buildSeriesRecapFields(script: ScriptDocument | null | undefined): {
  seriesRecap?: string;
  seriesEndingBeat?: string;
} {
  if (!script) return {};
  const logline = (script.logline || script.productionPack?.premise || "").trim();
  const scenes = script.scenes ?? [];
  const last = scenes[scenes.length - 1];
  const endingBeat = last
    ? [
        last.heading?.trim(),
        (last.action || "").trim().replace(/\s+/g, " ").slice(0, 280),
      ]
        .filter(Boolean)
        .join(" — ")
    : undefined;

  const recapParts = [
    logline,
    endingBeat && scenes.length > 1
      ? `Closes on: ${endingBeat}`
      : endingBeat
        ? endingBeat
        : "",
  ].filter(Boolean);

  const seriesRecap = recapParts.join(" ").trim().slice(0, 700) || undefined;
  return {
    seriesRecap,
    seriesEndingBeat: endingBeat?.slice(0, 400),
  };
}
