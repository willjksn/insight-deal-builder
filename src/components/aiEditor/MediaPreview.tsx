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

export function MediaPreview({ title, items, resolveUrl, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [index, setIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const item = items[index];
  const src = item ? resolveUrl(item) : "";

  useEffect(() => {
    setIndex(0);
    setError(null);
    setLoading(true);
  }, [items]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !item) return;
    setLoading(true);
    setError(null);
    el.load();
    const play = el.play();
    if (play && typeof play.catch === "function") {
      play.catch(() => {
        /* autoplay may be blocked until user hits play — controls remain */
      });
    }
  }, [src, item]);

  if (!item) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 text-white shadow-lg">
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
        <video
          ref={videoRef}
          key={src}
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
              "Couldn’t play this file in the browser. Prepare a preview copy, or open it in Resolve."
            );
          }}
          onEnded={() => {
            if (index < items.length - 1) {
              setIndex((i) => i + 1);
            }
          }}
          onTimeUpdate={() => {
            const el = videoRef.current;
            if (!el || item.endSeconds == null) return;
            if (el.currentTime >= item.endSeconds - 0.05) {
              el.pause();
              if (index < items.length - 1) setIndex((i) => i + 1);
            }
          }}
        />
      </div>
      {error ? <p className="px-3 py-2 text-xs text-amber-200">{error}</p> : null}
      <p className="px-3 py-2 text-[11px] text-slate-400">
        Playing from this PC via Desktop Agent — nothing uploads to the cloud.
      </p>
    </div>
  );
}
