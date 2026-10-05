import type { ProductionIngestClip, TakeConfidence, TakeGroup, TakeGroupMember } from "@/lib/production/ingestTypes";

export type WaveformPair = {
  a: string;
  b: string;
  /** 0–1 normalized correlation. */
  score: number;
  /** Seconds to shift b so it lines up with a. Positive means b starts later. */
  offsetSeconds: number;
};

const NTSC: { test: (rate: number) => boolean; fps: number; nominal: number; dropFrames: number }[] = [
  { test: (r) => Math.abs(r - 23.976) < 0.03 || Math.abs(r - 23.98) < 0.02, fps: 24000 / 1001, nominal: 24, dropFrames: 0 },
  { test: (r) => Math.abs(r - 24) < 0.01, fps: 24, nominal: 24, dropFrames: 0 },
  { test: (r) => Math.abs(r - 25) < 0.01, fps: 25, nominal: 25, dropFrames: 0 },
  { test: (r) => Math.abs(r - 29.97) < 0.03, fps: 30000 / 1001, nominal: 30, dropFrames: 2 },
  { test: (r) => Math.abs(r - 30) < 0.01, fps: 30, nominal: 30, dropFrames: 0 },
  { test: (r) => Math.abs(r - 59.94) < 0.03, fps: 60000 / 1001, nominal: 60, dropFrames: 4 },
  { test: (r) => Math.abs(r - 60) < 0.01, fps: 60, nominal: 60, dropFrames: 0 },
];

export function parseTimecodeSeconds(timecode: string | undefined, frameRate: number | undefined): number | null {
  if (!timecode || frameRate == null) return null;
  const match = timecode.trim().match(/^(\d{1,2}):(\d{2}):(\d{2})([:;])(\d{1,3})$/);
  if (!match) return null;
  const spec = NTSC.find((item) => item.test(frameRate));
  if (!spec) return null;
  const drop = match[4] === ";";
  if (drop && spec.dropFrames === 0) return null;
  const hh = Number(match[1]);
  const mm = Number(match[2]);
  const ss = Number(match[3]);
  const ff = Number(match[5]);
  if (mm > 59 || ss > 59 || ff >= spec.nominal) return null;
  let frames = (hh * 3600 + mm * 60 + ss) * spec.nominal + ff;
  if (drop) {
    const minutes = hh * 60 + mm;
    frames -= spec.dropFrames * (minutes - Math.floor(minutes / 10));
  }
  if (frames < 0) return null;
  return frames / spec.fps;
}

function band(score: number): TakeConfidence {
  if (score >= 0.75) return "high";
  if (score >= 0.4) return "medium";
  return "low";
}

function audioOnly(clip: ProductionIngestClip): boolean {
  return /\.(wav|bwf|aiff|aif|mp3|m4a|aac)$/i.test(clip.filename) || (Boolean(clip.audioTracks) && !clip.resolution);
}

function pairKey(a: string, b: string) {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

type Edge = { a: string; b: string; score: number; reasons: string[]; offset: number };

function timecodeEdge(a: ProductionIngestClip, b: ProductionIngestClip): { score: number; reason: string; offset: number } | null {
  const startA = parseTimecodeSeconds(a.timecodeStart, a.frameRate);
  const startB = parseTimecodeSeconds(b.timecodeStart, b.frameRate);
  if (startA == null || startB == null || !a.durationSeconds || !b.durationSeconds) return null;
  if (a.frameRate && b.frameRate && Math.abs(a.frameRate - b.frameRate) > 0.05) return null;
  let delta = startB - startA;
  if (Math.abs(delta) > 12 * 3600) delta += delta > 0 ? -86400 : 86400;
  const endA = startA + a.durationSeconds;
  const endB = startA + delta + b.durationSeconds;
  const overlap = Math.min(endA, endB) - Math.max(startA, startA + delta);
  const shorter = Math.min(a.durationSeconds, b.durationSeconds);
  if (overlap <= 0 || shorter <= 0) return null;
  const ratio = overlap / shorter;
  if (ratio < 0.5) return null;
  return { score: ratio > 0.85 ? 0.9 : 0.5, reason: "Matching timecode range", offset: delta };
}

function timeDeltaSeconds(a: ProductionIngestClip, b: ProductionIngestClip): number | null {
  if (!a.recordedAt || !b.recordedAt) return null;
  const da = Date.parse(a.recordedAt);
  const db = Date.parse(b.recordedAt);
  if (!Number.isFinite(da) || !Number.isFinite(db)) return null;
  return Math.abs(db - da) / 1000;
}

function durationClose(a: ProductionIngestClip, b: ProductionIngestClip): boolean {
  if (!a.durationSeconds || !b.durationSeconds) return false;
  const diff = Math.abs(a.durationSeconds - b.durationSeconds);
  return diff <= 2 || diff / Math.max(a.durationSeconds, b.durationSeconds) <= 0.15;
}

function buildEdge(a: ProductionIngestClip, b: ProductionIngestClip, wave?: WaveformPair): Edge | null {
  let score = 0;
  const reasons: string[] = [];
  let offset = 0;
  const tc = timecodeEdge(a, b);
  if (tc) {
    score += tc.score;
    reasons.push(tc.reason);
    offset = tc.offset;
  }
  if (wave && wave.score >= 0.72) {
    score += 0.8;
    reasons.push("Strong audio waveform match");
    if (!tc) offset = wave.a === a.id ? wave.offsetSeconds : -wave.offsetSeconds;
  } else if (wave && wave.score >= 0.55) {
    score += 0.4;
    reasons.push("Possible audio match");
    if (!tc) offset = wave.a === a.id ? wave.offsetSeconds : -wave.offsetSeconds;
  }
  const delta = timeDeltaSeconds(a, b);
  const cameraTime = a.timeSource === "camera" && b.timeSource === "camera";
  if (delta != null && delta <= 8 && cameraTime) {
    score += 0.28;
    reasons.push(`Started ${delta.toFixed(1)} seconds apart`);
  } else if (delta != null && delta <= 20) {
    score += 0.08;
    reasons.push(cameraTime ? "Recording times are close" : "Filesystem times are close");
  }
  if (durationClose(a, b)) {
    score += 0.12;
    reasons.push("Similar duration");
  }
  if (a.cameraSlot !== b.cameraSlot) {
    score += 0.08;
    reasons.push("Different cameras");
  }
  if (score < 0.22) return null;
  return { a: a.id, b: b.id, score: Math.min(score, 1), reasons, offset };
}

function confidenceOf(edges: Edge[]): { band: TakeConfidence; score: number; reasons: string[] } {
  const score = edges.reduce((sum, edge) => sum + edge.score, 0) / edges.length;
  const reasons = [...new Set(edges.flatMap((edge) => edge.reasons))];
  return { band: band(score), score, reasons };
}

export function suggestTakeGroups(input: {
  projectId: string;
  clips: ProductionIngestClip[];
  waveform?: WaveformPair[];
  existing?: TakeGroup[];
  now?: string;
}): TakeGroup[] {
  const now = input.now || new Date().toISOString();
  const existing = input.existing ?? [];
  const confirmed = existing.filter((group) => group.state === "confirmed" || group.origin === "manual");
  const locked = new Set(confirmed.flatMap((group) => group.members.map((member) => member.clipId)));
  const waves = new Map((input.waveform ?? []).map((pair) => [pairKey(pair.a, pair.b), pair]));
  const open = input.clips.filter((clip) => !locked.has(clip.id));
  const edges: Edge[] = [];
  for (let i = 0; i < open.length; i++) {
    for (let j = i + 1; j < open.length; j++) {
      const edge = buildEdge(open[i], open[j], waves.get(pairKey(open[i].id, open[j].id)));
      if (edge) edges.push(edge);
    }
  }
  const parent = new Map(open.map((clip) => [clip.id, clip.id]));
  const find = (id: string): string => {
    const next = parent.get(id) || id;
    if (next === id) return id;
    const root = find(next);
    parent.set(id, root);
    return root;
  };
  for (const edge of edges) {
    parent.set(find(edge.a), find(edge.b));
  }
  const clusters = new Map<string, string[]>();
  for (const clip of open) {
    const root = find(clip.id);
    const list = clusters.get(root) ?? [];
    list.push(clip.id);
    clusters.set(root, list);
  }
  const fresh: TakeGroup[] = [];
  for (const ids of clusters.values()) {
    if (ids.length < 2) continue;
    const groupEdges = edges.filter((edge) => ids.includes(edge.a) && ids.includes(edge.b));
    if (!groupEdges.length) continue;
    const summary = confidenceOf(groupEdges);
    const members = offsetsFor(ids, groupEdges);
    fresh.push({
      id: `tg_${ids.slice().sort().join("_").slice(0, 48)}`,
      projectId: input.projectId,
      members,
      confidence: summary.band,
      confidenceScore: Math.round(summary.score * 100) / 100,
      matchReasons: summary.reasons,
      state: "suggested",
      origin: "auto",
      startTime: earliest(input.clips, ids),
      createdAt: now,
      updatedAt: now,
    });
  }
  const pending = confirmed.map((group) => {
    const extras = open.filter((clip) => group.members.some((member) => edges.some((edge) => edge.score >= 0.75 && ((edge.a === clip.id && edge.b === member.clipId) || (edge.b === clip.id && edge.a === member.clipId)))));
    // edges only exist between open clips, so pending needs a second pass against locked clips
    return group;
  });
  const pendingGroups = confirmed.map((group) => {
    const additions: string[] = [];
    for (const clip of open) {
      for (const member of group.members) {
        const other = input.clips.find((item) => item.id === member.clipId);
        if (!other) continue;
        const edge = buildEdge(clip, other, waves.get(pairKey(clip.id, other.id)));
        if (edge && edge.score >= 0.75) additions.push(clip.id);
      }
    }
    const unique = [...new Set(additions)];
    return unique.length ? { ...group, pendingClipIds: unique, updatedAt: now } : { ...group, pendingClipIds: [] };
  });
  return [...pendingGroups, ...fresh.filter((group) => !group.members.some((member) => pending.some(() => false)))];
}

function offsetsFor(ids: string[], edges: Edge[]): TakeGroupMember[] {
  const ref = ids[0];
  const offset = new Map<string, number>([[ref, 0]]);
  const queue = [ref];
  while (queue.length) {
    const current = queue.shift() as string;
    for (const edge of edges) {
      const other = edge.a === current ? edge.b : edge.b === current ? edge.a : "";
      if (!other || offset.has(other)) continue;
      const sign = edge.a === current ? edge.offset : -edge.offset;
      offset.set(other, (offset.get(current) || 0) + sign);
      queue.push(other);
    }
  }
  return ids.map((clipId) => ({ clipId, offsetSeconds: round3(offset.get(clipId) ?? 0) }));
}

function earliest(clips: ProductionIngestClip[], ids: string[]): string | undefined {
  const times = clips.filter((clip) => ids.includes(clip.id) && clip.recordedAt).map((clip) => clip.recordedAt as string).sort();
  return times[0];
}

function round3(value: number) {
  return Math.round(value * 1000) / 1000;
}

export function createManualGroup(projectId: string, clipIds: string[], now = new Date().toISOString()): TakeGroup {
  return {
    id: `tg_manual_${clipIds.slice().sort().join("_").slice(0, 40)}_${now.slice(11, 19).replace(/:/g, "")}`,
    projectId,
    members: clipIds.map((clipId) => ({ clipId, offsetSeconds: 0 })),
    confidence: "low",
    confidenceScore: 0,
    matchReasons: ["Grouped manually"],
    state: "confirmed",
    origin: "manual",
    createdAt: now,
    updatedAt: now,
  };
}

export function isAudioClip(clip: Pick<ProductionIngestClip, "filename" | "audioTracks" | "resolution">): boolean {
  return audioOnly(clip as ProductionIngestClip);
}
