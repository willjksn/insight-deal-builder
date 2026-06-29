"use client";

import { useRef, useState } from "react";
import { Film, ImagePlus, Link2, Trash2, Upload, X } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import {
  SCRIPT_IMAGE_TAG_LABELS,
  SCRIPT_MAX_IMAGES,
  SCRIPT_MAX_URLS,
  SCRIPT_MAX_VIDEO_SECONDS,
  SCRIPT_URL_TAG_LABELS,
  SCRIPT_VIDEO_MODE_LABELS,
} from "@/lib/scriptWriter/constants";
import {
  PendingInspirationImage,
  PendingInspirationUrl,
  PendingInspirationVideo,
} from "@/lib/scriptWriter/apiClient";
import {
  ScriptImageTag,
  ScriptInspirationUrlTag,
  ScriptVideoReferenceMode,
} from "@/lib/scriptWriter/types";
import { normalizeInspirationUrl } from "@/lib/scriptWriter/inspirationUrlUtils";

interface InspirationUploadSectionProps {
  images: PendingInspirationImage[];
  video: PendingInspirationVideo | null;
  urls: PendingInspirationUrl[];
  onImagesChange: (images: PendingInspirationImage[]) => void;
  onVideoChange: (video: PendingInspirationVideo | null) => void;
  onUrlsChange: (urls: PendingInspirationUrl[]) => void;
}

export function InspirationUploadSection({
  images,
  video,
  urls,
  onImagesChange,
  onVideoChange,
  onUrlsChange,
}: InspirationUploadSectionProps) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [urlDraft, setUrlDraft] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);

  const addImages = (files: FileList | null) => {
    if (!files?.length) return;
    const next = [...images];
    for (const file of Array.from(files)) {
      if (next.length >= SCRIPT_MAX_IMAGES) break;
      if (!file.type.startsWith("image/")) continue;
      next.push({
        id: crypto.randomUUID(),
        file,
        tag: "location",
        label: file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "),
      });
    }
    onImagesChange(next);
  };

  const addVideo = (files: FileList | null) => {
    const file = files?.[0];
    if (!file?.type.startsWith("video/")) return;
    onVideoChange({
      id: crypto.randomUUID(),
      file,
      referenceMode: "inspired_by",
    });
  };

  const addUrl = () => {
    setUrlError(null);
    const normalized = normalizeInspirationUrl(urlDraft);
    if (!normalized) {
      setUrlError("Enter a valid http(s) URL");
      return;
    }
    if (urls.length >= SCRIPT_MAX_URLS) {
      setUrlError(`Maximum ${SCRIPT_MAX_URLS} links`);
      return;
    }
    onUrlsChange([
      ...urls,
      {
        id: crypto.randomUUID(),
        url: normalized,
        tag: "reference_clip",
        label: "Reference link",
        referenceMode: "inspired_by",
      },
    ]);
    setUrlDraft("");
  };

  const hasAny = Boolean(video) || images.length > 0 || urls.length > 0;

  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-4">
      <div className="mb-3">
        <p className="text-sm font-medium text-slate-800">Inspiration (optional)</p>
        <p className="text-xs text-slate-500">
          Upload files or paste links (YouTube, Instagram, direct image/video URLs). Best results:
          download shorts and upload, or use a direct .mp4 link.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          ref={videoInputRef}
          type="file"
          accept="video/mp4,video/quicktime,video/webm"
          className="hidden"
          onChange={(e) => {
            addVideo(e.target.files);
            e.target.value = "";
          }}
        />
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            addImages(e.target.files);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => videoInputRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:border-violet-300 hover:text-violet-800"
        >
          <Film className="h-3.5 w-3.5" />
          {video ? "Replace clip" : "Upload clip"}
        </button>
        <button
          type="button"
          disabled={images.length >= SCRIPT_MAX_IMAGES}
          onClick={() => imageInputRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:border-violet-300 hover:text-violet-800 disabled:opacity-50"
        >
          <ImagePlus className="h-3.5 w-3.5" />
          Add photos
        </button>
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
        <Input
          label="Reference URL"
          value={urlDraft}
          onChange={(e) => setUrlDraft(e.target.value)}
          placeholder="https://youtube.com/shorts/… or direct .mp4 / image link"
          className="flex-1 text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addUrl();
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={urls.length >= SCRIPT_MAX_URLS || !urlDraft.trim()}
          onClick={addUrl}
          className="shrink-0 sm:mb-0"
        >
          <Link2 className="mr-1.5 h-3.5 w-3.5" />
          Add link
        </Button>
      </div>
      {urlError ? <p className="mt-1 text-xs text-red-600">{urlError}</p> : null}

      {video ? (
        <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900">{video.file.name}</p>
              <p className="text-xs text-slate-500">
                {(video.file.size / (1024 * 1024)).toFixed(1)} MB · ~{SCRIPT_MAX_VIDEO_SECONDS}s max
              </p>
            </div>
            <button
              type="button"
              aria-label="Remove video"
              onClick={() => onVideoChange(null)}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-2">
            <Select
              label="Clip use"
              value={video.referenceMode}
              onChange={(e) =>
                onVideoChange({
                  ...video,
                  referenceMode: e.target.value as ScriptVideoReferenceMode,
                })
              }
              options={(
                Object.entries(SCRIPT_VIDEO_MODE_LABELS) as [ScriptVideoReferenceMode, string][]
              ).map(([value, label]) => ({ value, label }))}
              className="text-sm"
            />
          </div>
        </div>
      ) : null}

      {urls.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {urls.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3 sm:flex-row sm:items-end"
            >
              <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    URL
                  </p>
                  <p className="truncate text-sm text-violet-800">{item.url}</p>
                </div>
                <Select
                  label="Tag"
                  value={item.tag}
                  onChange={(e) =>
                    onUrlsChange(
                      urls.map((u) =>
                        u.id === item.id
                          ? {
                              ...u,
                              tag: e.target.value as ScriptInspirationUrlTag,
                              referenceMode:
                                e.target.value === "reference_clip"
                                  ? u.referenceMode ?? "inspired_by"
                                  : undefined,
                            }
                          : u
                      )
                    )
                  }
                  options={(
                    Object.entries(SCRIPT_URL_TAG_LABELS) as [ScriptInspirationUrlTag, string][]
                  ).map(([value, label]) => ({ value, label }))}
                  className="text-sm"
                />
                <Input
                  label="Label"
                  value={item.label}
                  onChange={(e) =>
                    onUrlsChange(
                      urls.map((u) => (u.id === item.id ? { ...u, label: e.target.value } : u))
                    )
                  }
                  placeholder="Kitchen tour, horror short ref…"
                  className="text-sm"
                />
                {item.tag === "reference_clip" ? (
                  <div className="sm:col-span-2">
                    <Select
                      label="Clip use"
                      value={item.referenceMode ?? "inspired_by"}
                      onChange={(e) =>
                        onUrlsChange(
                          urls.map((u) =>
                            u.id === item.id
                              ? {
                                  ...u,
                                  referenceMode: e.target.value as ScriptVideoReferenceMode,
                                }
                              : u
                          )
                        )
                      }
                      options={(
                        Object.entries(SCRIPT_VIDEO_MODE_LABELS) as [
                          ScriptVideoReferenceMode,
                          string,
                        ][]
                      ).map(([value, label]) => ({ value, label }))}
                      className="text-sm"
                    />
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                aria-label="Remove URL"
                onClick={() => onUrlsChange(urls.filter((u) => u.id !== item.id))}
                className="self-end rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {images.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {images.map((img) => (
            <li
              key={img.id}
              className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3 sm:flex-row sm:items-end"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={URL.createObjectURL(img.file)}
                  alt=""
                  className="h-14 w-14 shrink-0 rounded-lg object-cover"
                />
                <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
                  <Select
                    label="Tag"
                    value={img.tag}
                    onChange={(e) =>
                      onImagesChange(
                        images.map((i) =>
                          i.id === img.id
                            ? { ...i, tag: e.target.value as ScriptImageTag }
                            : i
                        )
                      )
                    }
                    options={(
                      Object.entries(SCRIPT_IMAGE_TAG_LABELS) as [ScriptImageTag, string][]
                    ).map(([value, label]) => ({ value, label }))}
                    className="text-sm"
                  />
                  <Input
                    label="Label"
                    value={img.label}
                    onChange={(e) =>
                      onImagesChange(
                        images.map((i) =>
                          i.id === img.id ? { ...i, label: e.target.value } : i
                        )
                      )
                    }
                    placeholder="Kitchen, pool, etc."
                    className="text-sm"
                  />
                </div>
              </div>
              <button
                type="button"
                aria-label="Remove image"
                onClick={() => onImagesChange(images.filter((i) => i.id !== img.id))}
                className="self-end rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {!hasAny ? (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
          <Upload className="h-3.5 w-3.5" />
          No inspiration yet — text idea only is fine.
        </p>
      ) : null}
    </div>
  );
}
