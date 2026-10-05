import { buildManagedFolderPlan } from "@/lib/aiEditor/projectFolders";
import { appendCapturedTake, unlinkCapturedTake } from "@/lib/production/capturedFootage";
import type { ProductionDay, ProductionDayShot, ProductionShotMedia } from "@/lib/production/types";
import type { IngestCameraSlot, ProductionIngestClip, ProductionIngestSession } from "@/lib/production/ingestTypes";

const CAMERA_FOLDER: Record<IngestCameraSlot, string> = {
  A: "CAMERA_A",
  B: "CAMERA_B",
  C: "CAMERA_C",
  other: "OTHER",
};

export function ingestDestinationFolder(slot: IngestCameraSlot): string {
  const folder = CAMERA_FOLDER[slot] || "OTHER";
  const plan = buildManagedFolderPlan([folder]);
  return plan.find((entry) => entry.startsWith("01_ORIGINAL_MEDIA/") && entry.endsWith(folder)) || `01_ORIGINAL_MEDIA/${folder}`;
}

/** Review proxy beside originals: 01_ORIGINAL_MEDIA/... becomes 02_PROXIES/..., named with the clip id. */
export function productionProxyPath(originalPath: string, clipId: string): string {
  const sep = originalPath.includes("\\") ? "\\" : "/";
  const parts = originalPath.split(/[/\\]/).filter((part) => part.length > 0);
  const file = parts[parts.length - 1] || "clip";
  const stem = file.replace(/\.[^.]+$/, "") || "clip";
  const name = `${clipId}_${stem}.mp4`;
  const marker = parts.findIndex((part) => part.toUpperCase() === "01_ORIGINAL_MEDIA");
  if (marker >= 0) {
    return [...parts.slice(0, marker), "02_PROXIES", ...parts.slice(marker + 1, -1), name].join(sep);
  }
  return [...parts.slice(0, -1), "02_PROXIES", name].join(sep);
}

export function clipDestinationPath(session: Pick<ProductionIngestSession, "destinationPath">, filename: string): string {
  const root = session.destinationPath?.replace(/[\\/]+$/, "") || "01_ORIGINAL_MEDIA/CAMERA_A";
  return `${root}/${filename}`;
}

function durationSeconds(value: string | undefined): number | null {
  const match = String(value || "").match(/(\d+(\.\d+)?)/);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) ? n : null;
}

/** Suggest a shot only when one shot's planned duration is within a second of the clip. */
export function suggestShotForClip(
  clip: Pick<ProductionIngestClip, "durationSeconds">,
  shots: Pick<ProductionDayShot, "id" | "duration">[]
): { shotId: string; reason: string } | null {
  if (!clip.durationSeconds) return null;
  const matches = shots.filter((shot) => {
    const planned = durationSeconds(shot.duration);
    return planned != null && Math.abs(planned - (clip.durationSeconds as number)) <= 1;
  });
  if (matches.length !== 1) return null;
  return { shotId: matches[0].id, reason: "Planned duration is within a second of this clip." };
}

export function capturedTakeFromIngestClip(session: ProductionIngestSession, clip: ProductionIngestClip): ProductionShotMedia {
  const camera = [clip.cameraSlot === "other" ? "Other" : `Camera ${clip.cameraSlot}`, clip.cameraBody].filter(Boolean).join(" · ");
  return {
    id: clip.id,
    role: "captured_footage",
    url: clip.thumbnailUrl || "",
    storagePath: clip.thumbnailPath,
    fileName: clip.originalFilename,
    mediaType: clip.thumbnailUrl ? "image" : "video",
    mimeType: clip.thumbnailUrl ? "image/jpeg" : undefined,
    projectId: session.projectId,
    createdAt: clip.recordedAt || session.createdAt,
    camera,
    clipDuration: clip.durationSeconds ? `${clip.durationSeconds}s` : undefined,
    notes: clip.notes,
    rating: clip.rating,
    preferred: Boolean(clip.preferred),
    label: clip.filename,
    metadata: {
      ingestSessionId: session.id,
      ingestClipId: clip.id,
      sourceCard: clip.sourceCard || "",
      sourcePath: clip.sourcePath || "",
      destinationPath: clip.destinationPath || "",
      timecodeStart: clip.timecodeStart || "",
      timecodeEnd: clip.timecodeEnd || "",
      copyStatus: clip.copyStatus,
      proxyStatus: clip.proxyStatus,
      localOriginalPath: clip.localDestinationPath || "",
      localProxyPath: clip.localProxyPath || "",
      localThumbnailPath: clip.localThumbnailPath || "",
      ...(clip.codec ? { codec: clip.codec } : {}),
      ...(clip.resolution ? { resolution: clip.resolution } : {}),
    },
  };
}

function withoutIngestClip(shot: ProductionDayShot, clipId: string): ProductionDayShot {
  const take = (shot.media ?? []).find((item) => item.role === "captured_footage" && item.metadata?.ingestClipId === clipId);
  return take ? unlinkCapturedTake(shot, take.id) : shot;
}

export function assignIngestClips(
  days: ProductionDay[],
  session: ProductionIngestSession,
  clipIds: string[],
  shotId: string | null
): { days: ProductionDay[]; session: ProductionIngestSession } {
  const selected = new Set(clipIds);
  let nextDays = days.map((day) => ({
    ...day,
    shots: day.shots.map((shot) => {
      let next = shot;
      for (const id of selected) next = withoutIngestClip(next, id);
      return next;
    }),
  }));
  const clips = session.clips.map((clip) => {
    if (!selected.has(clip.id)) return clip;
    return { ...clip, linkedShotId: shotId };
  });
  if (shotId) {
    nextDays = nextDays.map((day) => ({
      ...day,
      shots: day.shots.map((shot) => {
        if (shot.id !== shotId) return shot;
        return clips.filter((clip) => selected.has(clip.id)).reduce((current, clip) => {
          return appendCapturedTake(current, capturedTakeFromIngestClip({ ...session, clips }, clip));
        }, shot);
      }),
    }));
  }
  return { days: nextDays, session: { ...session, clips } };
}
