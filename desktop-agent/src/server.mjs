/**
 * ShootSpine Desktop Agent — V1A + V1B ingest helpers
 * Binds localhost only. No remote shell. No arbitrary command execution.
 * Never deletes or formats camera cards.
 */
import http from "node:http";
import fs from "node:fs/promises";
import fssync from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import os from "node:os";
import crypto from "node:crypto";
import { URL } from "node:url";

const PORT = Number(process.env.SHOOTSPINE_AGENT_PORT || 17865);
const HOST = "127.0.0.1";
const VERSION = "0.17.14";
/** Set SHOOTSPINE_AGENT_DEV_OPEN=1 to accept any non-empty Bearer token (local agent testing). */
const DEV_OPEN = process.env.SHOOTSPINE_AGENT_DEV_OPEN === "1";
/** Optional: ShootSpine origin for verifying minted tokens (e.g. http://localhost:3000). */
const APP_VERIFY_URL = (process.env.SHOOTSPINE_APP_URL || "").replace(/\/$/, "");

/** @type {Map<string, { expiresAt: number, projectId?: string }>} */
const sessions = new Map();

const MEDIA_EXTS = new Set([
  ".mp4",
  ".mov",
  ".mxf",
  ".mkv",
  ".avi",
  ".mts",
  ".m2ts",
  ".r3d",
  ".braw",
  ".wav",
  ".bwf",
  ".aiff",
  ".aif",
  ".mp3",
  ".m4a",
  ".aac",
  // Images intentionally omitted — Sony / camera proxy stills (*T01.JPG) are not ingested.
]);

const MANAGED_ROOT = [
  "01_ORIGINAL_MEDIA",
  "02_PROXIES",
  "03_PROJECT_FILES",
  "04_AUDIO",
  "05_GRAPHICS",
  "06_EXPORTS",
  "07_CACHE",
  "08_REFERENCE",
];

function json(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Authorization, Content-Type, Range",
    "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
    "Access-Control-Expose-Headers": "Content-Length, Content-Range, Accept-Ranges",
  });
  res.end(data);
}

function containsTraversal(p) {
  if (!p || p.includes("\0")) return true;
  return p.split(/[\\/]/).some((part) => part === "..");
}

function assertSafePath(p) {
  if (!p?.trim()) throw new Error("Path is required");
  if (containsTraversal(p)) throw new Error("Invalid path");
}

function requestToken(req) {
  const h = req.headers.authorization || "";
  const bearer = h.replace(/^Bearer\s+/i, "").trim();
  if (bearer) return bearer;
  try {
    const url = new URL(req.url || "/", `http://${HOST}:${PORT}`);
    return (url.searchParams.get("token") || "").trim();
  } catch {
    return "";
  }
}

function pruneSessions() {
  const now = Date.now();
  for (const [token, s] of sessions) {
    if (s.expiresAt <= now) sessions.delete(token);
  }
}

function registerSession(body) {
  const token = String(body?.token || "").trim();
  if (!token || token.length < 16) throw new Error("Invalid session token");
  const expMs = body?.expiresAt
    ? Date.parse(String(body.expiresAt))
    : Date.now() + 15 * 60 * 1000;
  if (!Number.isFinite(expMs) || expMs <= Date.now()) {
    throw new Error("Session already expired");
  }
  sessions.set(token, {
    expiresAt: expMs,
    projectId: body?.projectId ? String(body.projectId) : undefined,
  });
  return { ok: true, expiresAt: new Date(expMs).toISOString() };
}

async function verifyTokenWithApp(token) {
  if (!APP_VERIFY_URL) return null;
  try {
    const res = await fetch(`${APP_VERIFY_URL}/api/ai-editor/agent/verify-session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return false;
    const data = await res.json();
    return data?.ok === true ? data : false;
  } catch {
    return false;
  }
}

async function requireAuth(req) {
  // health / session register are public; others need a registered token
  // (or DEV_OPEN=1 for agent-only testing)
  const token = requestToken(req);
  if (!token) return false;
  if (DEV_OPEN) return true;
  pruneSessions();
  const local = sessions.get(token);
  if (local && local.expiresAt > Date.now()) return true;
  if (APP_VERIFY_URL) {
    const verified = await verifyTokenWithApp(token);
    if (verified) {
      const expMs = verified.expiresAt
        ? Date.parse(verified.expiresAt)
        : Date.now() + 15 * 60 * 1000;
      if (Number.isFinite(expMs) && expMs > Date.now()) {
        sessions.set(token, {
          expiresAt: expMs,
          projectId: verified.projectId ? String(verified.projectId) : undefined,
        });
        return true;
      }
    }
  }
  return false;
}

function mimeForPath(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    ".mp4": "video/mp4",
    ".m4v": "video/mp4",
    ".webm": "video/webm",
    ".mov": "video/quicktime",
    ".mkv": "video/x-matroska",
    ".avi": "video/x-msvideo",
    ".wav": "audio/wav",
    ".mp3": "audio/mpeg",
    ".m4a": "audio/mp4",
    ".aac": "audio/aac",
    ".aiff": "audio/aiff",
    ".aif": "audio/aiff",
  };
  return map[ext] || "application/octet-stream";
}

async function streamLocalMedia(req, res, filePath) {
  assertSafePath(filePath);
  const abs = path.resolve(filePath);
  const st = await fs.stat(abs);
  if (!st.isFile()) throw new Error("Not a file");
  const size = st.size;
  const mime = mimeForPath(abs);
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Authorization, Content-Type, Range",
    "Access-Control-Expose-Headers": "Content-Length, Content-Range, Accept-Ranges",
    "Accept-Ranges": "bytes",
    "Content-Type": mime,
    "Cache-Control": "private, max-age=60",
  };

  if (req.method === "HEAD") {
    res.writeHead(200, { ...headers, "Content-Length": size });
    res.end();
    return;
  }

  const range = req.headers.range;
  if (range) {
    const m = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!m) {
      res.writeHead(416, headers);
      res.end();
      return;
    }
    let start = m[1] ? Number(m[1]) : 0;
    let end = m[2] ? Number(m[2]) : size - 1;
    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end >= size || start > end) {
      res.writeHead(416, { ...headers, "Content-Range": `bytes */${size}` });
      res.end();
      return;
    }
    // Cap oversized ranges for smoother scrubbing
    const maxChunk = 8 * 1024 * 1024;
    if (end - start + 1 > maxChunk) end = start + maxChunk - 1;
    res.writeHead(206, {
      ...headers,
      "Content-Length": end - start + 1,
      "Content-Range": `bytes ${start}-${end}/${size}`,
    });
    fssync.createReadStream(abs, { start, end }).pipe(res);
    return;
  }

  res.writeHead(200, { ...headers, "Content-Length": size });
  fssync.createReadStream(abs).pipe(res);
}

async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function buildFolderPlan(cameraLabels = ["CAMERA_A"]) {
  const cams = (cameraLabels.length ? cameraLabels : ["CAMERA_A"]).map((c) =>
    String(c)
      .replace(/[^\w\-]+/g, "_")
      .toUpperCase()
  );
  const unique = [...new Set(cams)];
  return [
    ...MANAGED_ROOT,
    ...unique.map((c) => path.join("01_ORIGINAL_MEDIA", c)),
    path.join("01_ORIGINAL_MEDIA", "AUDIO"),
    path.join("01_ORIGINAL_MEDIA", "DRONE"),
    path.join("01_ORIGINAL_MEDIA", "OTHER"),
  ];
}

async function createFolders(projectRoot, cameraLabels) {
  assertSafePath(projectRoot);
  const created = [];
  await fs.mkdir(projectRoot, { recursive: true });
  created.push(projectRoot);
  for (const rel of buildFolderPlan(cameraLabels)) {
    const full = path.join(projectRoot, rel);
    assertSafePath(full);
    await fs.mkdir(full, { recursive: true });
    created.push(full);
  }
  return created;
}

async function walkMedia(folderPath, recursive, out, depth = 0) {
  assertSafePath(folderPath);
  if (out.length >= 2000) return;
  let entries;
  try {
    entries = await fs.readdir(folderPath, { withFileTypes: true });
  } catch (e) {
    throw new Error(`Cannot read folder: ${e.message}`);
  }
  for (const ent of entries) {
    const full = path.join(folderPath, ent.name);
    if (ent.isDirectory()) {
      const name = ent.name.toUpperCase();
      // Skip OS / card junk that is never production media
      if (
        name === "SYSTEM VOLUME INFORMATION" ||
        name === "$RECYCLE.BIN" ||
        name === "TRASH" ||
        name.startsWith(".")
      ) {
        continue;
      }
      if (recursive && depth < 12) await walkMedia(full, true, out, depth + 1);
      continue;
    }
    if (ent.name.startsWith(".")) continue;
    const ext = path.extname(ent.name).toLowerCase();
    if (!MEDIA_EXTS.has(ext)) continue;
    const st = await fs.stat(full);
    out.push({
      path: full,
      filename: ent.name,
      sizeBytes: st.size,
      mtimeMs: st.mtimeMs,
    });
    if (out.length >= 2000) return;
  }
}

const CAMERA_LAYOUT_DIRS = new Set([
  "PRIVATE",
  "M4ROOT",
  "XDROOT",
  "AVCHD",
  "BPAV",
  "DCIM",
  "CLIP",
  "ZOOM",
]);

/**
 * Phase A — probe mounted volumes for camera/audio card layouts (read-only).
 * Classification (Sony/Zoom/generic) runs in the web app detectors.
 */
async function detectMediaSourceProbes(body = {}) {
  const includeInternal = body.includeInternal === true;
  const maxFiles = Math.min(2000, Math.max(1, Number(body.maxFiles) || 500));
  const drives = await listDrives();
  const candidates = drives.filter((d) => {
    if (d.kind && d.kind !== "drive" && d.kind !== "volume") return false;
    const letter = String(d.path || "")
      .replace(/\\/g, "")
      .toUpperCase()
      .replace(":", "");
    // Always skip the system volume unless explicitly requested
    if (!includeInternal && (letter === "C" || d.storageType === "internal")) return false;
    if (includeInternal) return true;
    if (d.removable) return true;
    if (
      d.storageType === "externalSSD" ||
      d.storageType === "externalHDD" ||
      d.storageType === "removable" ||
      d.storageType === "unknown"
    ) {
      return true;
    }
    // ProGrade / CFexpress readers: often Fixed (not Removable) on USB/Thunderbolt
    const bus = String(d.busType || "").toUpperCase();
    return bus.includes("USB") || bus.includes("SD") || bus.includes("THUNDERBOLT");
  });

  const probes = [];
  for (const drive of candidates.slice(0, 16)) {
    const mountPath = path.resolve(drive.path);
    try {
      assertSafePath(mountPath);
      await fs.access(mountPath);
    } catch {
      continue;
    }

    let topLevelDirs = [];
    try {
      const entries = await fs.readdir(mountPath, { withFileTypes: true });
      topLevelDirs = entries
        .filter((e) => e.isDirectory() && !e.name.startsWith("."))
        .map((e) => e.name)
        .slice(0, 80);
    } catch {
      continue;
    }

    // Prefer known camera roots. Sony CFexpress often has top-level M4ROOT
    // *and* an empty PRIVATE folder — never prefer empty PRIVATE over M4ROOT.
    let mediaRoot = mountPath;
    const upper = new Map(topLevelDirs.map((n) => [n.toUpperCase(), n]));
    const pickRoot = async () => {
      for (const key of ["M4ROOT", "XDROOT", "AVCHD", "BPAV", "DCIM", "ZOOM", "CLIP"]) {
        if (upper.has(key)) return path.join(mountPath, upper.get(key));
      }
      if (upper.has("PRIVATE")) {
        const priv = path.join(mountPath, upper.get("PRIVATE"));
        try {
          const sub = await fs.readdir(priv, { withFileTypes: true });
          const m4 = sub.find((e) => e.isDirectory() && e.name.toUpperCase() === "M4ROOT");
          if (m4) return path.join(priv, m4.name);
          const xd = sub.find((e) => e.isDirectory() && e.name.toUpperCase() === "XDROOT");
          if (xd) return path.join(priv, xd.name);
        } catch {
          /* fall through */
        }
        return priv;
      }
      if (upper.has("SONY")) return path.join(mountPath, upper.get("SONY"));
      return mountPath;
    };
    mediaRoot = await pickRoot();

    const layoutHit =
      topLevelDirs.some((d) => CAMERA_LAYOUT_DIRS.has(d.toUpperCase()) || d.toUpperCase() === "SONY") ||
      /FX\d|A7|FX3|FX30/i.test(String(drive.volumeLabel || drive.label || ""));
    const files = [];
    try {
      await walkMedia(mediaRoot, true, files);
    } catch {
      /* unreadable — skip */
      continue;
    }
    // If preferred root was empty (e.g. empty PRIVATE), fall back to whole volume
    if (files.length === 0 && mediaRoot !== mountPath) {
      try {
        await walkMedia(mountPath, true, files);
        if (files.length) mediaRoot = mountPath;
      } catch {
        /* keep empty */
      }
    }
    if (files.length > maxFiles) files.length = maxFiles;
    if (!layoutHit && files.length === 0) continue;

    probes.push({
      mountPath,
      label: drive.label,
      volumeLabel: drive.volumeLabel,
      volumeIdentifier: drive.volumeIdentifier,
      removable: drive.removable,
      storageType: drive.storageType,
      busType: drive.busType,
      mediaType: drive.mediaType,
      driveType: drive.driveType,
      availableBytes: drive.availableBytes,
      capacityBytes: drive.capacityBytes,
      topLevelDirs,
      mediaRoot,
      files,
      clipCount: files.length,
      totalBytes: files.reduce((s, f) => s + (f.sizeBytes || 0), 0),
    });
  }

  return { probes, scannedDrives: candidates.length };
}

function runFfprobe(filePath) {
  return new Promise((resolve, reject) => {
    const bin = process.env.FFPROBE_PATH || "ffprobe";
    const args = [
      "-v",
      "quiet",
      "-print_format",
      "json",
      "-show_format",
      "-show_streams",
      filePath,
    ];
    const child = spawn(bin, args, { windowsHide: true });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) reject(new Error(stderr || `ffprobe exit ${code}`));
      else {
        try {
          resolve(JSON.parse(stdout));
        } catch (e) {
          reject(e);
        }
      }
    });
  });
}

function classifyCodec({ codec, codecLongName, codecTag, container, filename, mediaType }) {
  if (mediaType === "audio") {
    return { family: "audio", label: "Audio", needsProxy: false };
  }
  const blob = [codec, codecLongName, codecTag, container, filename]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const c = (codec || "").toLowerCase();

  const isXavc =
    /\bxavc\b/.test(blob) ||
    /\bxavs\b/.test(blob) ||
    blob.includes("sony xavc") ||
    (/\bxav/.test(blob) && (c === "h264" || c === "hevc" || c === "h265"));

  if (isXavc) {
    if (blob.includes("s-i") || blob.includes("s_i") || blob.includes("intra")) {
      return {
        family: "xavc_s_i",
        label: "XAVC S-I",
        needsProxy: true,
        reason: "Intra XAVC — use H.264 proxy for preview/AI.",
      };
    }
    if (blob.includes("hs") || c === "hevc" || c === "h265") {
      return {
        family: "xavc_hs",
        label: "XAVC HS",
        needsProxy: true,
        reason: "XAVC HS (H.265) — use H.264 proxy for preview/AI.",
      };
    }
    return {
      family: "xavc_s",
      label: "XAVC S",
      needsProxy: true,
      reason: "XAVC S — proxy recommended for reliable Windows preview.",
    };
  }
  if (c === "hevc" || c === "h265") {
    return {
      family: "hevc",
      label: "H.265 / HEVC",
      needsProxy: true,
      reason: "HEVC — proxy recommended for AI Editor.",
    };
  }
  if (c === "h264" || c === "avc" || c === "avc1") {
    return { family: "h264", label: "H.264", needsProxy: false };
  }
  return { family: "other", label: c || "Unknown", needsProxy: false };
}

function mapProbe(filePath, raw) {
  const filename = path.basename(filePath);
  const ext = path.extname(filename).replace(".", "").toLowerCase();
  const video = (raw.streams || []).find((s) => s.codec_type === "video");
  const audio = (raw.streams || []).find((s) => s.codec_type === "audio");
  const duration = Number(raw.format?.duration);
  const frameRate = video?.r_frame_rate
    ? (() => {
        const [a, b] = video.r_frame_rate.split("/").map(Number);
        return b ? a / b : a;
      })()
    : undefined;
  // Extension wins for stills — Sony proxy JPGs probe as MJPEG video streams.
  const imageExts = new Set(["jpg", "jpeg", "png", "tif", "tiff"]);
  const audioExts = new Set(["wav", "bwf", "aiff", "aif", "mp3", "m4a", "aac"]);
  let mediaType = video ? "video" : audio ? "audio" : "other";
  if (imageExts.has(ext)) mediaType = "image";
  else if (audioExts.has(ext) && !video) mediaType = "audio";
  const codec = video?.codec_name || audio?.codec_name;
  const codecLongName = video?.codec_long_name || audio?.codec_long_name;
  const codecTag = video?.codec_tag_string;
  const container = raw.format?.format_name;
  const classified = classifyCodec({
    codec,
    codecLongName,
    codecTag,
    container,
    filename,
    mediaType,
  });
  return {
    filename,
    originalFilename: filename,
    extension: ext,
    mediaType,
    codec,
    codecLongName,
    codecTag,
    codecFamily: classified.family,
    codecLabel: classified.label,
    needsProxy: classified.needsProxy,
    codecNote: classified.reason,
    container,
    resolution: video ? `${video.width}x${video.height}` : undefined,
    frameRate,
    durationSeconds: Number.isFinite(duration) ? duration : undefined,
    videoBitrate: video?.bit_rate ? Number(video.bit_rate) : undefined,
    audioChannels: audio?.channels,
    audioSampleRate: audio?.sample_rate ? Number(audio.sample_rate) : undefined,
    // Sony XAVC often stores TC on a timed-metadata stream, not the video track.
    startTimecode:
      video?.tags?.timecode ||
      raw.format?.tags?.timecode ||
      (Array.isArray(raw.streams)
        ? raw.streams.map((s) => s?.tags?.timecode).find((t) => typeof t === "string" && t.trim())
        : undefined),
    creationTime: raw.format?.tags?.creation_time,
    onlineStatus: "online",
  };
}

/** Cache tool probes — Whisper cold-start can take many seconds and must not block /health. */
const toolProbeCache = {
  ffmpeg: undefined,
  ffprobe: undefined,
  whisper: undefined,
  checkedAt: 0,
};

function spawnWithTimeout(bin, args, opts = {}, timeoutMs = 2500) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      try {
        child.kill();
      } catch {
        /* ignore */
      }
      resolve(value);
    };
    const child = spawn(bin, args, { windowsHide: true, ...opts });
    const timer = setTimeout(() => finish(false), timeoutMs);
    child.on("error", () => {
      clearTimeout(timer);
      finish(false);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      finish(code === 0);
    });
  });
}

function toolAvailable(bin) {
  return spawnWithTimeout(bin, ["-version"], {}, 2500);
}

/**
 * Whisper CLI has no `-version`; a quick spawn that errors (missing args) still proves the binary exists.
 * Hard-timeout so /health never stalls on CUDA/torch import.
 */
function whisperCliAvailable(bin) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      try {
        child.kill();
      } catch {
        /* ignore */
      }
      resolve(value);
    };
    const child = spawn(bin, ["--help"], {
      windowsHide: true,
      env: { ...process.env, PYTHONUTF8: "1", PYTHONIOENCODING: "utf-8" },
    });
    const timer = setTimeout(() => finish(true), 2000); // process started = available
    child.on("error", () => {
      clearTimeout(timer);
      finish(false);
    });
    child.on("close", () => {
      clearTimeout(timer);
      finish(true);
    });
  });
}

async function probeTools(force = false) {
  const now = Date.now();
  if (!force && now - toolProbeCache.checkedAt < 60_000 && toolProbeCache.ffmpeg !== undefined) {
    return toolProbeCache;
  }
  const ffprobeBin = process.env.FFPROBE_PATH || "ffprobe";
  const ffmpegBin = process.env.FFMPEG_PATH || "ffmpeg";
  const whisperBin = process.env.WHISPER_PATH || "whisper";
  const [ffprobeAvailable, ffmpegAvailable, whisperAvailable] = await Promise.all([
    toolAvailable(ffprobeBin),
    toolAvailable(ffmpegBin),
    whisperCliAvailable(whisperBin),
  ]);
  toolProbeCache.ffprobe = ffprobeAvailable;
  toolProbeCache.ffmpeg = ffmpegAvailable;
  toolProbeCache.whisper = whisperAvailable;
  toolProbeCache.checkedAt = Date.now();
  return toolProbeCache;
}

/** Fire-and-forget warm cache so first /health after boot is still fast enough for launch wait. */
void probeTools(true);

function runFfmpegSceneTimes(filePath) {
  return new Promise((resolve) => {
    const bin = process.env.FFMPEG_PATH || "ffmpeg";
    const args = [
      "-i",
      filePath,
      "-filter:v",
      "select='gt(scene,0.35)',showinfo",
      "-f",
      "null",
      "-",
    ];
    const child = spawn(bin, args, { windowsHide: true });
    let stderr = "";
    child.stderr.on("data", (d) => (stderr += d));
    child.on("error", () => resolve([]));
    child.on("close", () => {
      const times = [];
      const re = /pts_time:([0-9.]+)/g;
      let m;
      while ((m = re.exec(stderr))) {
        const t = Number(m[1]);
        if (Number.isFinite(t)) times.push(t);
      }
      resolve([...new Set(times)].sort((a, b) => a - b));
    });
  });
}

async function detectShots(filePath) {
  assertSafePath(filePath);
  const probe = await probeFile(filePath);
  const duration = Number(probe.durationSeconds) || 0;
  const cuts = await runFfmpegSceneTimes(filePath);
  const bounds = [0, ...cuts.filter((t) => t > 0.25 && t < duration - 0.25), duration || 0];
  const uniqueBounds = [...new Set(bounds.map((t) => Number(t.toFixed(3))))].sort(
    (a, b) => a - b
  );
  const shots = [];
  for (let i = 0; i < uniqueBounds.length - 1; i++) {
    const start = uniqueBounds[i];
    const end = uniqueBounds[i + 1];
    if (end - start < 0.2) continue;
    shots.push({
      index: shots.length,
      startSeconds: start,
      endSeconds: end,
      confidence: cuts.length ? 0.65 : 0.4,
      shotSize: "unknown",
      movement: "unknown",
    });
  }
  if (!shots.length && duration > 0) {
    shots.push({
      index: 0,
      startSeconds: 0,
      endSeconds: duration,
      confidence: 0.35,
      shotSize: "unknown",
      movement: "unknown",
    });
  }
  return { probe, shots, method: cuts.length ? "ffmpeg_scene" : "whole_clip" };
}

function runWhisperOnce(filePath, device) {
  return new Promise((resolve) => {
    const bin = process.env.WHISPER_PATH || "whisper";
    const outDir = path.join(path.dirname(filePath), ".shootspine-transcripts");
    const args = [
      filePath,
      "--model",
      process.env.WHISPER_MODEL || "tiny",
      "--device",
      device,
      "--output_format",
      "json",
      "--output_dir",
      outDir,
    ];
    const child = spawn(bin, args, {
      windowsHide: true,
      env: { ...process.env, PYTHONUTF8: "1", PYTHONIOENCODING: "utf-8" },
    });
    let stderr = "";
    child.stderr.on("data", (d) => (stderr += d));
    child.on("error", () => resolve({ available: false, segments: [], error: "whisper_not_found" }));
    child.on("close", async (code) => {
      if (code !== 0) {
        resolve({ available: true, segments: [], error: stderr.slice(-800) || `whisper exit ${code}` });
        return;
      }
      try {
        const base = path.basename(filePath, path.extname(filePath));
        const jsonPath = path.join(outDir, `${base}.json`);
        const raw = JSON.parse(await fs.readFile(jsonPath, "utf8"));
        const segments = (raw.segments || []).map((s, i) => ({
          index: i,
          startSeconds: Number(s.start) || 0,
          endSeconds: Number(s.end) || 0,
          text: String(s.text || "").trim(),
          confidence: typeof s.avg_logprob === "number" ? Math.min(1, Math.max(0, 1 + s.avg_logprob / 5)) : 0.5,
        }));
        resolve({ available: true, segments, language: raw.language, device });
      } catch (e) {
        resolve({
          available: true,
          segments: [],
          error: e instanceof Error ? e.message : "transcript_parse_failed",
        });
      }
    });
  });
}

async function runWhisperTranscribe(filePath) {
  const preferred = (process.env.WHISPER_DEVICE || "cuda").toLowerCase();
  let result = await runWhisperOnce(filePath, preferred);
  const cudaFailed =
    Boolean(result.error) &&
    /cuda|CUDA|no kernel image|GPU/i.test(String(result.error)) &&
    preferred !== "cpu";
  if (cudaFailed) {
    result = await runWhisperOnce(filePath, "cpu");
  }
  return result;
}

async function analyzeMedia(filePath, opts = {}) {
  assertSafePath(filePath);
  const { probe, shots, method } = await detectShots(filePath);
  const technical = {
    readable: !probe.probeFallback,
    codec: probe.codec,
    resolution: probe.resolution,
    frameRate: probe.frameRate,
    durationSeconds: probe.durationSeconds,
    hasAudio: (probe.audioChannels || 0) > 0,
    audioChannels: probe.audioChannels,
    issues: [],
    confidence: probe.probeFallback ? 0.45 : 0.9,
  };
  if (!probe.codec) technical.issues.push("Codec not detected");
  if (probe.mediaType === "video" && !(probe.audioChannels > 0)) {
    technical.issues.push("No audio track detected");
  }

  let transcript = { available: false, segments: [] };
  if (opts.transcribe) {
    transcript = await runWhisperTranscribe(filePath);
  }

  return {
    probe,
    technical,
    shots,
    shotMethod: method,
    transcript,
  };
}

function runFfmpegProxy(filePath, outPath, profile) {
  return new Promise((resolve, reject) => {
    const bin = process.env.FFMPEG_PATH || "ffmpeg";
    const scale = profile === "preview_1080p" ? "1080" : "720";
    // Decode with FFmpeg (handles XAVC HS / S / S-I when FFmpeg build supports the container).
    // Output browser-friendly H.264 + AAC — originals untouched.
    const args = [
      "-y",
      "-i",
      filePath,
      "-map",
      "0:v:0",
      "-map",
      "0:a:0?",
      "-vf",
      `scale=-2:${scale}`,
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "23",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-b:a",
      "160k",
      "-movflags",
      "+faststart",
      outPath,
    ];
    const child = spawn(bin, args, { windowsHide: true });
    let stderr = "";
    child.stderr.on("data", (d) => (stderr += d));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) reject(new Error(stderr.slice(-800) || `ffmpeg exit ${code}`));
      else resolve();
    });
  });
}

async function hideDotFolder(dirPath) {
  if (process.platform !== "win32") return;
  try {
    await new Promise((resolve) => {
      const child = spawn(
        "attrib",
        ["+H", "+S", dirPath],
        { windowsHide: true, stdio: "ignore" }
      );
      child.on("error", () => resolve());
      child.on("close", () => resolve());
    });
  } catch {
    /* best-effort */
  }
}

async function createProxy(filePath, outputPath, profile = "ai_720p") {
  assertSafePath(filePath);
  const out =
    outputPath?.trim() ||
    path.join(
      path.dirname(filePath),
      ".shootspine-proxies",
      `${path.basename(filePath)}.${profile}.mp4`
    );
  assertSafePath(out);
  const proxyDir = path.dirname(out);
  await fs.mkdir(proxyDir, { recursive: true });
  // Keep Resolve / Explorer import dialogs from showing preview junk as empty folders.
  if (path.basename(proxyDir).toLowerCase() === ".shootspine-proxies") {
    await hideDotFolder(proxyDir);
  }
  await runFfmpegProxy(filePath, out, profile);
  return { proxyPath: out, profile };
}

async function probeFile(filePath) {
  assertSafePath(filePath);
  try {
    const raw = await runFfprobe(filePath);
    return mapProbe(filePath, raw);
  } catch {
    const st = await fs.stat(filePath);
    const filename = path.basename(filePath);
    const ext = path.extname(filename).replace(".", "").toLowerCase();
    return {
      filename,
      originalFilename: filename,
      extension: ext,
      mediaType: [".mp4", ".mov", ".mxf", ".mkv"].includes(`.${ext}`)
        ? "video"
        : [".wav", ".aiff", ".mp3"].includes(`.${ext}`)
          ? "audio"
          : "other",
      sizeBytes: st.size,
      onlineStatus: "online",
      probeFallback: true,
    };
  }
}

function runFfmpegThumb(filePath, outPath) {
  return new Promise((resolve, reject) => {
    const bin = process.env.FFMPEG_PATH || "ffmpeg";
    const args = [
      "-y",
      "-ss",
      "0.5",
      "-i",
      filePath,
      "-frames:v",
      "1",
      "-vf",
      "scale=240:-1",
      "-q:v",
      "7",
      outPath,
    ];
    const child = spawn(bin, args, { windowsHide: true });
    let stderr = "";
    child.stderr.on("data", (d) => (stderr += d));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) reject(new Error(stderr || `ffmpeg exit ${code}`));
      else resolve();
    });
  });
}

/** Windows "Documents\\My Videos" style junctions often throw EPERM for Node. */
const WINDOWS_JUNCTION_REDIRECTS = new Map([
  ["my videos", "Videos"],
  ["my music", "Music"],
  ["my pictures", "Pictures"],
]);

const SKIP_DIR_NAMES = new Set(
  [
    "my videos",
    "my music",
    "my pictures",
    "my documents",
    "application data",
    "local settings",
    "cookies",
    "nethood",
    "printhood",
    "recent",
    "sendto",
    "templates",
    "start menu",
    "$recycle.bin",
    "system volume information",
  ].map((s) => s.toLowerCase())
);

async function canReadDir(dirPath) {
  try {
    await fs.access(dirPath);
    const lst = await fs.lstat(dirPath);
    if (lst.isSymbolicLink()) {
      // Prefer real folders; junctions under Documents are often unreadable.
      try {
        await fs.readdir(dirPath);
        return true;
      } catch {
        return false;
      }
    }
    await fs.readdir(dirPath);
    return true;
  } catch {
    return false;
  }
}

function redirectWindowsJunction(dirPath) {
  if (process.platform !== "win32") return null;
  const base = path.basename(dirPath).toLowerCase();
  const targetName = WINDOWS_JUNCTION_REDIRECTS.get(base);
  if (!targetName) return null;
  const home = os.homedir();
  if (!home) return null;
  return path.join(home, targetName);
}

function looksLikePortableSsdLabel(meta) {
  const blob = [meta.volumeLabel, meta.friendlyName, meta.mediaType]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (!blob) return false;
  if (/\bhdd\b|hard\s*disk|spinning/.test(blob)) return false;
  return (
    /\bssd\b/.test(blob) ||
    /\bpssd\b/.test(blob) ||
    /\bt7\b/.test(blob) ||
    /\bt5\b/.test(blob) ||
    /\bt3\b/.test(blob) ||
    /\bextreme\s*portable\b/.test(blob)
  );
}

async function classifyWinDrive(meta) {
  const letter = String(meta.letter || "").toUpperCase().replace(":", "");
  const bus = String(meta.busType || "").toLowerCase();
  const media = String(meta.mediaType || "").toLowerCase();
  const driveType = String(meta.driveType || "").toLowerCase();
  const removable = Boolean(meta.removable) || driveType.includes("removable");
  const isUsb =
    removable ||
    bus.includes("usb") ||
    bus.includes("thunderbolt") ||
    bus.includes("file back");
  if (driveType.includes("network") || bus.includes("file back")) return "network";
  // CFexpress / ProGrade readers often appear as Fixed + USB (not Removable).
  if (isUsb) {
    // T7/T5 often report MediaType=Unspecified — use volume / disk name.
    if (media.includes("ssd") || looksLikePortableSsdLabel(meta)) {
      return "externalSSD";
    }
    if (media.includes("hdd") || media.includes("hard")) return "externalHDD";
    if (Number(meta.capacityBytes) >= 500 * 1024 ** 3) return "externalHDD";
    // Camera cards / portable SSDs under ~500GB
    return removable || Number(meta.capacityBytes) < 500 * 1024 ** 3
      ? "removable"
      : "externalSSD";
  }
  if (letter === "C") return "internal";
  // Do NOT treat non-C "SSD" as internal — CF cards and readers are often Fixed+SSD.
  if (media.includes("ssd")) return "unknown";
  if (media.includes("hdd") || media.includes("hard")) return "externalHDD";
  return "unknown";
}

async function listWindowsVolumes() {
  try {
    const { execFile } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const execFileAsync = promisify(execFile);
    const ps = `
$ErrorActionPreference = 'SilentlyContinue'
Get-Volume | Where-Object { $_.DriveLetter } | ForEach-Object {
  $letter = $_.DriveLetter
  $part = Get-Partition -DriveLetter $letter
  $disk = if ($part) { Get-Disk -Number $part.DiskNumber } else { $null }
  $serial = if ($disk -and $disk.SerialNumber) { [string]$disk.SerialNumber } else { '' }
  $unique = if ($_.UniqueId) { [string]$_.UniqueId } else { '' }
  [PSCustomObject]@{
    letter = "$letter"
    volumeLabel = $_.FileSystemLabel
    driveType = [string]$_.DriveType
    availableBytes = [int64]$_.SizeRemaining
    capacityBytes = [int64]$_.Size
    busType = if ($disk) { [string]$disk.BusType } else { '' }
    mediaType = if ($disk) { [string]$disk.MediaType } else { '' }
    friendlyName = if ($disk) { [string]$disk.FriendlyName } else { '' }
    serial = if ($serial) { $serial } else { $unique }
    removable = ([string]$_.DriveType -match 'Removable')
  }
} | ConvertTo-Json -Compress
`.trim();
    const { stdout } = await execFileAsync(
      "powershell",
      ["-NoProfile", "-Command", ps],
      { encoding: "utf8", windowsHide: true, timeout: 12000, maxBuffer: 2 * 1024 * 1024 }
    );
    const raw = String(stdout || "").trim();
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const rows = Array.isArray(parsed) ? parsed : [parsed];
    const out = [];
    for (const row of rows) {
      const letter = String(row.letter || "").toUpperCase();
      if (!letter || letter.length !== 1) continue;
      const root = `${letter}:\\`;
      try {
        await fs.access(root);
      } catch {
        continue;
      }
      const storageType = await classifyWinDrive(row);
      const volumeLabel = String(row.volumeLabel || "").trim();
      out.push({
        path: root,
        label: volumeLabel || `${letter}:`,
        kind: "drive",
        volumeLabel: volumeLabel || undefined,
        availableBytes: Number.isFinite(Number(row.availableBytes))
          ? Number(row.availableBytes)
          : undefined,
        capacityBytes: Number.isFinite(Number(row.capacityBytes))
          ? Number(row.capacityBytes)
          : undefined,
        driveType: row.driveType || undefined,
        busType: row.busType || undefined,
        mediaType: row.mediaType || undefined,
        removable: Boolean(row.removable),
        volumeIdentifier: row.serial ? String(row.serial).trim() : undefined,
        storageType,
      });
    }
    return out;
  } catch {
    return [];
  }
}

async function listDrives() {
  const drives = [];
  if (process.platform === "win32") {
    const enriched = await listWindowsVolumes();
    if (enriched.length) {
      drives.push(...enriched);
    } else {
      for (const letter of "CDEFGHIJKLMNOPQRSTUVWXYZ") {
        const root = `${letter}:\\`;
        try {
          await fs.access(root);
          drives.push({
            path: root,
            label: `${letter}:`,
            kind: "drive",
            storageType: letter === "C" ? "internal" : "unknown",
          });
        } catch {
          /* skip */
        }
      }
    }
  } else {
    drives.push({ path: "/", label: "/", kind: "volume", storageType: "internal" });
    try {
      const vols = await fs.readdir("/Volumes");
      for (const v of vols) {
        drives.push({
          path: path.join("/Volumes", v),
          label: v,
          kind: "volume",
          volumeLabel: v,
          storageType: "unknown",
        });
      }
    } catch {
      /* ignore */
    }
  }

  const home = os.homedir();
  if (home) {
    drives.push({ path: home, label: "Home", kind: "home", storageType: "internal" });
    for (const [name, kind] of [
      ["Desktop", "desktop"],
      ["Documents", "documents"],
      ["Videos", "videos"],
      ["Movies", "videos"],
    ]) {
      const folder = path.join(home, name);
      // Only offer folders Node can actually list (skips broken junctions).
      if (await canReadDir(folder)) {
        drives.push({ path: folder, label: name, kind, storageType: "internal" });
      }
    }
  }
  return drives;
}

async function listDirectory(dirPath) {
  assertSafePath(dirPath);
  let resolved = path.resolve(dirPath);
  assertSafePath(resolved);

  const redirected = redirectWindowsJunction(resolved);
  if (redirected && (await canReadDir(redirected))) {
    resolved = path.resolve(redirected);
  }

  let names;
  try {
    const st = await fs.stat(resolved);
    if (!st.isDirectory()) throw new Error("Not a directory");
    names = await fs.readdir(resolved);
  } catch (e) {
    const code = e && typeof e === "object" && "code" in e ? e.code : "";
    if (code === "EPERM" || code === "EACCES") {
      const alt = redirectWindowsJunction(resolved);
      if (alt && (await canReadDir(alt))) {
        resolved = path.resolve(alt);
        names = await fs.readdir(resolved);
      } else {
        throw new Error(
          "Windows blocked that folder (common for Documents\\My Videos). Use Videos, Desktop, or an external drive instead."
        );
      }
    } else {
      throw e;
    }
  }

  const entries = [];
  for (const name of names) {
    if (name.startsWith(".")) continue;
    if (SKIP_DIR_NAMES.has(name.toLowerCase())) continue;
    const full = path.join(resolved, name);
    try {
      const lst = await fs.lstat(full);
      if (lst.isSymbolicLink()) continue;
      if (lst.isDirectory()) {
        entries.push({ name, path: full, kind: "dir" });
      }
    } catch {
      /* skip inaccessible */
    }
  }
  entries.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));

  const parent = path.dirname(resolved);
  const parentPath =
    parent && parent !== resolved && !containsTraversal(parent) ? parent : null;

  return { path: resolved, parentPath, entries };
}

function sha256File(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fssync.createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

async function storageStat(targetPath) {
  assertSafePath(targetPath);
  const resolved = path.resolve(targetPath);
  /** Windows drive root like E:\ — used to detect unplugged volumes (V16). */
  const driveRoot =
    process.platform === "win32" && /^[A-Za-z]:/.test(resolved)
      ? `${resolved.slice(0, 2)}\\`
      : null;

  if (driveRoot) {
    try {
      await fs.access(driveRoot);
    } catch {
      return {
        path: resolved,
        online: false,
        writable: false,
        exists: false,
        reason: "drive_offline",
      };
    }
  }

  let exists = true;
  let checkPath = resolved;
  try {
    await fs.access(resolved);
  } catch {
    exists = false;
    checkPath = path.dirname(resolved);
    if (driveRoot) {
      try {
        await fs.access(checkPath);
      } catch {
        checkPath = driveRoot;
      }
    }
  }

  try {
    const st = await fs.statfs(checkPath);
    const availableBytes = Number(st.bavail) * Number(st.bsize);
    const capacityBytes = Number(st.blocks) * Number(st.bsize);
    return {
      path: resolved,
      availableBytes,
      capacityBytes,
      online: true,
      writable: true,
      exists,
    };
  } catch {
    // Older Node / Windows fallback via PowerShell
    if (process.platform === "win32") {
      const drive = resolved.slice(0, 2);
      try {
        const { execSync } = await import("node:child_process");
        const out = execSync(
          `powershell -NoProfile -Command "(Get-PSDrive -Name '${drive[0]}').Free;(Get-PSDrive -Name '${drive[0]}').Used"`,
          { encoding: "utf8" }
        )
          .trim()
          .split(/\r?\n/);
        const free = Number(out[0]);
        const used = Number(out[1]);
        return {
          path: resolved,
          availableBytes: Number.isFinite(free) ? free : undefined,
          capacityBytes:
            Number.isFinite(free) && Number.isFinite(used) ? free + used : undefined,
          online: true,
          writable: true,
          exists,
        };
      } catch {
        return {
          path: resolved,
          online: false,
          writable: false,
          exists: false,
          reason: "drive_offline",
        };
      }
    }
    return { path: resolved, online: true, writable: true, exists };
  }
}

function sanitizeCameraLabel(label) {
  const cleaned = String(label || "CAMERA_A")
    .replace(/[^\w\-]+/g, "_")
    .toUpperCase()
    .trim();
  return cleaned || "CAMERA_A";
}

/**
 * Copy one file with checksum verification. Never deletes the source.
 */
async function copyVerified(sourcePath, destPath) {
  assertSafePath(sourcePath);
  assertSafePath(destPath);
  const src = path.resolve(sourcePath);
  const dest = path.resolve(destPath);
  if (!(await fs.stat(src)).isFile()) throw new Error("Source is not a file");
  await fs.mkdir(path.dirname(dest), { recursive: true });

  const sourceChecksum = await sha256File(src);
  await fs.copyFile(src, dest);
  const destChecksum = await sha256File(dest);
  if (sourceChecksum !== destChecksum) {
    try {
      await fs.unlink(dest);
    } catch {
      /* keep failed dest for diagnostics */
    }
    throw new Error("Checksum mismatch after copy — destination removed when possible");
  }
  const st = await fs.stat(dest);
  return {
    sourcePath: src,
    destPath: dest,
    sizeBytes: st.size,
    checksum: destChecksum,
    checksumAlgorithm: "sha256",
    verified: true,
  };
}

/**
 * Batch verified copies (archive / restore). Never deletes sources.
 */
async function copyVerifiedBatch(body) {
  const files = Array.isArray(body.files) ? body.files : [];
  if (!files.length) throw new Error("No files to copy");
  if (files.length > 500) throw new Error("Max 500 files per batch");

  const results = [];
  let okCount = 0;
  let failedCount = 0;
  for (const f of files) {
    try {
      if (!f?.sourcePath || !f?.destPath) {
        throw new Error("sourcePath and destPath required");
      }
      const copied = await copyVerified(f.sourcePath, f.destPath);
      results.push({
        ok: true,
        id: f.id || null,
        ...copied,
      });
      okCount += 1;
    } catch (e) {
      results.push({
        ok: false,
        id: f?.id || null,
        sourcePath: f?.sourcePath || "",
        destPath: f?.destPath || "",
        error: e instanceof Error ? e.message : "Copy failed",
      });
      failedCount += 1;
    }
  }
  return { ok: true, count: okCount, failedCount, results };
}

function isPathUnderRoot(root, candidate) {
  const rel = path.relative(path.resolve(root), path.resolve(candidate));
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

function isDriveRoot(p) {
  const resolved = path.resolve(p);
  const parsed = path.parse(resolved);
  // e.g. C:\ or /
  return path.normalize(parsed.root) === path.normalize(resolved);
}

/**
 * Delete files only under projectRoot after explicit confirm phrase.
 * Never formats drives. Never deletes archive paths listed in neverDeletePaths.
 * Camera cards outside projectRoot are rejected.
 */
async function safeDeleteFiles(body) {
  const confirmPhrase = String(body.confirmPhrase || "").trim();
  if (confirmPhrase !== "DELETE_ACTIVE_COPY") {
    throw new Error('confirmPhrase must be exactly "DELETE_ACTIVE_COPY"');
  }
  const projectRoot = path.resolve(body.projectRoot || "");
  assertSafePath(projectRoot);
  if (isDriveRoot(projectRoot)) throw new Error("Refusing projectRoot that looks like a drive root");

  const neverDelete = new Set(
    (Array.isArray(body.neverDeletePaths) ? body.neverDeletePaths : [])
      .map((p) => path.resolve(String(p)).toLowerCase())
  );

  const files = Array.isArray(body.files) ? body.files : [];
  if (!files.length) throw new Error("No files to delete");
  if (files.length > 500) throw new Error("Max 500 files per delete batch");

  const results = [];
  let okCount = 0;
  let failedCount = 0;
  for (const f of files) {
    const filePath = path.resolve(f.path || f.filePath || "");
    try {
      assertSafePath(filePath);
      if (isDriveRoot(filePath)) {
        throw new Error(`Refusing to delete drive root: ${filePath}`);
      }
      if (!isPathUnderRoot(projectRoot, filePath)) {
        throw new Error(
          `Refusing delete outside project root (camera cards never erased): ${filePath}`
        );
      }
      if (neverDelete.has(filePath.toLowerCase())) {
        throw new Error(`Refusing to delete protected path (archive): ${filePath}`);
      }
      const st = await fs.stat(filePath);
      if (!st.isFile()) throw new Error(`Not a file: ${filePath}`);
      if (f.expectedChecksum) {
        const checksum = await sha256File(filePath);
        if (checksum !== f.expectedChecksum) {
          throw new Error(`Checksum mismatch before delete: ${filePath}`);
        }
      }
      await fs.unlink(filePath);
      results.push({
        ok: true,
        id: f.id || null,
        path: filePath,
        deleted: true,
      });
      okCount += 1;
    } catch (e) {
      results.push({
        ok: false,
        id: f?.id || null,
        path: filePath || undefined,
        error: e instanceof Error ? e.message : "Delete failed",
      });
      failedCount += 1;
    }
  }
  return { ok: true, count: okCount, failedCount, results };
}

const RESOLVE_HANDOFF_REL = path.join("03_PROJECT_FILES", "shootspine_resolve");

async function pathExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * Feature-detect local DaVinci Resolve install + scripting modules.
 * Never assumes Resolve shares a machine with the AI Editor.
 */
async function detectResolveInstall() {
  const platform = os.platform();
  let appPath;
  let scriptingApiPath;
  let scriptingLibPath;

  if (platform === "win32") {
    const pf = process.env.PROGRAMFILES || "C:\\Program Files";
    const pf86 = process.env["PROGRAMFILES(X86)"] || "C:\\Program Files (x86)";
    const pd = process.env.PROGRAMDATA || "C:\\ProgramData";
    const candidates = [
      path.join(pf, "Blackmagic Design", "DaVinci Resolve", "Resolve.exe"),
      path.join(pf, "Blackmagic Design", "DaVinci Resolve", "DaVinci Resolve.exe"),
      path.join(pf86, "Blackmagic Design", "DaVinci Resolve", "Resolve.exe"),
      path.join(pf86, "Blackmagic Design", "DaVinci Resolve", "DaVinci Resolve.exe"),
    ];
    for (const c of candidates) {
      if (await pathExists(c)) {
        appPath = c;
        break;
      }
    }
    scriptingApiPath = path.join(
      pd,
      "Blackmagic Design",
      "DaVinci Resolve",
      "Support",
      "Developer",
      "Scripting"
    );
    scriptingLibPath = path.join(pf, "Blackmagic Design", "DaVinci Resolve", "fusionscript.dll");
  } else if (platform === "darwin") {
    appPath = "/Applications/DaVinci Resolve/DaVinci Resolve.app";
    if (!(await pathExists(appPath))) appPath = undefined;
    scriptingApiPath =
      "/Library/Application Support/Blackmagic Design/DaVinci Resolve/Developer/Scripting";
    scriptingLibPath =
      "/Applications/DaVinci Resolve/DaVinci Resolve.app/Contents/Libraries/Fusion/fusionscript.so";
  } else {
    appPath = (await pathExists("/opt/resolve/bin/resolve")) ? "/opt/resolve/bin/resolve" : undefined;
    scriptingApiPath = "/opt/resolve/Developer/Scripting";
    scriptingLibPath = "/opt/resolve/libs/Fusion/fusionscript.so";
  }

  const scriptingAvailable =
    Boolean(scriptingApiPath && scriptingLibPath) &&
    (await pathExists(scriptingApiPath)) &&
    (await pathExists(scriptingLibPath));

  const installed = Boolean(appPath);
  let note;
  if (installed && scriptingAvailable) {
    note = "Resolve found with scripting modules — Open in Resolve can launch the app.";
  } else if (installed) {
    note =
      "Resolve found. Scripting modules missing or free edition — launch works; use EDL import or Mac companion.";
  } else {
    note =
      "Resolve not on this machine. Write the handoff package and sync to the Mac (see OPEN_ON_MAC.txt).";
  }

  return {
    installed,
    platform: platform === "win32" || platform === "darwin" || platform === "linux" ? platform : "unknown",
    appPath,
    scriptingAvailable,
    scriptingApiPath: scriptingApiPath && (await pathExists(scriptingApiPath)) ? scriptingApiPath : undefined,
    scriptingLibPath: scriptingLibPath && (await pathExists(scriptingLibPath)) ? scriptingLibPath : undefined,
    note,
  };
}

function parseSmpteToFrames(tc, frameRate) {
  const m = String(tc || "")
    .trim()
    .match(/^(\d{1,2}):(\d{2}):(\d{2})[:;](\d{2})$/);
  if (!m) return null;
  const fps = Math.max(1, Math.round(Number(frameRate) || 24));
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  const ss = Number(m[3]);
  const ff = Number(m[4]);
  if ([hh, mm, ss, ff].some((n) => !Number.isFinite(n))) return null;
  if (mm >= 60 || ss >= 60 || ff >= fps) return null;
  return ((hh * 60 + mm) * 60 + ss) * fps + ff;
}

function framesToSmpte(frames, frameRate) {
  const fps = Math.max(1, Math.round(Number(frameRate) || 24));
  const total = Math.max(0, Math.floor(frames));
  const ff = total % fps;
  const totalSeconds = Math.floor(total / fps);
  const ss = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const mm = totalMinutes % 60;
  const hh = Math.floor(totalMinutes / 60);
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(hh)}:${pad(mm)}:${pad(ss)}:${pad(ff)}`;
}

async function findOriginalMediaFile(projectRoot, relPath, filename) {
  const tries = [];
  if (relPath) {
    const rel = String(relPath).replace(/^[\\/]+/, "").replace(/\\/g, "/");
    tries.push(path.resolve(projectRoot, ...rel.split("/").filter(Boolean)));
  }
  if (filename) {
    const base = path.basename(filename);
    tries.push(path.resolve(projectRoot, "01_ORIGINAL_MEDIA", base));
    for (const cam of ["CAMERA_A", "CAMERA_B", "FX3", "OTHER", "DRONE"]) {
      tries.push(path.resolve(projectRoot, "01_ORIGINAL_MEDIA", cam, base));
    }
  }
  for (const candidate of tries) {
    try {
      assertSafePath(candidate);
      if (await pathExists(candidate)) return candidate;
    } catch {
      /* skip */
    }
  }
  // Last resort: shallow search under 01_ORIGINAL_MEDIA
  if (filename) {
    const root = path.resolve(projectRoot, "01_ORIGINAL_MEDIA");
    const want = path.basename(filename).toLowerCase();
    try {
      assertSafePath(root);
      if (await pathExists(root)) {
        const cams = await fs.readdir(root);
        for (const cam of cams) {
          const full = path.join(root, cam, path.basename(filename));
          try {
            if ((await fs.stat(full)).isFile() && path.basename(full).toLowerCase() === want) {
              return full;
            }
          } catch {
            /* skip */
          }
        }
      }
    } catch {
      /* skip */
    }
  }
  return null;
}

/**
 * Rewrite EDL source in/out using each clip’s embedded Start TC (FX3/XAVC).
 * ShootSpine edits are file-relative; Resolve links against camera TC.
 */
async function alignEdlToCameraTimecode(edlText, projectRoot) {
  const lines = String(edlText || "").split(/\r?\n/);
  // Cut:  … C        00:00:00:00 …
  // Dissolve: … D    030 00:00:00:00 …
  // Do not let an optional dissolve group swallow TC digits (e.g. "00").
  const eventRe =
    /^(\d{3})\s+(\S+)\s+(\S+)\s+(C|D)(?:\s+(\d{3}))?\s+(\d{2}:\d{2}:\d{2}[:;]\d{2})\s+(\d{2}:\d{2}:\d{2}[:;]\d{2})\s+(\d{2}:\d{2}:\d{2}[:;]\d{2})\s+(\d{2}:\d{2}:\d{2}[:;]\d{2})\s*$/;
  let fps = 24;
  let aligned = 0;
  let i = 0;
  while (i < lines.length) {
    const m = lines[i].match(eventRe);
    if (!m) {
      i += 1;
      continue;
    }
    let j = i + 1;
    let relPath = "";
    let clipName = "";
    while (j < lines.length && lines[j].startsWith("*")) {
      const rel = lines[j].match(/^\*\s*SHOOTSPINE_REL_PATH:\s*(.+)\s*$/i);
      if (rel) relPath = rel[1].trim();
      const from = lines[j].match(/^\*\s*FROM CLIP NAME:\s*(.+)\s*$/i);
      if (from) clipName = from[1].trim();
      j += 1;
    }
    const mediaPath = await findOriginalMediaFile(projectRoot, relPath, clipName || m[2]);
    if (mediaPath) {
      try {
        const probed = await probeFile(mediaPath);
        const startTc = probed?.startTimecode;
        const mediaFps = Number(probed?.frameRate) || fps;
        const offset = parseSmpteToFrames(startTc, mediaFps);
        if (offset != null && offset > 0) {
          const srcIn = parseSmpteToFrames(m[6], mediaFps);
          const srcOut = parseSmpteToFrames(m[7], mediaFps);
          if (srcIn != null && srcOut != null && srcIn < offset) {
            const dissolvePad = (m[5] || "").trim();
            const newIn = framesToSmpte(offset + srcIn, mediaFps);
            const newOut = framesToSmpte(offset + srcOut, mediaFps);
            const reel = String(m[2]).padEnd(8).slice(0, 8);
            const track = String(m[3]).padEnd(5);
            if (m[4] === "C") {
              lines[i] = `${m[1]}  ${reel} ${track} C        ${newIn} ${newOut} ${m[8]} ${m[9]}`;
            } else {
              lines[i] =
                `${m[1]}  ${reel} ${track} D    ${String(dissolvePad || "001").padStart(3, "0")} ${newIn} ${newOut} ${m[8]} ${m[9]}`;
            }
            aligned += 1;
          }
        }
      } catch {
        /* leave event unchanged */
      }
    }
    i = j;
  }
  return { edl: lines.join("\n"), aligned };
}

/**
 * Drop EDL events whose media file is missing on disk, and close the record-side gap
 * so later clips don’t sit after an offline hole (e.g. C0042 never ingested).
 */
async function stripMissingMediaFromEdl(edlText, projectRoot) {
  const lines = String(edlText || "").split(/\r?\n/);
  const eventRe =
    /^(\d{3})\s+(\S+)\s+(\S+)\s+(C|D)(?:\s+(\d{3}))?\s+(\d{2}:\d{2}:\d{2}[:;]\d{2})\s+(\d{2}:\d{2}:\d{2}[:;]\d{2})\s+(\d{2}:\d{2}:\d{2}[:;]\d{2})\s+(\d{2}:\d{2}:\d{2}[:;]\d{2})\s*$/;
  const blocks = [];
  let i = 0;
  let preamble = [];
  let sawEvent = false;
  while (i < lines.length) {
    const m = lines[i].match(eventRe);
    if (!m) {
      if (!sawEvent) preamble.push(lines[i]);
      i += 1;
      continue;
    }
    sawEvent = true;
    let j = i + 1;
    const meta = [];
    let relPath = "";
    let clipName = "";
    while (j < lines.length && lines[j].startsWith("*")) {
      meta.push(lines[j]);
      const rel = lines[j].match(/^\*\s*SHOOTSPINE_REL_PATH:\s*(.+)\s*$/i);
      if (rel) relPath = rel[1].trim();
      const from = lines[j].match(/^\*\s*FROM CLIP NAME:\s*(.+)\s*$/i);
      if (from) clipName = from[1].trim();
      j += 1;
    }
    const mediaPath = await findOriginalMediaFile(projectRoot, relPath, clipName || m[2]);
    blocks.push({
      line: lines[i],
      meta,
      match: m,
      exists: Boolean(mediaPath),
      mediaPath,
    });
    i = j;
  }

  const kept = blocks.filter((b) => b.exists);
  const removed = blocks.length - kept.length;
  if (!removed) {
    return { edl: edlText, removed: 0, kept: kept.length };
  }

  let fps = 24;
  const fcm = preamble.find((l) => /FCM:/i.test(l));
  if (fcm && /DROP FRAME/i.test(fcm) && !/NON-DROP/i.test(fcm)) {
    fps = 29.97;
  }

  let recordCursor = 0;
  const out = [...preamble];
  for (let n = 0; n < kept.length; n += 1) {
    const b = kept[n];
    const m = b.match;
    const srcIn = m[6];
    const srcOut = m[7];
    const oldRecIn = parseSmpteToFrames(m[8], fps);
    const oldRecOut = parseSmpteToFrames(m[9], fps);
    const dur =
      oldRecIn != null && oldRecOut != null && oldRecOut > oldRecIn
        ? oldRecOut - oldRecIn
        : 0;
    const recIn = framesToSmpte(recordCursor, fps);
    const recOut = framesToSmpte(recordCursor + dur, fps);
    recordCursor += dur;
    const reel = String(m[2]).padEnd(8).slice(0, 8);
    const track = String(m[3]).padEnd(5);
    const num = String(n + 1).padStart(3, "0");
    if (m[4] === "C") {
      out.push(`${num}  ${reel} ${track} C        ${srcIn} ${srcOut} ${recIn} ${recOut}`);
    } else {
      const dissolvePad = (m[5] || "001").trim();
      out.push(
        `${num}  ${reel} ${track} D    ${String(dissolvePad).padStart(3, "0")} ${srcIn} ${srcOut} ${recIn} ${recOut}`
      );
    }
    // Rewrite REL_PATH comments to the path we actually found on disk.
    for (const metaLine of b.meta) {
      if (/^\*\s*SHOOTSPINE_REL_PATH:/i.test(metaLine) && b.mediaPath && projectRoot) {
        const rel = path
          .relative(projectRoot, b.mediaPath)
          .split(path.sep)
          .join("/");
        out.push(`* SHOOTSPINE_REL_PATH: ${rel}`);
      } else {
        out.push(metaLine);
      }
    }
  }
  if (out.length && out[out.length - 1] !== "") out.push("");
  return { edl: out.join("\n"), removed, kept: kept.length };
}

/**
 * Write text handoff files under projectRoot/03_PROJECT_FILES/shootspine_resolve.
 * Text only — never copies camera media.
 */
async function writeResolveHandoff(body) {
  const projectRoot = path.resolve(body.projectRoot || "");
  assertSafePath(projectRoot);
  if (!(await pathExists(projectRoot))) throw new Error("projectRoot does not exist");

  const relDir = String(body.relativeDir || RESOLVE_HANDOFF_REL).replace(/\\/g, "/");
  if (relDir.includes("..")) throw new Error("Invalid relativeDir");
  const destDir = path.resolve(projectRoot, ...relDir.split("/").filter(Boolean));
  const relCheck = path.relative(projectRoot, destDir);
  if (relCheck.startsWith("..") || path.isAbsolute(relCheck)) {
    throw new Error("Refusing to write handoff outside project root");
  }

  const files = body.files && typeof body.files === "object" ? body.files : {};
  const names = Object.keys(files);
  if (!names.length) throw new Error("No files to write");
  if (names.length > 40) throw new Error("Max 40 handoff files");

  await fs.mkdir(destDir, { recursive: true });
  const written = [];
  let edlAligned = 0;
  for (const name of names) {
    const base = path.basename(String(name));
    if (!base || base !== name.replace(/\\/g, "/").split("/").pop()) {
      throw new Error(`Invalid handoff filename: ${name}`);
    }
    if (!/\.(edl|json|txt|py|md)$/i.test(base)) {
      throw new Error(`Unsupported handoff file type: ${base}`);
    }
    let content = String(files[name] ?? "");
    if (content.length > 5_000_000) throw new Error(`File too large: ${base}`);
    if (/\.edl$/i.test(base)) {
      try {
        const aligned = await alignEdlToCameraTimecode(content, projectRoot);
        content = aligned.edl;
        edlAligned = aligned.aligned;
      } catch {
        /* keep original EDL */
      }
      try {
        const stripped = await stripMissingMediaFromEdl(content, projectRoot);
        content = stripped.edl;
      } catch {
        /* keep EDL as-aligned */
      }
    }
    if (/handoff\.json$/i.test(base)) {
      try {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed.media)) {
          const nextMedia = [];
          for (const item of parsed.media) {
            const found = await findOriginalMediaFile(
              projectRoot,
              item?.relativeProjectPath,
              item?.filename
            );
            if (!found) continue;
            const rel = path.relative(projectRoot, found).split(path.sep).join("/");
            nextMedia.push({
              ...item,
              resolvedPath: found,
              relativeProjectPath: rel,
            });
          }
          parsed.media = nextMedia;
          content = `${JSON.stringify(parsed, null, 2)}\n`;
        }
      } catch {
        /* keep original JSON */
      }
    }
    const dest = path.join(destDir, base);
    await fs.writeFile(dest, content, "utf8");
    written.push(base);
  }

  return {
    ok: true,
    handoffDir: destDir,
    relativeDir: relDir,
    written,
    edlAligned,
  };
}

/**
 * Rename/move a project folder on the same volume (Windows rename fails across drives).
 * Used when the ShootSpine project name changes so disk paths stay aligned.
 */
async function renameDirectory(fromPath, toPath) {
  assertSafePath(fromPath);
  assertSafePath(toPath);
  const from = path.resolve(fromPath);
  const to = path.resolve(toPath);
  if (from.toLowerCase() === to.toLowerCase()) {
    return { ok: true, from, to, renamed: false, reason: "same_path" };
  }
  if (!(await pathExists(from))) {
    throw new Error(`Source folder not found: ${from}`);
  }
  const st = await fs.stat(from);
  if (!st.isDirectory()) throw new Error("Source is not a folder");
  if (await pathExists(to)) {
    throw new Error(`Destination already exists: ${to}`);
  }
  // Refuse drive-letter changes (would need a full copy)
  if (process.platform === "win32") {
    const fromDrive = from.slice(0, 2).toLowerCase();
    const toDrive = to.slice(0, 2).toLowerCase();
    if (/^[a-z]:$/.test(fromDrive) && /^[a-z]:$/.test(toDrive) && fromDrive !== toDrive) {
      throw new Error(
        `Cannot rename across drives (${fromDrive} → ${toDrive}). Copy footage to the SSD project folder instead.`
      );
    }
  }
  await fs.mkdir(path.dirname(to), { recursive: true });
  try {
    await fs.rename(from, to);
  } catch (e) {
    const code = e && typeof e === "object" && "code" in e ? e.code : "";
    throw new Error(
      code === "EXDEV"
        ? "Cannot move folder across disks — use Copy footage onto your SSD instead."
        : e.message || "Could not rename folder"
    );
  }
  return { ok: true, from, to, renamed: true };
}

function revealInFileManager(targetPath) {
  return new Promise(async (resolve, reject) => {
    try {
      assertSafePath(targetPath);
      const abs = path.resolve(targetPath);
      if (!(await pathExists(abs))) {
        throw new Error(
          `Folder not found on this PC: ${abs}. Save the edit package again (or check the project drive is plugged in).`
        );
      }
      const platform = os.platform();
      if (platform === "win32") {
        // Prefer highlighting the EDL when revealing the handoff folder.
        let selectPath = abs;
        try {
          const st = await fs.stat(abs);
          if (st.isDirectory()) {
            const edl = path.join(abs, "shootspine_rough_cut.edl");
            if (await pathExists(edl)) selectPath = edl;
          }
        } catch {
          /* open folder as-is */
        }
        const args =
          selectPath.toLowerCase() === abs.toLowerCase()
            ? [abs]
            : [`/select,${selectPath}`];
        const child = spawn("explorer.exe", args, {
          detached: true,
          stdio: "ignore",
          windowsHide: true,
        });
        child.unref();
        resolve({
          ok: true,
          revealed: abs,
          selected: selectPath !== abs ? selectPath : undefined,
          method: "explorer",
        });
      } else if (platform === "darwin") {
        const child = spawn("open", [abs], { detached: true, stdio: "ignore" });
        child.unref();
        resolve({ ok: true, revealed: abs, method: "open" });
      } else {
        const child = spawn("xdg-open", [abs], { detached: true, stdio: "ignore" });
        child.unref();
        resolve({ ok: true, revealed: abs, method: "xdg-open" });
      }
    } catch (e) {
      reject(e);
    }
  });
}

function isResolveProcessRunning() {
  return new Promise((resolve) => {
    if (os.platform() === "win32") {
      const child = spawn(
        "powershell.exe",
        [
          "-NoProfile",
          "-Command",
          "if (Get-Process -Name Resolve -ErrorAction SilentlyContinue) { '1' } else { '0' }",
        ],
        { windowsHide: true }
      );
      let out = "";
      child.stdout?.on("data", (d) => {
        out += String(d);
      });
      child.on("error", () => resolve(false));
      child.on("close", () => resolve(out.trim() === "1"));
      return;
    }
    if (os.platform() === "darwin") {
      const child = spawn("pgrep", ["-f", "DaVinci Resolve"], { windowsHide: true });
      child.on("error", () => resolve(false));
      child.on("close", (code) => resolve(code === 0));
      return;
    }
    resolve(false);
  });
}

/**
 * Bring an existing Resolve window to the foreground on Windows.
 * Start-Process alone often fails to focus when Resolve is already open.
 */
function focusResolveWindowWindows() {
  return new Promise((resolve) => {
    const ps = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class ShootSpineFocus {
  [DllImport("user32.dll")] public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
  [DllImport("kernel32.dll")] public static extern uint GetCurrentThreadId();
  [DllImport("user32.dll")] public static extern bool AttachThreadInput(uint idAttach, uint idAttachTo, bool fAttach);
  public static bool Focus(IntPtr hWnd) {
    if (hWnd == IntPtr.Zero) return false;
    if (IsIconic(hWnd)) ShowWindowAsync(hWnd, 9);
    else ShowWindowAsync(hWnd, 5);
    IntPtr fg = GetForegroundWindow();
    uint fgPid;
    uint fgTid = GetWindowThreadProcessId(fg, out fgPid);
    uint cur = GetCurrentThreadId();
    AttachThreadInput(cur, fgTid, true);
    bool ok = SetForegroundWindow(hWnd);
    AttachThreadInput(cur, fgTid, false);
    return ok;
  }
}
"@
$p = Get-Process -Name Resolve -ErrorAction SilentlyContinue |
  Where-Object { $_.MainWindowHandle -ne [IntPtr]::Zero } |
  Select-Object -First 1
if (-not $p) {
  # Splash sometimes has no MainWindowHandle yet — still report process alive
  if (Get-Process -Name Resolve -ErrorAction SilentlyContinue) {
    Write-Output "NO_WINDOW|PROCESS"
  } else {
    Write-Output "NO_WINDOW"
  }
  exit 0
}
$title = $p.MainWindowTitle
$ok = [ShootSpineFocus]::Focus($p.MainWindowHandle)
if (-not $ok) {
  try {
    $wshell = New-Object -ComObject WScript.Shell
    $ok = [bool]$wshell.AppActivate($p.Id)
  } catch { $ok = $false }
}
if ($ok) { Write-Output ("FOCUSED|" + $title) } else { Write-Output ("FOCUS_FAIL|" + $title) }
`;
    const child = spawn("powershell.exe", ["-NoProfile", "-Command", ps], {
      windowsHide: true,
    });
    let out = "";
    child.stdout?.on("data", (d) => {
      out += String(d);
    });
    child.on("error", () => resolve({ ok: false, reason: "powershell_error" }));
    child.on("close", () => {
      const line = out.trim().split(/\r?\n/).filter(Boolean).pop() || "";
      if (line.startsWith("FOCUSED|")) {
        resolve({ ok: true, title: line.slice("FOCUSED|".length) || undefined });
      } else if (line.startsWith("FOCUS_FAIL|")) {
        resolve({
          ok: false,
          reason: "focus_blocked",
          title: line.slice("FOCUS_FAIL|".length) || undefined,
        });
      } else if (line.startsWith("NO_WINDOW")) {
        resolve({
          ok: false,
          reason: line.includes("PROCESS") ? "splash_starting" : "no_window",
        });
      } else {
        resolve({ ok: false, reason: "unknown" });
      }
    });
  });
}

function waitForResolveProcess(timeoutMs = 12000, intervalMs = 500) {
  const started = Date.now();
  return new Promise(async (resolve) => {
    while (Date.now() - started < timeoutMs) {
      if (await isResolveProcessRunning()) {
        resolve(true);
        return;
      }
      await new Promise((r) => setTimeout(r, intervalMs));
    }
    resolve(false);
  });
}

/**
 * Launch a GUI app via Windows ShellExecute.
 * Avoid windowsHide/detached PowerShell — that often reports success without starting Resolve.
 */
async function launchWindowsGuiApp(exePath) {
  const abs = path.resolve(exePath);
  const cwd = path.dirname(abs);

  const tryCmdStart = () =>
    new Promise((resolve, reject) => {
      // `start ""` uses ShellExecute — most reliable for Resolve.exe from a service.
      const child = spawn("cmd.exe", ["/c", "start", "", "/D", cwd, abs], {
        detached: true,
        stdio: "ignore",
        windowsHide: false,
      });
      child.on("error", reject);
      child.on("close", (code) => {
        if (code === 0 || code === null) resolve(true);
        else reject(new Error(`cmd start exited ${code}`));
      });
      child.unref();
    });

  const tryPowerShell = () =>
    new Promise((resolve, reject) => {
      const child = spawn(
        "powershell.exe",
        [
          "-NoProfile",
          "-WindowStyle",
          "Hidden",
          "-Command",
          `Start-Process -FilePath ${JSON.stringify(abs)} -WorkingDirectory ${JSON.stringify(cwd)}`,
        ],
        { detached: false, stdio: "ignore", windowsHide: false }
      );
      child.on("error", reject);
      child.on("close", (code) => {
        if (code === 0 || code === null) resolve(true);
        else reject(new Error(`Start-Process exited ${code}`));
      });
    });

  const tryExplorer = () =>
    new Promise((resolve, reject) => {
      const child = spawn("explorer.exe", [abs], {
        detached: true,
        stdio: "ignore",
        windowsHide: false,
      });
      child.on("error", reject);
      child.on("spawn", () => {
        child.unref();
        resolve(true);
      });
    });

  // Prefer cmd start first — powershell+windowsHide was a silent no-op on this PC.
  try {
    await tryCmdStart();
    return "cmd_start";
  } catch {
    /* try next */
  }
  try {
    await tryPowerShell();
    return "powershell";
  } catch {
    await tryExplorer();
    return "explorer";
  }
}

function runProcessCapture(bin, args, opts = {}, timeoutMs = 20000) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      try {
        child.kill();
      } catch {
        /* ignore */
      }
      resolve(result);
    };
    const child = spawn(bin, args, {
      windowsHide: true,
      ...opts,
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => finish({ ok: false, code: -1, stdout, stderr, timedOut: true }), timeoutMs);
    child.stdout?.on("data", (d) => {
      stdout += String(d);
    });
    child.stderr?.on("data", (d) => {
      stderr += String(d);
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      finish({ ok: false, code: -1, stdout, stderr, error: err.message });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      finish({ ok: code === 0, code: code ?? -1, stdout, stderr, timedOut: false });
    });
  });
}

async function findPythonLauncher() {
  if (os.platform() === "win32") {
    const py = await runProcessCapture("py", ["-3", "-c", "print('ok')"], {}, 5000);
    if (py.ok && py.stdout.includes("ok")) return { bin: "py", prefixArgs: ["-3"] };
  }
  for (const bin of ["python3", "python"]) {
    const r = await runProcessCapture(bin, ["-c", "print('ok')"], {}, 5000);
    if (r.ok && r.stdout.includes("ok")) return { bin, prefixArgs: [] };
  }
  return null;
}

function resolveScriptEnvPrelude() {
  if (os.platform() === "win32") {
    return `
import os, sys
api = os.path.join(os.environ.get("PROGRAMDATA", r"C:\\ProgramData"), "Blackmagic Design", "DaVinci Resolve", "Support", "Developer", "Scripting")
lib = os.path.join(os.environ.get("PROGRAMFILES", r"C:\\Program Files"), "Blackmagic Design", "DaVinci Resolve", "fusionscript.dll")
os.environ["RESOLVE_SCRIPT_API"] = api
os.environ["RESOLVE_SCRIPT_LIB"] = lib
sys.path.insert(0, os.path.join(api, "Modules"))
`;
  }
  if (os.platform() === "darwin") {
    return `
import os, sys
api = "/Library/Application Support/Blackmagic Design/DaVinci Resolve/Developer/Scripting"
lib = "/Applications/DaVinci Resolve/DaVinci Resolve.app/Contents/Libraries/Fusion/fusionscript.so"
os.environ["RESOLVE_SCRIPT_API"] = api
os.environ["RESOLVE_SCRIPT_LIB"] = lib
sys.path.insert(0, os.path.join(api, "Modules"))
`;
  }
  return `
import os, sys
api = "/opt/resolve/Developer/Scripting"
lib = "/opt/resolve/libs/Fusion/fusionscript.so"
os.environ["RESOLVE_SCRIPT_API"] = api
os.environ["RESOLVE_SCRIPT_LIB"] = lib
sys.path.insert(0, os.path.join(api, "Modules"))
`;
}

/**
 * Probe official DaVinciResolveScript (feature-detect). Resolve must be running for reachable=true.
 */
async function probeResolveScripting() {
  const detect = await detectResolveInstall();
  const running = await isResolveProcessRunning();
  const python = await findPythonLauncher();
  if (!python) {
    return {
      ok: true,
      installed: detect.installed,
      running,
      scriptingModules: detect.scriptingAvailable,
      scriptingReachable: false,
      projectOpen: false,
      pythonAvailable: false,
      note: "Python not found — auto-import unavailable",
      detect,
    };
  }
  if (!detect.scriptingAvailable) {
    return {
      ok: true,
      installed: detect.installed,
      running,
      scriptingModules: false,
      scriptingReachable: false,
      projectOpen: false,
      pythonAvailable: true,
      note: "Resolve scripting modules not found",
      detect,
    };
  }

  const code = `
${resolveScriptEnvPrelude()}
try:
    import DaVinciResolveScript as dvr
except Exception as e:
    print("IMPORT_FAIL")
    raise SystemExit(1)
resolve = dvr.scriptapp("Resolve")
if not resolve:
    print("NO_RESOLVE")
    raise SystemExit(2)
proj = resolve.GetProjectManager().GetCurrentProject()
if not proj:
    print("NO_PROJECT")
    raise SystemExit(3)
print("OK")
raise SystemExit(0)
`;
  const result = await runProcessCapture(
    python.bin,
    [...python.prefixArgs, "-c", code],
    {},
    12000
  );
  const out = (result.stdout || "").trim();
  return {
    ok: true,
    installed: detect.installed,
    running,
    scriptingModules: true,
    scriptingReachable: out === "OK" || out === "NO_PROJECT",
    projectOpen: out === "OK",
    pythonAvailable: true,
    note: out || result.stderr?.slice(0, 200) || undefined,
    detect,
  };
}

const RESOLVE_MEDIA_BIN = "ShootSpine";

/**
 * Collect on-disk media paths from shootspine_handoff.json (V4 bin link).
 * Prefers resolvedPath; falls back to projectRoot + relativeProjectPath.
 */
async function collectHandoffMediaPaths(handoffDir, projectRoot) {
  const manifestPath = path.join(handoffDir, "shootspine_handoff.json");
  const requested = [];
  const existing = [];
  if (!(await pathExists(manifestPath))) {
    return { requested, existing, missing: 0 };
  }
  let media = [];
  try {
    const raw = JSON.parse(await fs.readFile(manifestPath, "utf8"));
    media = Array.isArray(raw?.media) ? raw.media : [];
  } catch {
    return { requested, existing, missing: 0 };
  }

  const seen = new Set();
  for (const item of media.slice(0, 2000)) {
    let candidate = typeof item?.resolvedPath === "string" ? item.resolvedPath.trim() : "";
    if (!candidate && projectRoot && typeof item?.relativeProjectPath === "string") {
      const rel = item.relativeProjectPath.replace(/^[\\/]+/, "").replace(/\\/g, "/");
      candidate = path.resolve(projectRoot, ...rel.split("/").filter(Boolean));
    }
    let abs = null;
    if (candidate) {
      try {
        abs = path.resolve(candidate);
        assertSafePath(abs);
      } catch {
        abs = null;
      }
    }
    if ((!abs || !(await pathExists(abs))) && projectRoot) {
      abs = await findOriginalMediaFile(
        projectRoot,
        item?.relativeProjectPath,
        item?.filename
      );
    }
    if (!abs) continue;
    const key = abs.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    requested.push(abs);
    if (await pathExists(abs)) existing.push(abs);
  }
  return { requested, existing, missing: requested.length - existing.length };
}

/**
 * V4 — Import media into a ShootSpine Media Pool bin, then ImportTimelineFromFile.
 * Requires Resolve running with a project open + External scripting enabled.
 */
async function importEdlIntoResolve(body) {
  let projectRoot = body.projectRoot ? path.resolve(body.projectRoot) : null;
  if (projectRoot) assertSafePath(projectRoot);

  let handoffDir = body.handoffDir ? path.resolve(body.handoffDir) : null;
  if (!handoffDir && projectRoot) {
    handoffDir = path.resolve(projectRoot, RESOLVE_HANDOFF_REL);
  }
  if (!handoffDir) throw new Error("handoffDir or projectRoot required");
  assertSafePath(handoffDir);

  if (!projectRoot) {
    // handoff lives at <root>/03_PROJECT_FILES/shootspine_resolve
    projectRoot = path.resolve(handoffDir, "..", "..");
  }

  const edlName = String(body.edlFilename || "shootspine_rough_cut.edl");
  const edlPath = path.join(handoffDir, path.basename(edlName));
  if (!(await pathExists(edlPath))) {
    return {
      ok: true,
      imported: false,
      reason: "EDL_MISSING",
      message: "Timeline file not found — save the edit first",
      mediaImported: 0,
      mediaRequested: 0,
      binName: RESOLVE_MEDIA_BIN,
    };
  }

  const linkMedia = body.linkMedia !== false;
  const { requested, existing } = linkMedia
    ? await collectHandoffMediaPaths(handoffDir, projectRoot)
    : { requested: [], existing: [] };

  const timelineName = String(body.timelineName || "ShootSpine Rough Cut").slice(0, 120);
  const binName = String(body.binName || RESOLVE_MEDIA_BIN).slice(0, 80);
  const editPlanPath = path.join(handoffDir, "shootspine_edit_plan.json");
  const python = await findPythonLauncher();
  if (!python) {
    return {
      ok: true,
      imported: false,
      reason: "NO_PYTHON",
      message: "Python not found for Resolve scripting",
      mediaImported: 0,
      mediaRequested: requested.length,
      binName,
    };
  }

  const code = `
${resolveScriptEnvPrelude()}
from pathlib import Path
import json
edl = Path(${JSON.stringify(edlPath)})
name = ${JSON.stringify(timelineName)}
bin_name = ${JSON.stringify(binName)}
media_paths = ${JSON.stringify(existing)}
plan_path = Path(${JSON.stringify(editPlanPath)})
try:
    import DaVinciResolveScript as dvr
except Exception:
    print("IMPORT_FAIL")
    raise SystemExit(1)
resolve = dvr.scriptapp("Resolve")
if not resolve:
    print("NO_RESOLVE")
    raise SystemExit(2)
project = resolve.GetProjectManager().GetCurrentProject()
if not project:
    print("NO_PROJECT")
    raise SystemExit(3)
media_pool = project.GetMediaPool()
root = media_pool.GetRootFolder()
bin_folder = None
for sub in (root.GetSubFolderList() or []):
    try:
        if sub.GetName() == bin_name:
            bin_folder = sub
            break
    except Exception:
        pass
if bin_folder is None:
    try:
        bin_folder = media_pool.AddSubFolder(root, bin_name)
    except Exception:
        bin_folder = None
if bin_folder is not None:
    try:
        media_pool.SetCurrentFolder(bin_folder)
    except Exception:
        pass
media_count = 0
clips = []
if media_paths:
    try:
        clips = media_pool.ImportMedia(media_paths) or []
        if clips:
            media_count = len(clips)
    except Exception:
        media_count = 0
        clips = []
# Only zero Start TC when EVERY event is file-relative (source-in 00:00:00:00).
# A single missing/unaligned clip (e.g. C0042 at 00:00:00:00) must NOT wipe camera
# Start TC on the rest — that makes later events ask for TC past the file duration.
try:
    import re
    edl_text = edl.read_text(encoding="utf-8", errors="ignore")
    src_ins = re.findall(
        r"^\\d{3}\\s+\\S+\\s+\\S+\\s+(?:C|D(?:\\s+\\d+)?)\\s+(\\d{2}:\\d{2}:\\d{2}[:;]\\d{2})\\s+",
        edl_text,
        flags=re.M,
    )
    file_relative = bool(src_ins) and all(
        s.replace(";", ":") == "00:00:00:00" for s in src_ins
    )
    if file_relative:
        for clip in clips:
            try:
                clip.SetClipProperty("Start TC", "00:00:00:00")
            except Exception:
                pass
except Exception:
    pass
imported = media_pool.ImportTimelineFromFile(str(edl), {"timelineName": name})
if not imported:
    print(f"IMPORT_FAILED media={media_count} requested={len(media_paths)}")
    raise SystemExit(4)
try:
    project.SetCurrentTimeline(imported)
except Exception:
    pass
markers_ok = 0
markers_planned = 0
if plan_path.is_file():
    try:
        plan = json.loads(plan_path.read_text(encoding="utf-8"))
        markers = plan.get("markers") or []
        markers_planned = len(markers)
        for m in markers:
            try:
                frame = int(m.get("frame") or 0)
                color = str(m.get("color") or "Blue")
                mname = str(m.get("name") or "Marker")[:64]
                note = str(m.get("note") or "")[:256]
                dur = max(1, int(m.get("durationFrames") or 1))
                if imported.AddMarker(frame, color, mname, note, dur):
                    markers_ok += 1
            except Exception:
                pass
    except Exception:
        pass
print(f"IMPORTED media={media_count} requested={len(media_paths)} markers={markers_ok}/{markers_planned}")
raise SystemExit(0)
`;

  const result = await runProcessCapture(
    python.bin,
    [...python.prefixArgs, "-c", code],
    { cwd: handoffDir },
    120000
  );
  const out = (result.stdout || "").trim();
  const mediaMatch = out.match(/media=(\d+)\s+requested=(\d+)/);
  const markerMatch = out.match(/markers=(\d+)\/(\d+)/);
  const mediaImported = mediaMatch ? Number(mediaMatch[1]) : 0;
  const mediaRequested = mediaMatch ? Number(mediaMatch[2]) : existing.length;
  const markersApplied = markerMatch ? Number(markerMatch[1]) : 0;
  const markersPlanned = markerMatch ? Number(markerMatch[2]) : 0;

  if (out.includes("IMPORTED")) {
    const parts = ["Timeline imported into the open Resolve project"];
    if (mediaImported > 0) {
      parts.push(`${mediaImported} clip(s) linked in the “${binName}” bin`);
    } else if (requested.length > 0) {
      parts.push("Media files weren’t linked — relink from your project media folder if clips are offline");
    }
    if (markersApplied > 0) {
      parts.push(`${markersApplied} timeline marker(s) added`);
    }
    return {
      ok: true,
      imported: true,
      reason: "OK",
      message: parts.join(". ") + ".",
      edlPath,
      mediaImported,
      mediaRequested: requested.length,
      mediaMissing: requested.length - existing.length,
      binName,
      markersApplied,
      markersPlanned,
    };
  }
  return {
    ok: true,
    imported: false,
    reason: out.split(/\s/)[0] || "UNKNOWN",
    message: result.stderr?.slice(0, 300) || out || "Import did not succeed",
    edlPath,
    mediaImported,
    mediaRequested: requested.length,
    mediaMissing: requested.length - existing.length,
    binName,
    markersApplied,
    markersPlanned,
  };
}

/**
 * V5 — Read the open Resolve timeline back (metadata + optional EDL snapshot).
 * Non-destructive: never overwrites the ShootSpine rough cut EDL.
 */
async function syncFromResolve(body) {
  let projectRoot = body.projectRoot ? path.resolve(body.projectRoot) : null;
  if (projectRoot) assertSafePath(projectRoot);

  let handoffDir = body.handoffDir ? path.resolve(body.handoffDir) : null;
  if (!handoffDir && projectRoot) {
    handoffDir = path.resolve(projectRoot, RESOLVE_HANDOFF_REL);
  }
  if (handoffDir) assertSafePath(handoffDir);

  const exportEdl = body.exportEdl !== false;
  const python = await findPythonLauncher();
  if (!python) {
    return {
      ok: true,
      synced: false,
      reason: "NO_PYTHON",
      message: "Python not found for Resolve scripting",
    };
  }

  const edlOut =
    handoffDir && exportEdl
      ? path.join(handoffDir, "resolve_from_nle.edl")
      : "";
  const summaryOut =
    handoffDir ? path.join(handoffDir, "RESOLVE_SYNC.txt") : "";

  if (handoffDir) {
    await fs.mkdir(handoffDir, { recursive: true });
  }

  const code = `
${resolveScriptEnvPrelude()}
import json
from pathlib import Path
edl_out = ${JSON.stringify(edlOut)}
summary_out = ${JSON.stringify(summaryOut)}
try:
    import DaVinciResolveScript as dvr
except Exception:
    print("IMPORT_FAIL")
    raise SystemExit(1)
resolve = dvr.scriptapp("Resolve")
if not resolve:
    print("NO_RESOLVE")
    raise SystemExit(2)
project = resolve.GetProjectManager().GetCurrentProject()
if not project:
    print("NO_PROJECT")
    raise SystemExit(3)
timeline = project.GetCurrentTimeline()
if not timeline:
    print("NO_TIMELINE")
    raise SystemExit(4)

def safe_int(v, default=0):
    try:
        return int(v)
    except Exception:
        return default

def safe_float(v, default=24.0):
    try:
        return float(v)
    except Exception:
        return default

name = timeline.GetName() or "Untitled"
project_name = project.GetName() or ""
start = safe_int(timeline.GetStartFrame(), 0)
end = safe_int(timeline.GetEndFrame(), start)
fps_raw = project.GetSetting("timelineFrameRate") or timeline.GetSetting("timelineFrameRate") or "24"
fps = safe_float(fps_raw, 24.0)
vtracks = safe_int(timeline.GetTrackCount("video"), 0)
atracks = safe_int(timeline.GetTrackCount("audio"), 0)
clip_items = []
video_clips = 0
for i in range(1, vtracks + 1):
    try:
        items = timeline.GetItemListInTrack("video", i) or []
        video_clips += len(items)
        for item in items:
            if len(clip_items) >= 2000:
                continue
            try:
                cname = item.GetName() or ""
            except Exception:
                cname = ""
            try:
                cdur = safe_int(item.GetDuration(), 0)
            except Exception:
                cdur = 0
            try:
                cstart = safe_int(item.GetStart(), 0)
            except Exception:
                cstart = 0
            try:
                cleft = safe_int(item.GetLeftOffset(), 0)
            except Exception:
                cleft = 0
            clip_items.append({
                "name": cname,
                "track": i,
                "startFrame": cstart,
                "durationFrames": cdur,
                "sourceInFrame": max(0, cleft),
            })
    except Exception:
        pass
duration_frames = max(0, end - start)
duration_seconds = duration_frames / fps if fps > 0 else 0.0

edl_exported = False
edl_path = ""
if edl_out:
    try:
        ok = timeline.Export(edl_out, resolve.EXPORT_EDL, resolve.EXPORT_NONE)
        edl_exported = bool(ok)
        if edl_exported:
            edl_path = edl_out
    except Exception:
        edl_exported = False

payload = {
    "projectName": project_name,
    "timelineName": name,
    "startFrame": start,
    "endFrame": end,
    "durationFrames": duration_frames,
    "durationSeconds": round(duration_seconds, 3),
    "frameRate": fps,
    "videoTrackCount": vtracks,
    "audioTrackCount": atracks,
    "videoClipCount": video_clips,
    "clips": clip_items,
    "edlExported": edl_exported,
    "edlPath": edl_path or None,
}

if summary_out:
    try:
        lines = [
            "ShootSpine ← Resolve sync",
            "=========================",
            "",
            f"Resolve project: {project_name}",
            f"Timeline: {name}",
            f"Duration: {duration_frames} frames (~{duration_seconds:.1f}s) @ {fps} fps",
            f"Video clips: {video_clips} across {vtracks} track(s)",
            f"Audio tracks: {atracks}",
            f"EDL snapshot: {'yes — resolve_from_nle.edl' if edl_exported else 'not exported'}",
            "",
            "Clips (first 20):",
        ]
        for c in clip_items[:20]:
            lines.append(f"  - {c.get('name') or '(unnamed)'}")
        if len(clip_items) > 20:
            lines.append(f"  … +{len(clip_items) - 20} more")
        lines.extend([
            "",
            "This is a read-only snapshot. Your ShootSpine rough cut was not changed.",
        ])
        Path(summary_out).write_text("\\n".join(lines) + "\\n", encoding="utf-8")
    except Exception:
        pass

print("SYNC_OK " + json.dumps(payload, separators=(",", ":")))
raise SystemExit(0)
`;

  const result = await runProcessCapture(
    python.bin,
    [...python.prefixArgs, "-c", code],
    handoffDir ? { cwd: handoffDir } : {},
    60000
  );
  const out = (result.stdout || "").trim();
  const line = out
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => l.startsWith("SYNC_OK "));

  if (line) {
    let snapshot = {};
    try {
      snapshot = JSON.parse(line.slice("SYNC_OK ".length));
    } catch {
      snapshot = {};
    }
    return {
      ok: true,
      synced: true,
      reason: "OK",
      message: snapshot.timelineName
        ? `Read “${snapshot.timelineName}” from Resolve`
        : "Read current Resolve timeline",
      snapshot,
      summaryPath: summaryOut || undefined,
    };
  }

  const reason = out.split(/\s/)[0] || "UNKNOWN";
  const messages = {
    NO_TIMELINE: "Open a timeline in Resolve first",
    NO_PROJECT: "Open a project in Resolve first",
    NO_RESOLVE: "Resolve isn’t running or scripting is off",
    IMPORT_FAIL: "Resolve scripting modules aren’t available",
  };
  return {
    ok: true,
    synced: false,
    reason,
    message: messages[reason] || result.stderr?.slice(0, 300) || out || "Could not read Resolve",
  };
}

/**
 * Launch Resolve from allowlisted detected path only — no arbitrary user shell.
 * Does not auto-open Explorer (steals focus while Resolve is loading).
 */
async function openResolve(body) {
  const detect = await detectResolveInstall();
  const actions = [];
  let launched = false;
  let alreadyRunning = false;
  let revealed = false;
  let windowTitle;

  const revealNow = body.reveal === true;
  if (revealNow && (body.handoffDir || body.projectRoot)) {
    let handoffDir = body.handoffDir ? path.resolve(body.handoffDir) : null;
    if (!handoffDir && body.projectRoot) {
      handoffDir = path.resolve(body.projectRoot, RESOLVE_HANDOFF_REL);
    }
    if (handoffDir && (await pathExists(handoffDir))) {
      await revealInFileManager(handoffDir);
      revealed = true;
      actions.push("revealed_handoff_folder");
    }
  }

  if (body.launch !== false && detect.installed && detect.appPath) {
    const platform = os.platform();
    alreadyRunning = await isResolveProcessRunning();

    if (alreadyRunning) {
      actions.push("resolve_already_running");
      launched = true;
      if (platform === "win32") {
        const focused = await focusResolveWindowWindows();
        if (focused.ok) {
          actions.push("focused_resolve");
          windowTitle = focused.title;
        } else {
          actions.push(`focus_${focused.reason || "failed"}`);
          windowTitle = focused.title;
          // Fallback: Start-Process can still surface a single-instance app
          try {
            const method = await launchWindowsGuiApp(detect.appPath);
            actions.push(`launch_${method}`);
            const retry = await focusResolveWindowWindows();
            if (retry.ok) {
              actions.push("focused_resolve_retry");
              windowTitle = retry.title || windowTitle;
            }
          } catch (e) {
            actions.push(
              `focus_fallback_failed:${e instanceof Error ? e.message : "unknown"}`
            );
          }
        }
      } else if (platform === "darwin") {
        spawn("open", ["-a", "DaVinci Resolve"], { detached: true, stdio: "ignore" }).unref();
        actions.push("focused_resolve");
      }
    } else if (platform === "win32") {
      try {
        const method = await launchWindowsGuiApp(detect.appPath);
        actions.push(`launch_${method}`);
        let running = await waitForResolveProcess(10000);
        // If the first method claimed success but Resolve never appeared, try fallbacks.
        if (!running) {
          actions.push("resolve_process_not_seen_retrying");
          try {
            await launchWindowsGuiApp(detect.appPath);
          } catch {
            /* already tried */
          }
          // Last resort: explorer ShellExecute
          try {
            spawn("explorer.exe", [detect.appPath], {
              detached: true,
              stdio: "ignore",
            }).unref();
            actions.push("launch_explorer_retry");
          } catch {
            /* ignore */
          }
          running = await waitForResolveProcess(8000);
        }
        launched = running;
        if (running) {
          actions.push("resolve_process_seen");
          // Splash can take a bit before a real window exists
          await new Promise((r) => setTimeout(r, 1500));
          const focused = await focusResolveWindowWindows();
          if (focused.ok) {
            actions.push("focused_resolve");
            windowTitle = focused.title;
          } else {
            actions.push(`focus_${focused.reason || "pending_splash"}`);
          }
        } else {
          actions.push("resolve_process_not_seen");
        }
      } catch (e) {
        launched = false;
        actions.push(`launch_failed:${e instanceof Error ? e.message : "unknown"}`);
      }
    } else if (platform === "darwin") {
      const child = spawn("open", ["-a", "DaVinci Resolve"], {
        detached: true,
        stdio: "ignore",
      });
      child.unref();
      launched = true;
      actions.push("launched_resolve");
    } else if (detect.appPath) {
      const child = spawn(detect.appPath, [], { detached: true, stdio: "ignore" });
      child.unref();
      launched = true;
      actions.push("launched_resolve");
    }
  } else if (!detect.installed) {
    actions.push("resolve_not_installed_use_mac_companion");
  } else if (body.launch !== false && !detect.appPath) {
    actions.push("resolve_path_missing");
  }

  const titleBit = windowTitle ? ` (“${windowTitle}”)` : "";
  return {
    ok: true,
    detect,
    launched,
    alreadyRunning,
    revealed,
    actions,
    windowTitle: windowTitle || undefined,
    message: launched
      ? alreadyRunning
        ? actions.some((a) => String(a).startsWith("focused_resolve"))
          ? `Resolve was already open${titleBit} — brought it to the front.`
          : `Resolve is already open${titleBit}. Use Alt+Tab or the taskbar if you don’t see it.`
        : actions.includes("resolve_process_seen")
          ? "Resolve is starting — look for the splash/taskbar icon (can take 30–60s)."
          : "Resolve is starting. Splash can take 30–60s — check the taskbar."
      : detect.installed
        ? `Couldn’t start Resolve from ${detect.appPath || "its install path"}. Open DaVinci Resolve from the Start menu once, then try again.`
        : detect.note,
  };
}

async function ingestCopyBatch(body) {
  const projectRoot = path.resolve(body.projectRoot);
  const cameraLabel = sanitizeCameraLabel(body.cameraLabel || "CAMERA_A");
  assertSafePath(projectRoot);

  const destDir = path.join(projectRoot, "01_ORIGINAL_MEDIA", cameraLabel);
  await fs.mkdir(destDir, { recursive: true });

  const files = Array.isArray(body.files) ? body.files : [];
  if (!files.length) throw new Error("No files to ingest");
  if (files.length > 500) throw new Error("Max 500 files per ingest batch");

  // Disk space check
  let required = 0;
  for (const f of files) {
    required += Number(f.sizeBytes) || 0;
  }
  const space = await storageStat(destDir);
  if (space.availableBytes != null) {
    const reserve = 2 * 1024 * 1024 * 1024;
    if (space.availableBytes < required + reserve) {
      throw new Error(
        `Not enough free space to copy safely (need ~${Math.ceil((required + reserve) / 1e9)} GB free)`
      );
    }
  }

  const results = [];
  for (const f of files) {
    assertSafePath(f.sourcePath);
    const filename = f.filename || path.basename(f.sourcePath);
    const destPath = path.join(destDir, filename);
    // Refuse writing outside project root
    const rel = path.relative(projectRoot, destPath);
    if (rel.startsWith("..") || path.isAbsolute(rel)) {
      throw new Error("Refusing to write outside project root");
    }
    const copied = await copyVerified(f.sourcePath, destPath);
    const relativeProjectPath = `01_ORIGINAL_MEDIA/${cameraLabel}/${filename}`.replace(
      /\\/g,
      "/"
    );
    let proxyPath;
    if (body.generateProxies) {
      try {
        const proxy = await createProxy(destPath, undefined, "ai_720p");
        proxyPath = proxy.proxyPath;
      } catch {
        proxyPath = undefined;
      }
    }
    results.push({
      ...copied,
      filename,
      relativeProjectPath,
      cameraAssignment: cameraLabel,
      proxyPath,
    });
  }

  return {
    projectRoot,
    cameraLabel,
    space,
    requiredBytes: required,
    results,
  };
}

async function createThumbnail(filePath, outputDir) {
  assertSafePath(filePath);
  const dir =
    outputDir?.trim() ||
    path.join(path.dirname(filePath), ".shootspine-thumbs");
  assertSafePath(dir);
  await fs.mkdir(dir, { recursive: true });
  const outPath = path.join(dir, `${path.basename(filePath)}.jpg`);
  try {
    await runFfmpegThumb(filePath, outPath);
    const buf = await fs.readFile(outPath);
    // Keep Firestore payloads small — only inline tiny thumbs
    const dataUrl =
      buf.length <= 90_000
        ? `data:image/jpeg;base64,${buf.toString("base64")}`
        : undefined;
    return { path: outPath, dataUrl };
  } catch {
    return { path: undefined, dataUrl: undefined };
  }
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "OPTIONS") {
      return json(res, 204, {});
    }

    const url = new URL(req.url || "/", `http://${HOST}:${PORT}`);
    const pathname = url.pathname;

    // Root / unknown browser visits — never useful as a webpage; point people back to the app.
    if (
      req.method === "GET" &&
      (pathname === "/" || pathname === "") &&
      String(req.headers.accept || "").includes("text/html")
    ) {
      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
      });
      res.end(`<!doctype html><meta charset="utf-8"/><title>ShootSpine Desktop Agent</title>
<body style="font-family:system-ui,sans-serif;max-width:36rem;margin:2rem;line-height:1.5;color:#0f172a">
<h1 style="font-size:1.25rem">Desktop Agent is running</h1>
<p>This is a background helper for ShootSpine — not a website. Close this tab and go back to the AI Editor.</p>
<p><a href="http://localhost:3000" style="color:#0369a1;font-weight:600">Open ShootSpine</a></p>
<p style="font-size:0.85rem;color:#64748b">Then use <strong>Connect / Restart</strong> in Step 1 if needed.</p>
</body>`);
      return;
    }

    if (req.method === "GET" && pathname === "/v1/health") {
      // Prefer cached probes so launch/health never waits on Whisper cold start.
      const tools = await Promise.race([
        probeTools(false),
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ffmpeg: toolProbeCache.ffmpeg,
                ffprobe: toolProbeCache.ffprobe,
                whisper: toolProbeCache.whisper,
              }),
            800
          )
        ),
      ]);
      return json(res, 200, {
        ok: true,
        version: VERSION,
        platform: `${os.platform()}-${os.arch()}`,
        gpuName: process.env.SHOOTSPINE_GPU_NAME || undefined,
        vramGb: process.env.SHOOTSPINE_VRAM_GB
          ? Number(process.env.SHOOTSPINE_VRAM_GB)
          : undefined,
        ffprobeAvailable: tools.ffprobe,
        ffmpegAvailable: tools.ffmpeg,
        whisperAvailable: tools.whisper,
        authMode: DEV_OPEN ? "dev_open" : APP_VERIFY_URL ? "app_verify" : "registered",
      });
    }

    if (req.method === "POST" && pathname === "/v1/session/register") {
      const body = await readBody(req);
      try {
        if (APP_VERIFY_URL) {
          const verified = await verifyTokenWithApp(body.token);
          if (!verified) {
            return json(res, 401, { error: "Session not recognized by ShootSpine" });
          }
          const registered = registerSession({
            token: body.token,
            expiresAt: verified.expiresAt || body.expiresAt,
            projectId: verified.projectId || body.projectId,
          });
          return json(res, 200, registered);
        }
        return json(res, 200, registerSession(body));
      } catch (e) {
        return json(res, 400, {
          error: e instanceof Error ? e.message : "Could not register session",
        });
      }
    }

    if (!(await requireAuth(req))) {
      const msg = DEV_OPEN
        ? "Missing agent session token"
        : "Register a ShootSpine session first (reconnect this computer)";
      const accept = String(req.headers.accept || "");
      // Browser navigations show a readable page instead of raw JSON in <pre>
      if (req.method === "GET" && accept.includes("text/html")) {
        res.writeHead(401, {
          "Content-Type": "text/html; charset=utf-8",
          "Access-Control-Allow-Origin": "*",
        });
        res.end(`<!doctype html><meta charset="utf-8"/><title>ShootSpine Desktop Agent</title>
<body style="font-family:system-ui,sans-serif;max-width:36rem;margin:2rem;line-height:1.45">
<h1>Desktop Agent</h1>
<p>${msg}.</p>
<p>Don’t open this URL in the browser. Go back to ShootSpine AI Editor, click <strong>Connect</strong> / <strong>Restart</strong> in Step 1, then try again.</p>
</body>`);
        return;
      }
      return json(res, 401, { error: msg });
    }

    if (req.method === "POST" && pathname === "/v1/folders/create") {
      const body = await readBody(req);
      const created = await createFolders(body.projectRoot, body.cameraLabels);
      return json(res, 200, { ok: true, created, projectRoot: body.projectRoot });
    }

    if (req.method === "POST" && pathname === "/v1/media/index") {
      const body = await readBody(req);
      const files = [];
      await walkMedia(body.folderPath, body.recursive !== false, files);
      return json(res, 200, { ok: true, files });
    }

    if (req.method === "POST" && pathname === "/v1/media/detect-sources") {
      const body = await readBody(req);
      const result = await detectMediaSourceProbes(body || {});
      return json(res, 200, { ok: true, ...result });
    }

    if (req.method === "POST" && pathname === "/v1/media/probe") {
      const body = await readBody(req);
      const probe = await probeFile(body.filePath);
      return json(res, 200, { ok: true, probe });
    }

    if (req.method === "POST" && pathname === "/v1/media/thumbnail") {
      const body = await readBody(req);
      const thumb = await createThumbnail(body.filePath, body.outputDir);
      return json(res, 200, { ok: true, ...thumb });
    }

    if (req.method === "POST" && pathname === "/v1/media/proxy") {
      const body = await readBody(req);
      const proxy = await createProxy(body.filePath, body.outputPath, body.profile);
      return json(res, 200, { ok: true, ...proxy });
    }

    if (req.method === "POST" && pathname === "/v1/storage/stat") {
      const body = await readBody(req);
      const stat = await storageStat(body.path);
      return json(res, 200, { ok: true, ...stat });
    }

    if (req.method === "POST" && pathname === "/v1/media/checksum") {
      const body = await readBody(req);
      assertSafePath(body.filePath);
      const checksum = await sha256File(path.resolve(body.filePath));
      return json(res, 200, { ok: true, checksum, checksumAlgorithm: "sha256" });
    }

    if (req.method === "POST" && pathname === "/v1/media/copy-verified") {
      const body = await readBody(req);
      const result = await copyVerified(body.sourcePath, body.destPath);
      return json(res, 200, { ok: true, ...result });
    }

    if (req.method === "POST" && pathname === "/v1/media/copy-verified-batch") {
      const body = await readBody(req);
      const batch = await copyVerifiedBatch(body);
      return json(res, 200, batch);
    }

    if (req.method === "POST" && pathname === "/v1/media/safe-delete") {
      const body = await readBody(req);
      const deleted = await safeDeleteFiles(body);
      return json(res, 200, deleted);
    }

    if (req.method === "POST" && pathname === "/v1/media/ingest-copy") {
      const body = await readBody(req);
      const batch = await ingestCopyBatch(body);
      return json(res, 200, { ok: true, ...batch });
    }

    if (req.method === "POST" && pathname === "/v1/media/analyze") {
      const body = await readBody(req);
      const result = await analyzeMedia(body.filePath, {
        transcribe: body.transcribe === true,
      });
      return json(res, 200, { ok: true, ...result });
    }

    if (
      (req.method === "GET" || req.method === "HEAD") &&
      pathname === "/v1/media/stream"
    ) {
      const filePath = url.searchParams.get("path") || "";
      await streamLocalMedia(req, res, filePath);
      return;
    }

    if (req.method === "GET" && pathname === "/v1/fs/drives") {
      const drives = await listDrives();
      return json(res, 200, { ok: true, drives });
    }

    if (req.method === "POST" && pathname === "/v1/fs/list") {
      const body = await readBody(req);
      const listed = await listDirectory(body.path);
      return json(res, 200, { ok: true, ...listed });
    }

    if (req.method === "POST" && pathname === "/v1/fs/reveal") {
      const body = await readBody(req);
      const revealed = await revealInFileManager(body.path);
      return json(res, 200, revealed);
    }

    if (req.method === "POST" && pathname === "/v1/fs/rename-dir") {
      const body = await readBody(req);
      const renamed = await renameDirectory(body.from, body.to);
      return json(res, 200, renamed);
    }

    if (req.method === "POST" && pathname === "/v1/resolve/detect") {
      const detected = await detectResolveInstall();
      return json(res, 200, { ok: true, ...detected });
    }

    if (req.method === "POST" && pathname === "/v1/resolve/write-handoff") {
      const body = await readBody(req);
      const written = await writeResolveHandoff(body);
      return json(res, 200, written);
    }

    if (req.method === "POST" && pathname === "/v1/resolve/open") {
      const body = await readBody(req);
      const opened = await openResolve(body);
      return json(res, 200, opened);
    }

    if (req.method === "POST" && pathname === "/v1/resolve/scripting-probe") {
      const probe = await probeResolveScripting();
      return json(res, 200, probe);
    }

    if (req.method === "POST" && pathname === "/v1/resolve/import-edl") {
      const body = await readBody(req);
      const imported = await importEdlIntoResolve(body);
      return json(res, 200, imported);
    }

    if (req.method === "POST" && pathname === "/v1/resolve/sync-from-nle") {
      const body = await readBody(req);
      const synced = await syncFromResolve(body);
      return json(res, 200, synced);
    }

    if (req.method === "POST" && pathname === "/v1/shutdown") {
      json(res, 200, { ok: true, shuttingDown: true });
      setTimeout(() => {
        server.close(() => process.exit(0));
        setTimeout(() => process.exit(0), 500);
      }, 50);
      return;
    }

    return json(res, 404, { error: "Not found" });
  } catch (e) {
    return json(res, 400, { error: e instanceof Error ? e.message : "Request failed" });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`[ShootSpine Desktop Agent] http://${HOST}:${PORT} (v${VERSION})`);
  console.log(
    `[ShootSpine Desktop Agent] auth=${DEV_OPEN ? "dev_open" : APP_VERIFY_URL ? "app_verify" : "registered"}` +
      (APP_VERIFY_URL ? ` app=${APP_VERIFY_URL}` : "")
  );
});
