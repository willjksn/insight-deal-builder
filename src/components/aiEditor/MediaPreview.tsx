"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, X } from "lucide-react";

export type PreviewItem = {
  path: string;
  label: string;
  /** Source in-point (seconds) */
  startSeconds?: number;
  /** Source out-point (seconds) */
  endSeconds?: number;
};

type Props = {
  title: string;
  items: PreviewItem[];
  /** Fully resolved stream URL builder for the current item */
  resolveUrl: (item: PreviewItem) => string;
  onClose: () => void;
};

const IMAGE_EXT = /\.(jpe?g|png|gif|webp|bmp|tif{1,2})$/i;

function isImagePath(path: string): boolean {
  return IMAGE_EXT.test(path.split(/[?#]/)[0] || "");
}

export function MediaPreview({ title, items, resolveUrl, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const advancingRef = useRef(false);
  const [index, setIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const item = items[index];
  const src = item ? resolveUrl(item) : "";
  const asImage = item ? isImagePath(item.path) : false;

  useEffect(() => {
    setIndex(0);
    setError(null);
    setLoading(true);
    advancingRef.current = false;
  }, [items]);

  useEffect(() => {
    advancingRef.current = false;
  }, [index, src]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  useEffect(() => {
    if (asImage) return;
    const el = videoRef.current;
    if (!el || !item) return;
    setLoading(true);
    setError(null);

    const start = item.startSeconds ?? 0;
    const seekAndPlay = () => {
      try {
        if (start > 0 && Number.isFinite(start)) {
          el.currentTime = start;
        }
      } catch {
        /* some codecs reject seek until more data arrives */
      }
      const play = el.play();
      if (play && typeof play.catch === "function") {
        play.catch(() => {
          /* autoplay may be blocked until user hits play — controls remain */
        });
      }
    };

    const stuckTimer = window.setTimeout(() => {
      setLoading(false);
      if (el.readyState < 2) {
        setError(
          "This file isn’t loading in the browser. Use Step 4 to Prepare clips (lighter preview copies), then Watch again. Originals stay untouched for Resolve."
        );
      }
    }, 10000);
    el.addEventListener("loadedmetadata", seekAndPlay);
    el.load();
    return () => {
      window.clearTimeout(stuckTimer);
      el.removeEventListener("loadedmetadata", seekAndPlay);
    };
  }, [src, item, asImage]);

  function advance() {
    if (advancingRef.current) return;
    if (index >= items.length - 1) return;
    advancingRef.current = true;
    const el = videoRef.current;
    if (el) el.pause();
    setIndex((i) => i + 1);
  }

  if (!item) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 text-white shadow-2xl">
        <div className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
          <div className="min-w-0">
            <div className="truncate font-medium">{title}</div>
            <div className="truncate text-xs text-slate-300">
              {item.label}
              {items.length > 1 ? ` · ${index + 1}/${items.length}` : ""}
            </div>
          </div>
          <button
            type="button"
            className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10 hover:text-white"
            onClick={onClose}
            aria-label="Close preview"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="relative aspect-video bg-black">
          {loading ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : null}
          {asImage ? (
            // eslint-disable-next-line @next/next/no-img-element -- local agent stream URL
            <img
              key={`${src}_${index}`}
              src={src}
              alt={item.label}
              className="h-full w-full object-contain"
              onLoad={() => setLoading(false)}
              onError={() => {
                setLoading(false);
                setError("Couldn’t load this still from the Desktop Agent.");
              }}
            />
          ) : (
            <video
              ref={videoRef}
              key={`${src}_${index}`}
              className="h-full w-full"
              controls
              playsInline
              preload="metadata"
              src={src}
              onLoadedData={() => setLoading(false)}
              onCanPlay={() => setLoading(false)}
              onError={() => {
                setLoading(false);
                setError(
                  "This camera original can’t play here (FX3 XAVC / 4K often fails in browsers and Windows Media Player). Close this, click Watch again to build a light preview, or open the file in DaVinci Resolve / VLC. Originals stay untouched for Resolve."
                );
              }}
              onEnded={() => advance()}
              onTimeUpdate={() => {
                const el = videoRef.current;
                if (!el || item.endSeconds == null || advancingRef.current) return;
                if (el.currentTime >= item.endSeconds - 0.05) {
                  advance();
                }
              }}
            />
          )}
        </div>
        {error ? <p className="px-3 py-2 text-xs text-amber-200">{error}</p> : null}
        <p className="px-3 py-2 text-[11px] text-slate-400">
          Playing from this computer — nothing uploads to the cloud. Esc or click outside to close.
        </p>
      </div>
    </div>
  );
}
