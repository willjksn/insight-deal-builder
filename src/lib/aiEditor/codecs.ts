/**
 * Codec classification for AI Editor.
 * Strategy: do not rely on Windows native codecs for preview/analysis.
 * Use FFmpeg to probe and generate H.264 proxies for difficult camera formats.
 */

export type CodecFamily =
  | "xavc_hs"
  | "xavc_s"
  | "xavc_s_i"
  | "xavc"
  | "hevc"
  | "h264"
  | "prores"
  | "dnx"
  | "raw"
  | "audio"
  | "other"
  | "unknown";

export type CodecClassification = {
  family: CodecFamily;
  label: string;
  /** Prefer proxy for preview / AI analysis (originals stay untouched). */
  needsProxy: boolean;
  reason?: string;
};

function blobFromProbe(input: {
  codec?: string;
  codecLongName?: string;
  codecTag?: string;
  container?: string;
  filename?: string;
}): string {
  return [
    input.codec,
    input.codecLongName,
    input.codecTag,
    input.container,
    input.filename,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

/**
 * Classify camera / delivery codecs from FFprobe-ish fields.
 * Accepts common misspellings (XAVS → XAVC).
 */
export function classifyCodec(input: {
  codec?: string;
  codecLongName?: string;
  codecTag?: string;
  container?: string;
  filename?: string;
  mediaType?: string;
}): CodecClassification {
  if (input.mediaType === "audio") {
    return { family: "audio", label: "Audio", needsProxy: false };
  }

  const blob = blobFromProbe(input);
  const codec = (input.codec || "").toLowerCase();

  // Sony XAVC family (user may type XAVS)
  const isXavc =
    /\bxavc\b/.test(blob) ||
    /\bxavs\b/.test(blob) ||
    blob.includes("sony xavc") ||
    (blob.includes("xavc") && blob.includes("mpeg"));

  if (isXavc || (/\bxav/.test(blob) && (codec === "h264" || codec === "hevc" || codec === "h265"))) {
    if (
      blob.includes("s-i") ||
      blob.includes("s_i") ||
      blob.includes("si ") ||
      blob.includes("intra") ||
      blob.includes("xavc s-i") ||
      blob.includes("xavs s-i")
    ) {
      return {
        family: "xavc_s_i",
        label: "XAVC S-I",
        needsProxy: true,
        reason: "Intra XAVC often fails in Windows players — use an H.264 proxy for preview/AI.",
      };
    }
    if (
      blob.includes("hs") ||
      codec === "hevc" ||
      codec === "h265" ||
      blob.includes("xavc hs") ||
      blob.includes("xavs hs")
    ) {
      return {
        family: "xavc_hs",
        label: "XAVC HS",
        needsProxy: true,
        reason: "XAVC HS (H.265) needs HEVC support or an H.264 proxy for reliable preview.",
      };
    }
    if (blob.includes("xavc s") || blob.includes("xavs s") || codec === "h264" || codec === "avc") {
      return {
        family: "xavc_s",
        label: "XAVC S",
        needsProxy: true,
        reason: "XAVC S can be flaky in Windows — proxy to H.264 for ShootSpine preview/AI.",
      };
    }
    return {
      family: "xavc",
      label: "XAVC",
      needsProxy: true,
      reason: "Sony XAVC — generate a proxy so preview does not depend on Windows codecs.",
    };
  }

  if (codec === "hevc" || codec === "h265") {
    return {
      family: "hevc",
      label: "H.265 / HEVC",
      needsProxy: true,
      reason: "HEVC playback varies on Windows — proxy recommended for AI Editor.",
    };
  }

  if (codec === "h264" || codec === "avc" || codec === "avc1") {
    return { family: "h264", label: "H.264", needsProxy: false };
  }

  if (blob.includes("prores")) {
    return {
      family: "prores",
      label: "ProRes",
      needsProxy: true,
      reason: "ProRes is fine in Resolve; use a proxy for lightweight AI Editor preview.",
    };
  }

  if (blob.includes("dnx")) {
    return {
      family: "dnx",
      label: "DNxHR / DNxHD",
      needsProxy: true,
      reason: "Proxy recommended for browser/AI Editor preview.",
    };
  }

  if (blob.includes("raw") || blob.includes("braw") || blob.includes("r3d")) {
    return {
      family: "raw",
      label: "Camera RAW",
      needsProxy: true,
      reason: "RAW is not for browser preview — proxies required.",
    };
  }

  return { family: "other", label: codec || "Unknown", needsProxy: false };
}
