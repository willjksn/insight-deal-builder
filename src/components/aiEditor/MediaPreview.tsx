"use client";

import { useEffect, useRef, useState } from "react";
import {
  Clapperboard,
  Loader2,
  SkipBack,
  SkipForward,
  Star,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
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
  /** Optional still for the clip strip. */
  thumbnailDataUrl?: string;
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
  /** Undo the last Drop/reorder (restore prior timeline version + replay). */
  onUndoDrop?: () => Promise<void> | void;
  /** Whether Undo is available for this Play session. */
  canUndoDrop?: boolean;
  /** Persist a new visible-clip order (drag or [ ]). */
  onReorderClips?: (orderedClipIds: string[]) => Promise<void> | void;
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
  onUndoDrop,
  canUndoDrop = false,
  onReorderClips,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const stripRef = useRef<HTMLDivElement | null>(null);
  const advancingRef = useRef(false);
  const dragFromRef = useRef<number | null>(null);
  const [items, setItems] = useState(initialItems);
  const [index, setIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState(false);
  const [preferring, setPreferring] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);
  const [undoing, setUndoing] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [preferDirty, setPreferDirty] = useState(false);
  const [actionNote, setActionNote] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const item = items[index];
  const src = item ? resolveUrl(item) : "";
  const asImage = item ? isImagePath(item.path) : false;
  const reviewMode = Boolean(
    onRemoveClip || onPreferClip || onRebuildCut || onUndoDrop || onReorderClips
  );
  const busyAction = removing || preferring || rebuilding || undoing || reordering;
  const canPrefer =
    Boolean(onPreferClip && item?.plannedShotId && item?.mediaAssetId) &&
    !item?.isPreferred;
  const showUndo = Boolean(onUndoDrop && canUndoDrop);
  const canReorder = Boolean(onReorderClips && items.length > 1);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "ArrowRight" && item) {
        e.preventDefault();
        goTo(index + 1);
        return;
      }
      if (e.key === "ArrowLeft" && item) {
        e.preventDefault();
        goTo(index - 1);
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
        return;
      }
      if (
        (e.key === "u" || e.key === "U" || ((e.ctrlKey || e.metaKey) && e.key === "z")) &&
        showUndo &&
        !busyAction
      ) {
        e.preventDefault();
        void undoDrop();
        return;
      }
      if (e.key === "[" && canReorder && !busyAction) {
        e.preventDefault();
        void moveClip(index, index - 1);
        return;
      }
      if (e.key === "]" && canReorder && !busyAction) {
        e.preventDefault();
        void moveClip(index, index + 1);
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
  }, [
    onClose,
    onRemoveClip,
    onPreferClip,
    onRebuildCut,
    onUndoDrop,
    onReorderClips,
    index,
    items,
    canPrefer,
    busyAction,
    showUndo,
    canReorder,
    item,
  ]);

  useEffect(() => {
    advancingRef.current = false;
  }, [index, src]);

  useEffect(() => {
    const root = stripRef.current;
    if (!root) return;
    const active = root.querySelector<HTMLElement>(`[data-strip-index="${index}"]`);
    active?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [index, items.length]);

  useEffect(() => {
    if (!item || asImage) return;
    const el = videoRef.current;
    if (!el) return;
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

  function goTo(nextIndex: number) {
    if (busyAction) return;
    if (nextIndex < 0 || nextIndex >= items.length) return;
    if (nextIndex === index) return;
    // Guard double-fire from ended + timeupdate on auto-advance.
    if (advancingRef.current) return;
    advancingRef.current = true;
    const el = videoRef.current;
    if (el) el.pause();
    setIndex(nextIndex);
  }

  function advance() {
    goTo(index + 1);
  }

  function goPrev() {
    goTo(index - 1);
  }

  async function moveClip(from: number, to: number) {
    if (!onReorderClips || busyAction) return;
    if (from < 0 || to < 0 || from >= items.length || to >= items.length) return;
    if (from === to) return;
    const prev = items;
    const prevIndex = index;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    if (!moved?.clipId) return;
    next.splice(to, 0, moved);
    const orderedIds = next.map((i) => i.clipId).filter((id): id is string => Boolean(id));
    if (orderedIds.length !== next.length) {
      setError("Can’t reorder — a clip is missing its id.");
      return;
    }
    setReordering(true);
    setError(null);
    setItems(next);
    setIndex(to);
    setActionNote("Saving new order…");
    try {
      await onReorderClips(orderedIds);
      setActionNote("Reordered · U undoes");
    } catch (e) {
      setItems(prev);
      setIndex(prevIndex);
      setError(e instanceof Error ? e.message : "Could not reorder cut");
      setActionNote(null);
    } finally {
      setReordering(false);
      dragFromRef.current = null;
      setDragOverIndex(null);
    }
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
          setActionNote("Cut empty · U undoes the last edit");
          setIndex(0);
          return next;
        }
        setActionNote(
          next.length === 1
            ? "Dropped · 1 clip left · U undoes"
            : `Dropped · ${next.length} clips left · U undoes`
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
      setPreferDirty(false);
      setActionNote("Cut rebuilt · playing new assembly");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not rebuild cut");
      setActionNote(null);
    } finally {
      setRebuilding(false);
    }
  }

  async function undoDrop() {
    if (!onUndoDrop || !canUndoDrop || busyAction) return;
    setUndoing(true);
    setError(null);
    setActionNote("Undoing last edit…");
    const el = videoRef.current;
    if (el) el.pause();
    try {
      await onUndoDrop();
      setActionNote("Undone · playing restored cut");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not undo drop");
      setActionNote(null);
    } finally {
      setUndoing(false);
    }
  }

  const clipStrip =
    reviewMode && items.length > 1 ? (
      <div
        ref={stripRef}
        className="flex gap-1.5 overflow-x-auto border-t border-slate-800 px-3 py-2 scrollbar-thin"
        role="listbox"
        aria-label="Clips in this cut — drag to reorder"
      >
        {items.map((clip, i) => {
          const active = i === index;
          const label = clip.shotLabel || clip.label;
          const dropTarget = dragOverIndex === i && dragFromRef.current !== i;
          return (
            <button
              key={clip.clipId || `${clip.path}_${i}`}
              type="button"
              role="option"
              aria-selected={active}
              data-strip-index={i}
              disabled={busyAction}
              draggable={canReorder && !busyAction}
              title={canReorder ? `${label} — drag to reorder` : label}
              onClick={() => goTo(i)}
              onDragStart={(e) => {
                if (!canReorder || busyAction) return;
                dragFromRef.current = i;
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", String(i));
              }}
              onDragEnd={() => {
                dragFromRef.current = null;
                setDragOverIndex(null);
              }}
              onDragOver={(e) => {
                if (!canReorder || busyAction) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                setDragOverIndex(i);
              }}
              onDragLeave={() => {
                setDragOverIndex((cur) => (cur === i ? null : cur));
              }}
              onDrop={(e) => {
                e.preventDefault();
                const from =
                  dragFromRef.current ??
                  Number.parseInt(e.dataTransfer.getData("text/plain"), 10);
                setDragOverIndex(null);
                dragFromRef.current = null;
                if (!Number.isFinite(from)) return;
                void moveClip(from, i);
              }}
              className={`relative w-20 shrink-0 cursor-grab overflow-hidden rounded-lg border text-left transition active:cursor-grabbing ${
                active
                  ? "border-sky-400 ring-1 ring-sky-400/60"
                  : dropTarget
                    ? "border-amber-400 ring-1 ring-amber-400/50"
                    : "border-slate-700 hover:border-slate-500"
              } ${busyAction ? "opacity-60" : ""}`}
            >
              {clip.thumbnailDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- local data URL still
                <img
                  src={clip.thumbnailDataUrl}
                  alt=""
                  className="pointer-events-none h-12 w-full object-cover bg-slate-900"
                  draggable={false}
                />
              ) : (
                <div className="flex h-12 items-center justify-center bg-slate-900 text-[10px] text-slate-500">
                  {i + 1}
                </div>
              )}
              <div className="truncate px-1 py-0.5 text-[10px] text-slate-300">
                {clip.isPreferred ? "★ " : ""}
                {label}
              </div>
            </button>
          );
        })}
      </div>
    ) : null;

  const toolbar = reviewMode ? (
    <div className="flex flex-wrap items-center gap-2 border-t border-slate-800 px-3 py-2">
      {item ? (
        <>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={busyAction || index <= 0}
            onClick={() => goPrev()}
          >
            <SkipBack className="mr-1.5 h-3.5 w-3.5" />
            Prev
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={busyAction || index >= items.length - 1}
            onClick={() => advance()}
          >
            <SkipForward className="mr-1.5 h-3.5 w-3.5" />
            Next
          </Button>
        </>
      ) : null}
      {item && canPrefer ? (
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
      ) : item?.isPreferred ? (
        <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-700/50 bg-emerald-950/40 px-2 py-1 text-[11px] text-emerald-300">
          <Star className="h-3 w-3" />
          Preferred
        </span>
      ) : null}
      {item?.clipId && onRemoveClip ? (
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
      {showUndo ? (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={busyAction}
          onClick={() => void undoDrop()}
        >
          {undoing ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Undo2 className="mr-1.5 h-3.5 w-3.5" />
          )}
          Undo
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
        {item ? "← → jump" : "Cut empty"}
        {canReorder ? " · drag / [ ] reorder" : ""}
        {onPreferClip ? " · P prefer" : ""}
        {onRemoveClip ? " · Delete drops" : ""}
        {showUndo ? " · U undo" : ""}
        {onRebuildCut ? " · R rebuild" : ""}
      </span>
      {actionNote ? (
        <span className="ml-auto text-[11px] text-emerald-300">{actionNote}</span>
      ) : null}
    </div>
  ) : null;

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
              {item ? (
                <>
                  {item.label}
                  {item.shotLabel ? ` · ${item.shotLabel}` : ""}
                  {item.isPreferred ? " · preferred" : ""}
                  {items.length > 1 ? ` · ${index + 1}/${items.length}` : ""}
                </>
              ) : (
                "No clips in cut"
              )}
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
          {!item ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
              <p className="text-sm text-slate-300">
                Every clip was dropped from this cut.
              </p>
              {showUndo ? (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={busyAction}
                  onClick={() => void undoDrop()}
                >
                  {undoing ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Undo2 className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Undo last edit
                </Button>
              ) : (
                <p className="text-xs text-slate-500">
                  Close and restore a version under Step 7, or rebuild the first cut.
                </p>
              )}
            </div>
          ) : (
            <>
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
            </>
          )}
        </div>
        {clipStrip}
        {toolbar}
        {error ? <p className="px-3 py-2 text-xs text-amber-200">{error}</p> : null}
        <p className="px-3 py-2 text-[11px] text-slate-400">
          Playing from this computer — nothing uploads to the cloud. Esc or click outside to close.
        </p>
      </div>
    </div>
  );
}
