/** Deterministic offline matching of clips → planned shots (V1D). */

import type { ClipAnalysisBundle } from "@/lib/aiEditor/analysis";
import { isRoughCutVideoAsset } from "@/lib/aiEditor/mediaFormats";
import type {
  CoverageReport,
  CoverageShotRow,
  MatchCandidate,
  MatchDialogueLine,
  MediaAsset,
  PreferredTakeOverride,
  ProductionContext,
  ProductionContextShot,
} from "@/lib/aiEditor/types";

const STOP = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "to",
  "of",
  "in",
  "on",
  "at",
  "for",
  "with",
  "from",
  "is",
  "are",
  "be",
  "this",
  "that",
  "it",
  "as",
  "by",
  "shot",
  "take",
  "scene",
  "cam",
  "camera",
]);

export function tokenize(text: string | undefined | null): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1 && !STOP.has(t));
}

export function jaccard(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const as = new Set(a);
  const bs = new Set(b);
  let inter = 0;
  for (const t of as) if (bs.has(t)) inter += 1;
  const union = as.size + bs.size - inter;
  return union ? inter / union : 0;
}

/** Normalize board framing labels to analysis shotSize buckets. */
export function normalizeShotSize(raw: string | undefined | null): string | undefined {
  if (!raw) return undefined;
  const s = raw.toLowerCase().replace(/[_\s-]+/g, "");
  if (/^(ecu|extremeclose|extremecloseup|xtremeclose)/.test(s) || s.includes("extremeclose")) {
    return "close_up";
  }
  if (/^(cu|closeup|close|bc|bigclose)/.test(s) || s.includes("closeup")) return "close_up";
  if (/^(mcu|mediumclose)/.test(s)) return "medium";
  if (/^(ms|medium|med)/.test(s)) return "medium";
  if (/^(ws|wide|wideshot|ls|long|establishing|ews)/.test(s) || s.includes("wide")) {
    return "wide";
  }
  if (s === "wide" || s === "medium" || s === "close_up" || s === "unknown") return s;
  return undefined;
}

function dominantShotSize(bundle: ClipAnalysisBundle | undefined): string | undefined {
  if (!bundle?.shots?.length) return undefined;
  const counts = new Map<string, number>();
  for (const s of bundle.shots) {
    const size = s.shotSize && s.shotSize !== "unknown" ? s.shotSize : undefined;
    if (!size) continue;
    const dur = Math.max(0.1, (s.endSeconds || 0) - (s.startSeconds || 0));
    counts.set(size, (counts.get(size) || 0) + dur);
  }
  let best: string | undefined;
  let bestDur = 0;
  for (const [k, v] of counts) {
    if (v > bestDur) {
      best = k;
      bestDur = v;
    }
  }
  return best;
}

function sceneNumberTokens(scene: string | undefined): string[] {
  if (!scene) return [];
  const out = new Set<string>();
  const m = scene.match(/\b(\d{1,3}[a-z]?)\b/gi);
  if (m) for (const x of m) out.add(x.toLowerCase());
  const sc = scene.match(/\bsc(?:ene)?\s*(\d{1,3}[a-z]?)\b/gi);
  if (sc) {
    for (const x of sc) {
      const n = x.replace(/[^\d]/g, "");
      if (n) out.add(n.toLowerCase());
    }
  }
  return [...out];
}

function clipTextBlob(media: MediaAsset): string {
  return [media.filename, media.originalFilename, media.clipName, media.reelName, media.relativeProjectPath]
    .filter(Boolean)
    .join(" ");
}

/**
 * Score filename/path hints for content-plan / scout shot numbers.
 * Prefers explicit `shot_01` / slate-like segments over bare digits.
 */
/**
 * Mild boost when filename hints match a take checked off in Shoot Mode.
 * Kept small so it never dominates shot-number / name scoring.
 */
export function scoreOnSetTakeInClipText(
  clipText: string,
  onSetTakes?: number[]
): { score: number; reason?: string } {
  if (!onSetTakes?.length) return { score: 0 };
  const lower = clipText.toLowerCase();
  for (const raw of onSetTakes) {
    const n = Math.trunc(raw);
    if (n < 1 || n > 99) continue;
    const padded = String(n).padStart(2, "0");
    if (
      lower.includes(`_t${padded}`) ||
      lower.includes(`-t${padded}`) ||
      lower.includes(`_tk${padded}`) ||
      lower.includes(`-tk${padded}`)
    ) {
      return { score: 0.14, reason: `On-set take ${n} in filename` };
    }
    const patterns = [
      new RegExp(`(?:^|[^a-z0-9])take[_\\s-]*0*${n}(?:[^a-z0-9]|$)`, "i"),
      new RegExp(`(?:^|[^a-z0-9])tk[_]?0*${n}(?:[^a-z0-9]|$)`, "i"),
      new RegExp(`(?:^|[^a-z0-9])t[_]?0*${n}(?:[^a-z0-9]|$)`, "i"),
    ];
    for (const re of patterns) {
      if (re.test(lower)) {
        return { score: 0.14, reason: `On-set take ${n} in filename` };
      }
    }
  }
  return { score: 0 };
}

export function scoreShotNumberInClipText(
  clipText: string,
  shotNumber?: number,
  contentPlanShotId?: string
): { score: number; reason?: string } {
  const lower = clipText.toLowerCase();
  const id = contentPlanShotId?.trim().toLowerCase();
  if (id && lower.includes(id)) {
    return { score: 0.36, reason: `Content plan id ${contentPlanShotId}` };
  }
  if (shotNumber == null || !Number.isFinite(shotNumber)) return { score: 0 };
  const n = Math.trunc(shotNumber);
  if (n < 1 || n > 999) return { score: 0 };
  const padded = String(n).padStart(2, "0");

  if (
    lower.includes(`_${padded}_`) ||
    lower.includes(`-${padded}-`) ||
    lower.includes(`/${padded}/`) ||
    lower.includes(`_${padded}.`) ||
    lower.includes(`-${padded}.`)
  ) {
    return { score: 0.3, reason: `Shot ${padded} in path` };
  }

  const patterns: { re: RegExp; score: number; reason: string }[] = [
    {
      re: new RegExp(`(?:^|[^a-z0-9])shot[_\\s-]*0*${n}(?:[^a-z0-9]|$)`, "i"),
      score: 0.32,
      reason: `Shot ${n} in filename`,
    },
    {
      re: new RegExp(`(?:^|[^a-z0-9])s[_]?0*${n}(?:[^a-z0-9]|$)`, "i"),
      score: 0.26,
      reason: `S${padded} in filename`,
    },
  ];
  for (const p of patterns) {
    if (p.re.test(lower)) return { score: p.score, reason: p.reason };
  }
  return { score: 0 };
}

function dialogueForShot(
  shot: ProductionContextShot,
  dialogueByScene: Map<string, MatchDialogueLine[]>
): MatchDialogueLine[] {
  const keys = [
    shot.scene,
    ...sceneNumberTokens(shot.scene),
    ...(shot.scene ? tokenize(shot.scene) : []),
  ].filter(Boolean) as string[];
  for (const k of keys) {
    const hit = dialogueByScene.get(k.toLowerCase());
    if (hit?.length) return hit;
  }
  // fuzzy: any scene key contained in shot.scene
  if (shot.scene) {
    const lower = shot.scene.toLowerCase();
    for (const [k, lines] of dialogueByScene) {
      if (lower.includes(k) || k.includes(lower)) return lines;
    }
  }
  return [];
}

export function scoreClipAgainstShot(input: {
  media: MediaAsset;
  bundle?: ClipAnalysisBundle;
  shot: ProductionContextShot;
  dialogueLines?: MatchDialogueLine[];
}): { score: number; reasons: string[] } {
  const { media, bundle, shot, dialogueLines = [] } = input;
  const reasons: string[] = [];
  let score = 0;

  const clipBlob = clipTextBlob(media);
  const clipTokens = tokenize(clipBlob);
  const shotTokens = tokenize(
    [
      shot.shotName,
      shot.scene,
      shot.shotType,
      shot.description,
      shot.subjectAction,
      shot.editNote,
      shot.camera,
      shot.contentPlanShotId,
      shot.scoutShotNumber != null ? `shot ${shot.scoutShotNumber}` : "",
    ]
      .filter(Boolean)
      .join(" ")
  );
  const tokenScore = jaccard(clipTokens, shotTokens);
  if (tokenScore > 0) {
    const w = Math.min(0.4, tokenScore * 0.5);
    score += w;
    reasons.push(`Name/path overlap ${(tokenScore * 100).toFixed(0)}%`);
  }

  const nameTokens = tokenize(shot.shotName);
  if (nameTokens.length) {
    const nameHits = nameTokens.filter((t) => clipTokens.includes(t));
    if (nameHits.length) {
      const w = Math.min(0.25, nameHits.length * 0.1);
      score += w;
      reasons.push(`Shot name: ${nameHits.join(", ")}`);
    }
  }

  const numberHit = scoreShotNumberInClipText(
    clipBlob,
    shot.scoutShotNumber,
    shot.contentPlanShotId
  );
  if (numberHit.score > 0) {
    score += numberHit.score;
    if (numberHit.reason) reasons.push(numberHit.reason);
  }

  const takeHit = scoreOnSetTakeInClipText(clipBlob, shot.onSetTakes);
  if (takeHit.score > 0) {
    score += takeHit.score;
    if (takeHit.reason) reasons.push(takeHit.reason);
  }

  const sceneToks = sceneNumberTokens(shot.scene);
  const clipLower = clipBlob.toLowerCase();
  for (const sn of sceneToks) {
    // Scene "1" is common on content-plan boards — only boost when filename looks like a scene tag.
    const isGenericOne = sn === "1";
    const sceneTagged =
      clipLower.includes(`sc${sn}`) ||
      clipLower.includes(`scene${sn}`) ||
      clipLower.includes(`scene_${sn}`) ||
      clipLower.includes(`sc_${sn}`);
    if ((!isGenericOne && clipLower.includes(sn)) || sceneTagged) {
      score += isGenericOne ? 0.1 : 0.2;
      reasons.push(`Scene ${sn} in filename`);
      break;
    }
  }

  const cam = (media.cameraAssignment || "").replace(/_/g, " ").toLowerCase();
  const shotCam = (shot.camera || "").toLowerCase();
  if (cam && shotCam && (cam.includes(shotCam) || shotCam.includes(cam.replace(/camera\s*/, "")))) {
    score += 0.12;
    reasons.push("Camera label match");
  } else if (cam && clipLower.includes(cam.replace(/\s+/g, ""))) {
    // mild path camera hint already in tokens
  }

  const wantedSize = normalizeShotSize(shot.shotType);
  const gotSize = dominantShotSize(bundle);
  if (wantedSize && gotSize && wantedSize === gotSize) {
    score += 0.12;
    reasons.push(`Shot size ${gotSize}`);
  }

  const transcriptText = (bundle?.transcript ?? []).map((t) => t.text).join(" ");
  const transcriptTokens = tokenize(transcriptText);
  if (dialogueLines.length && transcriptTokens.length) {
    const dialTokens = tokenize(dialogueLines.map((d) => `${d.character} ${d.line}`).join(" "));
    const dialScore = jaccard(transcriptTokens, dialTokens);
    if (dialScore > 0.05) {
      const w = Math.min(0.3, dialScore * 0.55);
      score += w;
      reasons.push(`Dialogue overlap ${(dialScore * 100).toFixed(0)}%`);
    }
  } else if (transcriptTokens.length && shot.description) {
    const descScore = jaccard(transcriptTokens, tokenize(shot.description));
    if (descScore > 0.08) {
      score += Math.min(0.12, descScore * 0.3);
      reasons.push("Transcript vs description");
    }
  }

  if (bundle?.technical?.issues?.length) {
    score -= Math.min(0.08, bundle.technical.issues.length * 0.02);
  }

  return { score: Math.max(0, Math.min(1, Number(score.toFixed(3)))), reasons };
}

function pickPreferred(
  candidates: MatchCandidate[],
  overrideMediaId?: string
): { preferredMediaAssetId?: string; preferredScore?: number; preferredManual?: boolean } {
  if (overrideMediaId) {
    const hit = candidates.find((c) => c.mediaAssetId === overrideMediaId);
    return {
      preferredMediaAssetId: overrideMediaId,
      preferredScore: hit?.score,
      preferredManual: true,
    };
  }
  const ranked = [...candidates].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (b.durationSeconds || 0) - (a.durationSeconds || 0);
  });
  const top = ranked[0];
  if (!top || top.score < 0.12) return {};
  return { preferredMediaAssetId: top.mediaAssetId, preferredScore: top.score };
}

export function buildCoverageReport(input: {
  projectId: string;
  context: ProductionContext;
  media: MediaAsset[];
  analysis: ClipAnalysisBundle[];
  dialogueByScene?: Record<string, MatchDialogueLine[]>;
  overrides?: PreferredTakeOverride[];
  minScore?: number;
}): CoverageReport {
  const {
    projectId,
    context,
    media,
    analysis,
    dialogueByScene = {},
    overrides = [],
    minScore = 0.12,
  } = input;
  const now = new Date().toISOString();
  const analysisById = new Map(analysis.map((a) => [a.mediaAssetId, a]));
  const overrideByShot = new Map(overrides.map((o) => [o.plannedShotId, o.mediaAssetId]));
  const dialMap = new Map(
    Object.entries(dialogueByScene).map(([k, v]) => [k.toLowerCase(), v])
  );

  const videoMedia = media.filter((m) => isRoughCutVideoAsset(m));

  const shots: CoverageShotRow[] = (context.shots ?? []).map((shot) => {
    const dialogueLines = dialogueForShot(shot, dialMap);
    const candidates: MatchCandidate[] = [];
    for (const m of videoMedia) {
      const { score, reasons } = scoreClipAgainstShot({
        media: m,
        bundle: analysisById.get(m.id),
        shot,
        dialogueLines,
      });
      if (score >= minScore) {
        candidates.push({
          mediaAssetId: m.id,
          filename: m.filename,
          score,
          reasons,
          durationSeconds: m.durationSeconds ?? analysisById.get(m.id)?.technical?.durationSeconds,
          cameraAssignment: m.cameraAssignment,
        });
      }
    }
    candidates.sort((a, b) => b.score - a.score);
    const pref = pickPreferred(candidates, overrideByShot.get(shot.id));
    let status: CoverageShotRow["status"] = "missing";
    if (pref.preferredMediaAssetId) {
      status = candidates.length > 1 ? "multi_take" : "covered";
    } else if (candidates.length) {
      status = "partial";
    }
    return {
      plannedShotId: shot.id,
      dayId: shot.dayId,
      scene: shot.scene,
      shotName: shot.shotName,
      shotType: shot.shotType,
      status,
      candidates: candidates.slice(0, 8),
      ...(shot.onSetTakes?.length ? { onSetTakes: shot.onSetTakes } : {}),
      ...(shot.onSetNotes ? { onSetNotes: shot.onSetNotes } : {}),
      ...pref,
    };
  });

  const covered = shots.filter((s) => s.status === "covered" || s.status === "multi_take").length;
  const partial = shots.filter((s) => s.status === "partial").length;
  const missing = shots.filter((s) => s.status === "missing").length;
  const unmatchedMediaIds = videoMedia
    .filter((m) => !shots.some((s) => s.candidates.some((c) => c.mediaAssetId === m.id)))
    .map((m) => m.id);

  return {
    projectId,
    updatedAt: now,
    plannedShotCount: shots.length,
    coveredCount: covered,
    partialCount: partial,
    missingCount: missing,
    unmatchedMediaIds,
    shots,
    overrides,
    notes: context.aiEditorOnly
      ? ["Footage-only workspace — coverage uses any linked plan shots if present."]
      : shots.length
        ? undefined
        : ["No coverage shots on the production board yet — add shots in Prep to match against."],
  };
}
