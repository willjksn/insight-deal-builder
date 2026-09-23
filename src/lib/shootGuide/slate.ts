import type {
  ShootGuide,
  ShootGuideShot,
  ShootGuideSlateRecord,
  ShootGuideTakeRecord,
  ShootGuideTakeStatus,
} from "./types";

export function nextTakeNumber(shot: ShootGuideShot | undefined): number {
  if (!shot?.takeRecords?.length) return 1;
  return Math.max(0, ...shot.takeRecords.map((t) => t.takeNumber || 0)) + 1;
}

export function fpsFromSettings(raw?: string): string {
  const m = (raw || "").match(/\b(23\.98|24|25|29\.97|30|48|50|60)(?:\s*p|\s*fps)?\b/i);
  return m ? m[1] : "24";
}

export function inferAudioSync(shot: ShootGuideShot | undefined): "sync" | "mos" | "" {
  const blob = `${shot?.audioRequirements || ""} ${shot?.specialRequirements || ""}`.toLowerCase();
  if (/\bmos\b/.test(blob)) return "mos";
  if (blob.trim()) return "sync";
  return "";
}

export function slateDefaults(
  guide: ShootGuide,
  shot: ShootGuideShot | undefined,
  previous?: ShootGuideSlateRecord | null
): Omit<ShootGuideSlateRecord, "id"> {
  return {
    shotId: shot?.id ?? null,
    roll: previous?.roll || "A001",
    scene: previous?.scene || guide.sourceSceneLabel || "1",
    shot: shot ? String(shot.shotNumber).padStart(2, "0") : previous?.shot || "",
    take: shot ? nextTakeNumber(shot) : 1,
    camera: shot?.camera || previous?.camera || "A",
    cameraRoll: previous?.cameraRoll || "A001",
    soundRoll: previous?.soundRoll || "",
    fps: previous?.fps || fpsFromSettings(shot?.cameraSettings || guide.setup?.cameraSettings),
    audioSync: inferAudioSync(shot) || previous?.audioSync || "",
    timecode: previous?.timecode || "",
    date: previous?.date || new Date().toISOString().slice(0, 10),
    notes: "",
  };
}

export function logTake(params: {
  shot: ShootGuideShot;
  takeNumber: number;
  status: ShootGuideTakeStatus | null;
  note?: string;
  soundRoll?: string;
}): ShootGuideTakeRecord {
  return {
    id: crypto.randomUUID(),
    takeNumber: params.takeNumber,
    timestamp: new Date().toISOString(),
    status: params.status,
    note: params.note?.trim() || "",
    soundRoll: params.soundRoll || "",
  };
}

export function circledTakes(shot: ShootGuideShot): ShootGuideTakeRecord[] {
  return (shot.takeRecords ?? []).filter((t) => t.status === "CIRCLE" || t.status === "GOOD");
}
