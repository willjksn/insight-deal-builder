"use client";

import { useEffect, useRef, useState } from "react";
import { Clapperboard, Loader2, SkipForward, Star, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

export type PreviewItem = {
  path: string;
  label: string;
  /** Timeline clip id when reviewing a rough cut (for Drop). */
  clipId?: string;
  /** Media asset id (for Prefer). */
  mediaAssetId?: string;
  /** Matched planned shot when coverage knows this take. */
  plannedShotId?: string;
  /** Shot list label for status (e.g. "Wide A"). */
  shotLabel?: string;
  /** Already the preferred take for plannedShotId. */
  isPreferred?: boolean;
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
  /** Rough-cut review: remove current clip from the cut (ripple delete). */
  onRemoveClip?: (clipId: string) => Promise<void> | void;
  /** Rough-cut review: mark current take preferred for its matched shot. */
  onPreferClip?: (item: PreviewItem) => Promise<void> | void;
  /** Rebuild assembly from preferred takes and reopen Play. */
  onRebuildCut?: () => Promise<void> | void;
};

const IMAGE_EXT = /\.(jpe?g|png|gif|webp|bmp|tif{1,2})$/i;

function isImagePath(path: string): boolean {
  return IMAGE_EXT.test(path.split(/[?#]/)[0] || "");
}

export function MediaPreview({
  title,
  items: initialItems,
  resolveUrl,
  onClose,
  onRemoveClip,
  onPreferClip,
  onRebuildCut,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const advancingRef = useRef(false);
  const [items, setItems] = useState(initialItems);
  const [index, setIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState(false);
  const [preferring, setPreferring] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);
  const [preferDirty, setPreferDirty] = useState(false);
  const [actionNote, setActionNote] = useState<string | null>(null);

  const item = items[index];
  const src = item ? resolveUrl(item) : "";
  const asImage = item ? isImagePath(item.path) : false;
  const reviewMode = Boolean(onRemoveClip || onPreferClip || onRebuildCut);
  const busyAction = removing || preferring || rebuilding;
  const canPrefer =
    Boolean(onPreferClip && item?.plannedShotId && item?.mediaAssetId) &&
    !item?.isPreferred;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        advance();
        return;
      }
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        onRemoveClip &&
        items[index]?.clipId
      ) {
        e.preventDefault();
        void removeCurrent();
        return;
      }
      if ((e.key === "p" || e.key === "P") && canPrefer) {
        e.preventDefault();
        void preferCurrent();
        return;
      }
      if ((e.key === "r" || e.key === "R") && onRebuildCut && !busyAction) {
        e.preventDefault();
        void rebuildCut();
      }
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- key handlers use latest via closures on each render
  }, [onClose, onRemoveClip, onPreferClip, onRebuildCut, index, items, canPrefer, busyAction]);

  useEffect(() => {
    advancingRef.current = false;
  }, [index, src]);

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

  async function removeCurrent() {
    const clipId = item?.clipId;
    if (!clipId || !onRemoveClip || busyAction) return;
    setRemoving(true);
    setError(null);
    try {
      await onRemoveClip(clipId);
      const el = videoRef.current;
      if (el) el.pause();
      setItems((prev) => {
        const next = prev.filter((i) => i.clipId !== clipId);
        if (!next.length) {
          onClose();
          return prev;
        }
        setActionNote(
          next.length === 1
            ? "Dropped · 1 clip left in cut"
            : `Dropped · ${next.length} clips left in cut`
        );
        setIndex((i) => Math.min(i, next.length - 1));
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove clip from cut");
    } finally {
      setRemoving(false);
    }
  }

  async function preferCurrent() {
    if (!item || !onPreferClip || !canPrefer || busyAction) return;
    setPreferring(true);
    setError(null);
    try {
      await onPreferClip(item);
      const shotId = item.plannedShotId;
      const mediaId = item.mediaAssetId;
      setItems((prev) =>
        prev.map((i) => {
          if (i.plannedShotId !== shotId) return i;
          return {
            ...i,
            isPreferred: i.mediaAssetId === mediaId,
          };
        })
      );
      setPreferDirty(true);
      setActionNote(
        item.shotLabel
          ? `Preferred for ${item.shotLabel} · R rebuilds the cut`
          : "Preferred · R rebuilds the cut"
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not set preferred take");
    } finally {
      setPreferring(false);
    }
  }

  async function rebuildCut() {
    if (!onRebuildCut || busyAction) return;
    setRebuilding(true);
    setError(null);
    setActionNote("Rebuilding cut from preferred takes…");
    const el = videoRef.current;
    if (el) el.pause();
    try {
      await onRebuildCut();
      // Parent remounts preview with a new session; if not, clear spinner.
      setPreferDirty(false);
      setActionNote("Cut rebuilt · playing new assembly");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not rebuild cut");
      setActionNote(null);
    } finally {
      setRebuilding(false);
    }
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
              {item.shotLabel ? ` · ${item.shotLabel}` : ""}
              {item.isPreferred ? " · preferred" : ""}
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
        {reviewMode ? (
          <div className="flex flex-wrap items-center gap-2 border-t border-slate-800 px-3 py-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={busyAction || index >= items.length - 1}
              onClick={() => advance()}
            >
              <SkipForward className="mr-1.5 h-3.5 w-3.5" />
              Skip
            </Button>
            {canPrefer ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={busyAction}
                onClick={() => void preferCurrent()}
              >
                {preferring ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Star className="mr-1.5 h-3.5 w-3.5" />
                )}
                Prefer this take
              </Button>
            ) : item.isPreferred ? (
              <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-700/50 bg-emerald-950/40 px-2 py-1 text-[11px] text-emerald-300">
                <Star className="h-3 w-3" />
                Preferred
              </span>
            ) : null}
            {item.clipId && onRemoveClip ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={busyAction}
                onClick={() => void removeCurrent()}
              >
                {removing ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                )}
                Drop from cut
              </Button>
            ) : null}
            {onRebuildCut ? (
              <Button
                type="button"
                size="sm"
                variant={preferDirty ? "primary" : "secondary"}
                disabled={busyAction}
                onClick={() => void rebuildCut()}
              >
                {rebuilding ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Clapperboard className="mr-1.5 h-3.5 w-3.5" />
                )}
                Rebuild cut
              </Button>
            ) : null}
            <span className="text-[11px] text-slate-400">
              → skip
              {onPreferClip ? " · P prefer" : ""}
              {onRemoveClip ? " · Delete drops" : ""}
              {onRebuildCut ? " · R rebuild" : ""}
            </span>
            {actionNote ? (
              <span className="ml-auto text-[11px] text-emerald-300">{actionNote}</span>
            ) : null}
          </div>
        ) : null}
        {error ? <p className="px-3 py-2 text-xs text-amber-200">{error}</p> : null}
        <p className="px-3 py-2 text-[11px] text-slate-400">
          Playing from this computer — nothing uploads to the cloud. Esc or click outside to close.
        </p>
      </div>
    </div>
  );
}
