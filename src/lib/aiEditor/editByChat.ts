/** V1F — Edit by Chat: NL → structured timeline ops → validate → apply. */

import { secondsToFrames } from "@/lib/aiEditor/frames";
import { applyTimelineOps, timelineDurationFrames } from "@/lib/aiEditor/timeline";
import type { MediaAsset, Timeline, TimelineClip, TimelineEditOp } from "@/lib/aiEditor/types";

export type ChatEditProposal = {
  summary: string;
  ops: TimelineEditOp[];
  confidence: number;
  source: "rules" | "gemini";
  warnings: string[];
  /** Special non-op actions */
  action?: "undo";
};

export type ChatEditValidation = {
  ok: boolean;
  errors: string[];
  warnings: string[];
};

function videoClips(timeline: Timeline): TimelineClip[] {
  return timeline.tracks.find((t) => t.kind === "video")?.clips.slice() ?? [];
}

function videoTrackId(timeline: Timeline): string | undefined {
  return timeline.tracks.find((t) => t.kind === "video")?.id;
}

function resolveClip(
  timeline: Timeline,
  hint: string | number | undefined
): TimelineClip | undefined {
  const clips = videoClips(timeline);
  if (!clips.length) return undefined;
  if (hint === undefined || hint === "") return clips[0];
  if (typeof hint === "number") {
    if (hint >= 1 && hint <= clips.length) return clips[hint - 1];
    if (hint >= 0 && hint < clips.length) return clips[hint];
    return undefined;
  }
  const q = hint.toLowerCase().trim();
  if (q === "first" || q === "1st") return clips[0];
  if (q === "last") return clips[clips.length - 1];
  const asNum = Number(q);
  if (Number.isFinite(asNum) && asNum >= 1 && asNum <= clips.length) {
    return clips[asNum - 1];
  }
  return clips.find(
    (c) =>
      c.id.toLowerCase() === q ||
      c.label?.toLowerCase().includes(q) ||
      c.mediaAssetId.toLowerCase() === q
  );
}

export function describeOps(ops: TimelineEditOp[], timeline: Timeline): string[] {
  const clips = videoClips(timeline);
  const label = (id: string) =>
    clips.find((c) => c.id === id)?.label || id.slice(0, 10);
  return ops.map((op) => {
    switch (op.type) {
      case "rippleDelete":
        return `Remove “${label(op.clipId)}” (ripple)`;
      case "trim":
        return `Trim “${label(op.clipId)}”` +
          (op.durationFrames != null
            ? ` to ~${(op.durationFrames / timeline.frameRate).toFixed(1)}s`
            : "");
      case "split":
        return `Split “${label(op.clipId)}” at frame ${op.atTimelineFrame}`;
      case "move":
        return `Move “${label(op.clipId)}” to frame ${op.timelineStartFrame}`;
      case "reorder":
        return `Reorder ${op.clipIds.length} clips`;
      case "insert":
        return `Insert media ${op.mediaAssetId.slice(0, 12)}…`;
      default:
        return "Edit";
    }
  });
}

/** Deterministic offline parser for common edit phrases. */
export function parseEditCommandRules(
  message: string,
  timeline: Timeline,
  _media: MediaAsset[]
): ChatEditProposal | null {
  const raw = message.trim();
  if (!raw) return null;
  const text = raw.toLowerCase().replace(/\s+/g, " ");
  const fps = timeline.frameRate || 24;
  const clips = videoClips(timeline);
  const trackId = videoTrackId(timeline);
  const warnings: string[] = [];

  if (/^(undo|revert|go back|last version)\b/.test(text)) {
    return {
      summary: "Undo last edit (restore previous timeline version)",
      ops: [],
      confidence: 0.95,
      source: "rules",
      warnings,
      action: "undo",
    };
  }

  if (!clips.length) {
    return {
      summary: "No clips on the timeline yet — build a rough cut first.",
      ops: [],
      confidence: 0.9,
      source: "rules",
      warnings: ["empty_timeline"],
    };
  }

  // remove / delete
  let m =
    text.match(
      /^(?:please\s+)?(?:remove|delete|cut out|drop)\s+(?:the\s+)?(first|last|\d+(?:st|nd|rd|th)?|clip\s+\d+)(?:\s+clip)?\b/
    ) || text.match(/^(?:please\s+)?(?:remove|delete)\s+(.+)$/);
  if (m) {
    let hint: string | number = m[1];
    const num = String(hint).match(/(\d+)/);
    if (num && /clip|\d+(?:st|nd|rd|th)/.test(String(hint))) hint = Number(num[1]);
    const clip = resolveClip(timeline, hint);
    if (!clip) {
      return {
        summary: `Couldn’t find clip “${m[1]}”`,
        ops: [],
        confidence: 0.4,
        source: "rules",
        warnings: ["clip_not_found"],
      };
    }
    return {
      summary: `Remove “${clip.label || clip.id}” from the timeline`,
      ops: [{ type: "rippleDelete", clipId: clip.id }],
      confidence: 0.9,
      source: "rules",
      warnings,
    };
  }

  // keep only first / last
  m = text.match(/^(?:keep\s+only|only\s+keep)\s+(?:the\s+)?(first|last)\b/);
  if (m) {
    const keep = resolveClip(timeline, m[1]);
    if (!keep) return null;
    const ops: TimelineEditOp[] = clips
      .filter((c) => c.id !== keep.id)
      .map((c) => ({ type: "rippleDelete" as const, clipId: c.id }));
    return {
      summary: `Keep only the ${m[1]} clip`,
      ops,
      confidence: 0.85,
      source: "rules",
      warnings,
    };
  }

  // trim to N seconds
  m = text.match(
    /^(?:trim|shorten)\s+(?:the\s+)?(first|last|\d+(?:st|nd|rd|th)?|clip\s+\d+)?(?:\s+clip)?\s*(?:to|down to)\s+(\d+(?:\.\d+)?)\s*(s|sec|seconds?)?\b/
  );
  if (m) {
    const clip = resolveClip(timeline, m[1] || "first");
    const seconds = Number(m[2]);
    if (!clip || !Number.isFinite(seconds) || seconds <= 0) return null;
    const durationFrames = Math.max(1, secondsToFrames(seconds, fps));
    return {
      summary: `Trim “${clip.label || clip.id}” to ${seconds}s`,
      ops: [{ type: "trim", clipId: clip.id, durationFrames }],
      confidence: 0.88,
      source: "rules",
      warnings,
    };
  }

  // trim first/last by N seconds (shorten)
  m = text.match(
    /^(?:trim|shorten)\s+(?:the\s+)?(first|last)?(?:\s+clip)?\s+by\s+(\d+(?:\.\d+)?)\s*(s|sec|seconds?)?\b/
  );
  if (m) {
    const clip = resolveClip(timeline, m[1] || "first");
    const seconds = Number(m[2]);
    if (!clip || !Number.isFinite(seconds)) return null;
    const cut = secondsToFrames(seconds, fps);
    const durationFrames = Math.max(1, clip.durationFrames - cut);
    return {
      summary: `Shorten “${clip.label || clip.id}” by ${seconds}s`,
      ops: [{ type: "trim", clipId: clip.id, durationFrames }],
      confidence: 0.85,
      source: "rules",
      warnings,
    };
  }

  // split at N seconds (timeline)
  m = text.match(
    /^(?:split|cut)\s+(?:the\s+)?(?:timeline\s+)?(?:at|@)\s+(\d+(?:\.\d+)?)\s*(s|sec|seconds?)?\b/
  );
  if (m) {
    const atSec = Number(m[1]);
    const at = secondsToFrames(atSec, fps);
    const clip = clips.find(
      (c) => at > c.timelineStartFrame && at < c.timelineStartFrame + c.durationFrames
    );
    if (!clip) {
      return {
        summary: `No clip covers ${atSec}s on the timeline`,
        ops: [],
        confidence: 0.5,
        source: "rules",
        warnings: ["split_miss"],
      };
    }
    return {
      summary: `Split “${clip.label || clip.id}” at ${atSec}s`,
      ops: [{ type: "split", clipId: clip.id, atTimelineFrame: at }],
      confidence: 0.86,
      source: "rules",
      warnings,
    };
  }

  // reverse / swap order
  if (/^(?:reverse|flip)\s+(?:the\s+)?(?:order|clips|timeline)\b/.test(text)) {
    if (!trackId) return null;
    return {
      summary: "Reverse clip order",
      ops: [
        {
          type: "reorder",
          trackId,
          clipIds: [...clips].reverse().map((c) => c.id),
        },
      ],
      confidence: 0.9,
      source: "rules",
      warnings,
    };
  }

  if (/^(?:swap|switch)\s+(?:the\s+)?(?:first\s+two|clips?\s*1\s*(?:and|&)\s*2)\b/.test(text)) {
    if (!trackId || clips.length < 2) {
      return {
        summary: "Need at least two clips to swap",
        ops: [],
        confidence: 0.7,
        source: "rules",
        warnings: ["need_two_clips"],
      };
    }
    const ids = clips.map((c) => c.id);
    [ids[0], ids[1]] = [ids[1], ids[0]];
    return {
      summary: "Swap the first two clips",
      ops: [{ type: "reorder", trackId, clipIds: ids }],
      confidence: 0.9,
      source: "rules",
      warnings,
    };
  }

  return null;
}

export function validateTimelineOps(
  timeline: Timeline,
  ops: TimelineEditOp[]
): ChatEditValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!ops.length) {
    errors.push("No edit operations to apply");
    return { ok: false, errors, warnings };
  }

  let working = timeline;
  for (let i = 0; i < ops.length; i++) {
    const op = ops[i];
    try {
      // structural checks before apply
      if (op.type === "rippleDelete" || op.type === "trim" || op.type === "split" || op.type === "move") {
        const clips = videoClips(working);
        const id = "clipId" in op ? op.clipId : "";
        if (!clips.some((c) => c.id === id)) {
          errors.push(`Op ${i + 1}: clip not found (${id})`);
          continue;
        }
      }
      if (op.type === "insert" && !op.mediaAssetId) {
        errors.push(`Op ${i + 1}: insert needs mediaAssetId`);
        continue;
      }
      if (op.type === "trim" && op.durationFrames != null && op.durationFrames < 1) {
        errors.push(`Op ${i + 1}: trim duration must be ≥ 1 frame`);
        continue;
      }
      working = applyTimelineOps(working, [op]);
    } catch (e) {
      errors.push(`Op ${i + 1}: ${e instanceof Error ? e.message : "invalid"}`);
    }
  }

  if (timelineDurationFrames(working) === 0) {
    warnings.push("Timeline would be empty after this edit");
  }

  return { ok: errors.length === 0, errors, warnings };
}

export function buildTimelineChatContext(
  timeline: Timeline,
  media: MediaAsset[]
): {
  frameRate: number;
  version: number;
  durationFrames: number;
  clips: Array<{
    index: number;
    clipId: string;
    label: string;
    mediaAssetId: string;
    filename?: string;
    timelineStartFrame: number;
    durationFrames: number;
    durationSeconds: number;
  }>;
} {
  const byId = new Map(media.map((m) => [m.id, m]));
  const clips = videoClips(timeline);
  return {
    frameRate: timeline.frameRate,
    version: timeline.version,
    durationFrames: timelineDurationFrames(timeline),
    clips: clips.map((c, index) => ({
      index: index + 1,
      clipId: c.id,
      label: c.label || byId.get(c.mediaAssetId)?.filename || c.id,
      mediaAssetId: c.mediaAssetId,
      filename: byId.get(c.mediaAssetId)?.filename,
      timelineStartFrame: c.timelineStartFrame,
      durationFrames: c.durationFrames,
      durationSeconds: Number((c.durationFrames / timeline.frameRate).toFixed(3)),
    })),
  };
}

export function parseGeminiOpsPayload(raw: unknown): ChatEditProposal | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (obj.action === "undo") {
    return {
      summary: String(obj.summary || "Undo last edit"),
      ops: [],
      confidence: 0.8,
      source: "gemini",
      warnings: [],
      action: "undo",
    };
  }
  const ops = Array.isArray(obj.ops) ? (obj.ops as TimelineEditOp[]) : [];
  if (!ops.length && !obj.summary) return null;
  return {
    summary: String(obj.summary || "Apply AI edit"),
    ops,
    confidence: typeof obj.confidence === "number" ? obj.confidence : 0.7,
    source: "gemini",
    warnings: Array.isArray(obj.warnings) ? obj.warnings.map(String) : [],
  };
}

export const EDIT_BY_CHAT_SYSTEM = `You are ShootSpine Edit-by-Chat. Convert the user's edit request into structured timeline operations.
Reply with JSON only:
{"summary":"...", "ops":[...], "confidence":0-1, "warnings":[], "action"?: "undo"}

Allowed op types (exact shapes):
- {"type":"rippleDelete","clipId":"..."}
- {"type":"trim","clipId":"...","durationFrames":N,"sourceInFrame"?:N}
- {"type":"split","clipId":"...","atTimelineFrame":N}
- {"type":"move","clipId":"...","timelineStartFrame":N}
- {"type":"reorder","trackId":"...","clipIds":["..."]}
- {"type":"insert","mediaAssetId":"...","durationFrames":N,"trackId"?: "...","timelineStartFrame"?:N,"label"?: "..."}

Rules:
- Use ONLY clipId / trackId / mediaAssetId values from the provided context.
- Prefer rippleDelete over leaving gaps.
- durationFrames and atTimelineFrame must be integers.
- Never invent media paths or ask to upload footage.
- When Edit notes are provided, treat them as the creative brief (client/on-set/look direction). Map notes onto concrete ops on the current timeline when the user asks to use notes or when the request is open-ended.
- Context may be scoped to one reel/act of a longer feature — only edit clips listed in the context.
- Notes about color grade, music, or Resolve finishing that cannot become timeline ops should be mentioned in summary/warnings — do not invent fake ops for them.
- If the request is undo/revert, return {"action":"undo","summary":"...","ops":[]}.
- If unclear, return ops:[] with a short summary explaining what you need.`;
