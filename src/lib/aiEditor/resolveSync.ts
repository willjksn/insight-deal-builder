/**
 * V5 — reverse-sync from Resolve (read-only snapshot of the open timeline).
 * Does not overwrite the ShootSpine rough cut.
 */

import type { ResolveSyncSnapshot } from "@/lib/aiEditor/types";

export type { ResolveSyncSnapshot };

export type ResolveSyncCompare = {
  title: string;
  detail: string;
  /** rough | longer | shorter | similar | unknown */
  lengthHint: "rough" | "longer" | "shorter" | "similar" | "unknown";
};

export function buildResolveSyncRecord(
  snapshot: ResolveSyncSnapshot
): ResolveSyncSnapshot {
  return {
    ...snapshot,
    syncedAt: new Date().toISOString(),
  };
}

export function summarizeResolveSync(sync?: ResolveSyncSnapshot | null): string | null {
  if (!sync?.timelineName && sync?.videoClipCount == null) return null;
  const name = sync.timelineName || "Untitled";
  const clips =
    typeof sync.videoClipCount === "number" ? `${sync.videoClipCount} clips` : null;
  const secs =
    typeof sync.durationSeconds === "number"
      ? `~${Math.round(sync.durationSeconds)}s`
      : null;
  return [name, clips, secs].filter(Boolean).join(" · ");
}

/** Plain-language compare of Resolve timeline vs ShootSpine rough cut. */
export function compareResolveToRoughCut(input: {
  sync: ResolveSyncSnapshot;
  roughCutDurationFrames?: number;
  roughCutClipCount?: number;
  roughCutFrameRate?: number;
}): ResolveSyncCompare {
  const { sync } = input;
  const name = sync.timelineName || "the open timeline";
  const resolveClips = sync.videoClipCount;
  const resolveFrames = sync.durationFrames;

  const parts: string[] = [];
  if (typeof resolveClips === "number") {
    parts.push(
      `${resolveClips} video clip${resolveClips === 1 ? "" : "s"} in Resolve`
    );
  }
  if (typeof input.roughCutClipCount === "number") {
    parts.push(`${input.roughCutClipCount} in your ShootSpine rough cut`);
  }

  let lengthHint: ResolveSyncCompare["lengthHint"] = "unknown";
  if (
    typeof resolveFrames === "number" &&
    typeof input.roughCutDurationFrames === "number" &&
    input.roughCutDurationFrames > 0
  ) {
    const ratio = resolveFrames / input.roughCutDurationFrames;
    if (ratio > 1.12) {
      lengthHint = "longer";
      parts.push("Resolve cut is longer — you likely kept more or stretched the edit");
    } else if (ratio < 0.88) {
      lengthHint = "shorter";
      parts.push("Resolve cut is shorter — you trimmed further in finishing");
    } else {
      lengthHint = "similar";
      parts.push("Length is close to your rough cut");
    }
  } else if (typeof resolveFrames === "number") {
    lengthHint = "rough";
  }

  if (sync.edlExported) {
    parts.push("A timeline snapshot was saved in your project folder");
  }

  return {
    title: `Resolve: “${name}”`,
    detail: parts.join(". ") + (parts.length ? "." : "Snapshot saved."),
    lengthHint,
  };
}
