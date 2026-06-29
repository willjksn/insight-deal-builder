import { fetchMediaInlineData } from "@/lib/scout/geminiClient";
import type { GeminiMediaInput } from "@/lib/scout/geminiClient";
import { SCRIPT_VIDEO_MODE_LABELS } from "@/lib/scriptWriter/constants";
import { normalizeInspirationUrl } from "@/lib/scriptWriter/inspirationUrlUtils";
import {
  ScriptInspirationImage,
  ScriptInspirationUrl,
  ScriptInspirationVideo,
} from "@/lib/scriptWriter/types";

const FETCH_UA =
  "Mozilla/5.0 (compatible; InsightDealBuilder/1.0; +https://insight-deal-builder.web.app)";

function extractYoutubeVideoId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) {
      return u.pathname.slice(1).split("/")[0] || null;
    }
    if (u.hostname.includes("youtube.com")) {
      if (u.pathname.startsWith("/shorts/")) {
        return u.pathname.split("/")[2] || null;
      }
      return u.searchParams.get("v");
    }
  } catch {
    return null;
  }
  return null;
}

function isInstagramUrl(url: string): boolean {
  try {
    return new URL(url).hostname.includes("instagram.com");
  } catch {
    return false;
  }
}

function isDirectMediaUrl(url: string): boolean {
  return /\.(jpg|jpeg|png|webp|gif|mp4|webm|mov)(\?|$)/i.test(url);
}

async function fetchNoembedMeta(url: string): Promise<{
  title?: string;
  thumbnailUrl?: string;
  provider?: string;
  description?: string;
} | null> {
  try {
    const res = await fetch(
      `https://noembed.com/embed?url=${encodeURIComponent(url)}`,
      { signal: AbortSignal.timeout(12_000) }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      title?: string;
      thumbnail_url?: string;
      provider_name?: string;
      description?: string;
    };
    return {
      title: data.title,
      thumbnailUrl: data.thumbnail_url,
      provider: data.provider_name,
      description: data.description,
    };
  } catch {
    return null;
  }
}

async function fetchInstagramOembed(url: string): Promise<{ title?: string; thumbnailUrl?: string } | null> {
  try {
    const res = await fetch(
      `https://api.instagram.com/oembed?url=${encodeURIComponent(url)}`,
      { signal: AbortSignal.timeout(12_000) }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { title?: string; thumbnail_url?: string };
    return { title: data.title, thumbnailUrl: data.thumbnail_url };
  } catch {
    return null;
  }
}

async function probeMediaUrl(url: string): Promise<{ kind: "image" | "video"; url: string } | null> {
  try {
    const head = await fetch(url, {
      method: "HEAD",
      headers: { "User-Agent": FETCH_UA },
      signal: AbortSignal.timeout(15_000),
      redirect: "follow",
    });
    const type = head.headers.get("content-type")?.split(";")[0]?.toLowerCase() ?? "";
    if (type.startsWith("image/")) return { kind: "image", url };
    if (type.startsWith("video/")) return { kind: "video", url };
  } catch {
    /* fall through to GET */
  }

  try {
    const inline = await fetchMediaInlineData(url, 20 * 1024 * 1024);
    if (!inline) return null;
    if (inline.mimeType.startsWith("image/")) return { kind: "image", url };
    if (inline.mimeType.startsWith("video/")) return { kind: "video", url };
  } catch {
    return null;
  }
  return null;
}

async function extractOgImage(pageUrl: string): Promise<string | null> {
  try {
    const res = await fetch(pageUrl, {
      headers: { "User-Agent": FETCH_UA },
      signal: AbortSignal.timeout(15_000),
      redirect: "follow",
    });
    if (!res.ok) return null;
    const html = await res.text();
    const ogImage =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)?.[1];
    if (!ogImage) return null;
    return new URL(ogImage, pageUrl).toString();
  } catch {
    return null;
  }
}

export async function resolveInspirationUrl(
  input: Pick<ScriptInspirationUrl, "id" | "url" | "tag" | "label" | "referenceMode">
): Promise<ScriptInspirationUrl> {
  const normalized = normalizeInspirationUrl(input.url);
  if (!normalized) {
    throw new Error(`Invalid URL: ${input.url}`);
  }

  const base: ScriptInspirationUrl = {
    ...input,
    url: normalized,
  };

  if (isDirectMediaUrl(normalized)) {
    const probed = await probeMediaUrl(normalized);
    if (probed) {
      return {
        ...base,
        fetchUrl: probed.url,
        fetchKind: probed.kind,
        pageTitle: input.label || "Direct media link",
      };
    }
  }

  const youtubeId = extractYoutubeVideoId(normalized);
  if (youtubeId) {
    const meta = await fetchNoembedMeta(normalized);
    const thumb =
      meta?.thumbnailUrl ??
      `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
    return {
      ...base,
      fetchUrl: thumb,
      fetchKind: "image",
      pageTitle: meta?.title ?? "YouTube reference",
      pageDescription: meta?.description ?? `YouTube video ${youtubeId}`,
      provider: "YouTube",
    };
  }

  if (isInstagramUrl(normalized)) {
    const ig = await fetchInstagramOembed(normalized);
    if (ig?.thumbnailUrl) {
      return {
        ...base,
        fetchUrl: ig.thumbnailUrl,
        fetchKind: "image",
        pageTitle: ig.title ?? "Instagram reference",
        provider: "Instagram",
      };
    }
    const meta = await fetchNoembedMeta(normalized);
    if (meta?.thumbnailUrl) {
      return {
        ...base,
        fetchUrl: meta.thumbnailUrl,
        fetchKind: "image",
        pageTitle: meta.title ?? "Instagram reference",
        pageDescription: meta.description,
        provider: "Instagram",
      };
    }
    return {
      ...base,
      pageTitle: "Instagram reference",
      pageDescription: `User linked Instagram content: ${normalized}. Treat as short-form visual reference.`,
      provider: "Instagram",
    };
  }

  const probed = await probeMediaUrl(normalized);
  if (probed) {
    return {
      ...base,
      fetchUrl: probed.url,
      fetchKind: probed.kind,
    };
  }

  const meta = await fetchNoembedMeta(normalized);
  if (meta?.thumbnailUrl) {
    return {
      ...base,
      fetchUrl: meta.thumbnailUrl,
      fetchKind: "image",
      pageTitle: meta.title,
      pageDescription: meta.description,
      provider: meta.provider,
    };
  }

  const ogImage = await extractOgImage(normalized);
  if (ogImage) {
    return {
      ...base,
      fetchUrl: ogImage,
      fetchKind: "image",
      pageTitle: input.label || "Web reference",
    };
  }

  return {
    ...base,
    pageTitle: input.label || "Reference link",
    pageDescription: `User linked reference URL: ${normalized}`,
  };
}

export async function resolveInspirationUrls(
  urls: Pick<ScriptInspirationUrl, "id" | "url" | "tag" | "label" | "referenceMode">[]
): Promise<ScriptInspirationUrl[]> {
  const resolved: ScriptInspirationUrl[] = [];
  for (const item of urls) {
    resolved.push(await resolveInspirationUrl(item));
  }
  return resolved;
}

export function inspirationUrlContextLines(urls: ScriptInspirationUrl[]): string[] {
  const lines: string[] = [];
  for (const u of urls) {
    const parts = [
      `Reference URL (${u.tag}${u.label ? `: ${u.label}` : ""}): ${u.url}`,
    ];
    if (u.provider) parts.push(`Provider: ${u.provider}`);
    if (u.pageTitle) parts.push(`Title: ${u.pageTitle}`);
    if (u.pageDescription) parts.push(`Notes: ${u.pageDescription}`);
    if (u.tag === "reference_clip" && u.referenceMode) {
      parts.push(`Clip mode: ${SCRIPT_VIDEO_MODE_LABELS[u.referenceMode]}`);
    }
    if (!u.fetchUrl) {
      parts.push(
        "Visual could not be fetched — use the link context and any thumbnail if attached."
      );
    }
    lines.push(parts.join("\n"));
  }
  return lines;
}

export async function buildInspirationMediaBundle(params: {
  images: ScriptInspirationImage[];
  video?: ScriptInspirationVideo | null;
  urls?: ScriptInspirationUrl[];
}): Promise<{ media: GeminiMediaInput[]; contextLines: string[] }> {
  const { images, video, urls = [] } = params;
  const media: GeminiMediaInput[] = [];
  const contextLines = inspirationUrlContextLines(urls);

  if (video?.storageUrl) {
    media.push({
      url: video.storageUrl,
      kind: "video",
      label: `reference clip (${SCRIPT_VIDEO_MODE_LABELS[video.referenceMode]})`,
    });
  }

  for (const img of images) {
    media.push({
      url: img.storageUrl,
      kind: "image",
      label: img.label ? `${img.tag}: ${img.label}` : img.tag,
    });
  }

  for (const u of urls) {
    if (u.tag === "reference_clip" && video?.storageUrl) continue;
    if (u.fetchUrl && u.fetchKind) {
      media.push({
        url: u.fetchUrl,
        kind: u.fetchKind,
        label: u.label
          ? `${u.tag}: ${u.label}`
          : u.pageTitle
            ? `${u.tag}: ${u.pageTitle}`
            : `${u.tag} (${u.url})`,
      });
    }
  }

  return { media, contextLines };
}

export function hasInspirationInput(params: {
  images?: ScriptInspirationImage[];
  video?: ScriptInspirationVideo | null;
  urls?: ScriptInspirationUrl[];
}): boolean {
  return (
    (params.images?.length ?? 0) > 0 ||
    Boolean(params.video) ||
    (params.urls?.length ?? 0) > 0
  );
}
