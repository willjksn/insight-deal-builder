/** Frame-aware time helpers for future timeline engine (V1E+). */

export function secondsToFrames(seconds: number, frameRate: number): number {
  if (!Number.isFinite(seconds) || !Number.isFinite(frameRate) || frameRate <= 0) return 0;
  return Math.round(seconds * frameRate);
}

export function framesToSeconds(frames: number, frameRate: number): number {
  if (!Number.isFinite(frames) || !Number.isFinite(frameRate) || frameRate <= 0) return 0;
  return frames / frameRate;
}

/** Format non-drop SMPTE-style TC HH:MM:SS:FF */
export function framesToTimecode(frames: number, frameRate: number): string {
  const fps = Math.round(frameRate);
  if (fps <= 0) return "00:00:00:00";
  const total = Math.max(0, Math.floor(frames));
  const ff = total % fps;
  const totalSeconds = Math.floor(total / fps);
  const ss = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const mm = totalMinutes % 60;
  const hh = Math.floor(totalMinutes / 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(hh)}:${pad(mm)}:${pad(ss)}:${pad(ff)}`;
}

export function parseTimecodeToFrames(tc: string, frameRate: number): number | null {
  const m = tc.trim().match(/^(\d{1,2}):(\d{2}):(\d{2})[:;](\d{2})$/);
  if (!m) return null;
  const fps = Math.round(frameRate);
  if (fps <= 0) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  const ss = Number(m[3]);
  const ff = Number(m[4]);
  if ([hh, mm, ss, ff].some((n) => !Number.isFinite(n))) return null;
  if (mm >= 60 || ss >= 60 || ff >= fps) return null;
  return ((hh * 60 + mm) * 60 + ss) * fps + ff;
}
