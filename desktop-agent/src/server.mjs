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
const VERSION = "0.6.1";
const DEV_OPEN = process.env.SHOOTSPINE_AGENT_DEV_OPEN !== "0";

const MEDIA_EXTS = new Set([
  ".mp4",
  ".mov",
  ".mxf",
  ".mkv",
  ".avi",
  ".r3d",
  ".braw",
  ".wav",
  ".aiff",
  ".aif",
  ".mp3",
  ".m4a",
  ".aac",
  ".jpg",
  ".jpeg",
  ".png",
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

function requireAuth(req) {
  // health is public; others need a token (Bearer or ?token= for <video src>)
  return Boolean(requestToken(req));
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
      if (recursive && depth < 12) await walkMedia(full, true, out, depth + 1);
      continue;
    }
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
  const mediaType = video ? "video" : audio ? "audio" : "other";
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
    startTimecode: video?.tags?.timecode || raw.format?.tags?.timecode,
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
  await fs.mkdir(path.dirname(out), { recursive: true });
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
      "1",
      "-i",
      filePath,
      "-frames:v",
      "1",
      "-vf",
      "scale=320:-1",
      "-q:v",
      "5",
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

async function listDrives() {
  const drives = [];
  if (process.platform === "win32") {
    for (const letter of "CDEFGHIJKLMNOPQRSTUVWXYZ") {
      const root = `${letter}:\\`;
      try {
        await fs.access(root);
        drives.push({ path: root, label: `${letter}:`, kind: "drive" });
      } catch {
        /* skip */
      }
    }
  } else {
    drives.push({ path: "/", label: "/", kind: "volume" });
    try {
      const vols = await fs.readdir("/Volumes");
      for (const v of vols) {
        drives.push({
          path: path.join("/Volumes", v),
          label: v,
          kind: "volume",
        });
      }
    } catch {
      /* ignore */
    }
  }

  const home = os.homedir();
  if (home) {
    drives.push({ path: home, label: "Home", kind: "home" });
    for (const [name, kind] of [
      ["Desktop", "desktop"],
      ["Documents", "documents"],
      ["Videos", "videos"],
      ["Movies", "videos"],
    ]) {
      const p = path.join(home, name);
      // Only offer folders Node can actually list (skips broken junctions).
      if (await canReadDir(p)) {
        drives.push({ path: p, label: name, kind });
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
  // Ensure path exists or use parent for free-space check
  let checkPath = resolved;
  try {
    await fs.access(resolved);
  } catch {
    checkPath = path.dirname(resolved);
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
        };
      } catch {
        /* fall through */
      }
    }
    return { path: resolved, online: true, writable: true };
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
  if (files.length > 200) throw new Error("Max 200 files per batch");

  const results = [];
  for (const f of files) {
    if (!f?.sourcePath || !f?.destPath) throw new Error("sourcePath and destPath required");
    const copied = await copyVerified(f.sourcePath, f.destPath);
    results.push({
      id: f.id || null,
      ...copied,
    });
  }
  return { ok: true, count: results.length, results };
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
  if (files.length > 200) throw new Error("Max 200 files per delete batch");

  const results = [];
  for (const f of files) {
    const filePath = path.resolve(f.path || f.filePath || "");
    assertSafePath(filePath);
    if (isDriveRoot(filePath)) throw new Error(`Refusing to delete drive root: ${filePath}`);
    if (!isPathUnderRoot(projectRoot, filePath)) {
      throw new Error(`Refusing delete outside project root (camera cards never erased): ${filePath}`);
    }
    if (neverDelete.has(filePath.toLowerCase())) {
      throw new Error(`Refusing to delete protected path (archive): ${filePath}`);
    }
    const st = await fs.stat(filePath);
    if (!st.isFile()) throw new Error(`Not a file: ${filePath}`);
    if (f.expectedChecksum) {
      const checksum = await sha256File(filePath);
      if (checksum !== f.expectedChecksum) {
        throw new Error(`Checksum mismatch before delete — aborting: ${filePath}`);
      }
    }
    await fs.unlink(filePath);
    results.push({
      id: f.id || null,
      path: filePath,
      deleted: true,
    });
  }
  return { ok: true, count: results.length, results };
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
    const pd = process.env.PROGRAMDATA || "C:\\ProgramData";
    const candidates = [
      path.join(pf, "Blackmagic Design", "DaVinci Resolve", "Resolve.exe"),
      path.join(pf, "Blackmagic Design", "DaVinci Resolve", "DaVinci Resolve.exe"),
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
  for (const name of names) {
    const base = path.basename(String(name));
    if (!base || base !== name.replace(/\\/g, "/").split("/").pop()) {
      throw new Error(`Invalid handoff filename: ${name}`);
    }
    if (!/\.(edl|json|txt|py|md)$/i.test(base)) {
      throw new Error(`Unsupported handoff file type: ${base}`);
    }
    const content = String(files[name] ?? "");
    if (content.length > 5_000_000) throw new Error(`File too large: ${base}`);
    const dest = path.join(destDir, base);
    await fs.writeFile(dest, content, "utf8");
    written.push(base);
  }

  return {
    ok: true,
    handoffDir: destDir,
    relativeDir: relDir,
    written,
  };
}

function revealInFileManager(targetPath) {
  return new Promise(async (resolve, reject) => {
    try {
      assertSafePath(targetPath);
      const abs = path.resolve(targetPath);
      if (!(await pathExists(abs))) throw new Error("Path not found");
      const platform = os.platform();
      if (platform === "win32") {
        // explorer with a folder path opens it; avoid /select quirks
        const child = spawn("explorer.exe", [abs], {
          detached: true,
          stdio: "ignore",
          windowsHide: true,
        });
        child.unref();
        resolve({ ok: true, revealed: abs, method: "explorer" });
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
    if (os.platform() !== "win32") {
      resolve(false);
      return;
    }
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
  });
}

/**
 * Launch a GUI app via Windows ShellExecute (`start`).
 * Direct spawn(Resolve.exe) from a Node service often leaves Resolve stuck on splash.
 */
function launchWindowsGuiApp(exePath) {
  return new Promise((resolve, reject) => {
    const abs = path.resolve(exePath);
    const child = spawn(
      "powershell.exe",
      [
        "-NoProfile",
        "-Command",
        `Start-Process -FilePath ${JSON.stringify(abs)} -WorkingDirectory ${JSON.stringify(path.dirname(abs))}`,
      ],
      { detached: true, stdio: "ignore", windowsHide: true }
    );
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0 || code === null) resolve(true);
      else reject(new Error(`Start-Process exited ${code}`));
    });
    child.unref();
  });
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
      // Still nudge a Start-Process — Windows usually focuses the existing instance.
      if (platform === "win32") {
        try {
          await launchWindowsGuiApp(detect.appPath);
          launched = true;
          actions.push("focused_resolve");
        } catch {
          launched = false;
        }
      } else if (platform === "darwin") {
        spawn("open", ["-a", "DaVinci Resolve"], { detached: true, stdio: "ignore" }).unref();
        launched = true;
        actions.push("focused_resolve");
      }
    } else if (platform === "win32") {
      await launchWindowsGuiApp(detect.appPath);
      launched = true;
      actions.push("launched_resolve");
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
  }

  return {
    ok: true,
    detect,
    launched,
    alreadyRunning,
    revealed,
    actions,
    message: launched
      ? alreadyRunning
        ? "Resolve was already running — brought it forward. Give it a moment if the project picker is still loading."
        : "Resolve is starting. The splash can take a minute — use Show saved folder when you’re ready to import."
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
  if (files.length > 200) throw new Error("Max 200 files per ingest batch");

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
      buf.length <= 48_000
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
      });
    }

    if (!requireAuth(req)) {
      return json(res, 401, { error: "Missing agent session token" });
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
  console.log(`[ShootSpine Desktop Agent] DEV_OPEN=${DEV_OPEN ? "1" : "0"}`);
});
