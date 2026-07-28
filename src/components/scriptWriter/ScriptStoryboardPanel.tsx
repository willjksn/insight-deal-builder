"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ImageIcon, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatShotTypeLabel } from "@/lib/production/shotLabels";
import {
  deriveStoryboardFramesFromScript,
  storyboardFrameKey,
} from "@/lib/scriptWriter/scriptMappers";
import { scriptWriterGenerateStoryboardFrame } from "@/lib/scriptWriter/apiClient";
import { STORYBOARD_IMAGE_COST_USD } from "@/lib/scriptWriter/storyboardCost";
import {
  ScriptDocument,
  ScriptInspirationImage,
  ScriptStoryboardFrame,
  ScriptStoryboardImage,
  ScriptWriterSession,
} from "@/lib/scriptWriter/types";

function frameTitle(frame: ScriptStoryboardFrame): string {
  const typeLabel = formatShotTypeLabel(frame.shotType);
  const name = frame.shotName?.trim();
  return name ? `Scene ${frame.sceneNumber}, ${name}` : `Scene ${frame.sceneNumber}, ${typeLabel}`;
}

function formatCost(count: number): string {
  return `~$${(count * STORYBOARD_IMAGE_COST_USD).toFixed(2)}`;
}

interface ScriptStoryboardPanelProps {
  script: ScriptDocument;
  inspirationImages?: ScriptInspirationImage[];
  appliedProjectId?: string;
  /** Session id — required to generate/persist frame images. */
  sessionId?: string;
  getToken?: () => Promise<string | null>;
  storyboardImages?: Record<string, ScriptStoryboardImage>;
  /** Called after the server persists a new/updated set of storyboard images. */
  onSessionUpdated?: (session: ScriptWriterSession) => void;
  readOnly?: boolean;
  /** Admin-only: show the generate/regenerate controls (image credits). */
  allowGenerate?: boolean;
}

export function ScriptStoryboardPanel({
  script,
  inspirationImages = [],
  appliedProjectId,
  sessionId,
  getToken,
  storyboardImages,
  onSessionUpdated,
  readOnly,
  allowGenerate,
}: ScriptStoryboardPanelProps) {
  const frames = script.storyboardFrames?.length
    ? script.storyboardFrames
    : deriveStoryboardFramesFromScript(script);

  // Each frame gets a stable key (scene can have several frames), so generated
  // images map 1:1 to a specific frame instead of collapsing per scene.
  const keyedFrames = useMemo(
    () => frames.map((frame, i) => ({ frame, key: storyboardFrameKey(frame, i) })),
    [frames]
  );

  const [busyKeys, setBusyKeys] = useState<Record<string, boolean>>({});
  const [batchProgress, setBatchProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const imageById = useMemo(
    () => new Map(inspirationImages.map((img) => [img.id, img])),
    [inspirationImages]
  );
  const generated = storyboardImages ?? {};
  const canGenerate = Boolean(sessionId && getToken) && !readOnly && Boolean(allowGenerate);

  const missingCount = useMemo(
    () => keyedFrames.filter((kf) => !generated[kf.key]?.url).length,
    [keyedFrames, generated]
  );

  if (!frames.length) return null;

  const runOne = async (frameKey: string): Promise<boolean> => {
    if (!sessionId || !getToken) return false;
    try {
      const { session } = await scriptWriterGenerateStoryboardFrame(getToken, sessionId, frameKey);
      if (session && onSessionUpdated) onSessionUpdated(session as ScriptWriterSession);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate frame");
      return false;
    }
  };

  const generateOne = async (frameKey: string) => {
    if (!canGenerate) return;
    setError(null);
    setBusyKeys((s) => ({ ...s, [frameKey]: true }));
    await runOne(frameKey);
    setBusyKeys((s) => ({ ...s, [frameKey]: false }));
  };

  const generateAll = async () => {
    if (!canGenerate) return;
    const targets = keyedFrames.filter((kf) => !generated[kf.key]?.url);
    if (!targets.length) return;
    const ok = window.confirm(
      `Generate ${targets.length} storyboard frame${targets.length === 1 ? "" : "s"} for about ${formatCost(
        targets.length
      )}? This uses AI image credits.`
    );
    if (!ok) return;

    setError(null);
    setBatchProgress({ done: 0, total: targets.length });
    for (let i = 0; i < targets.length; i++) {
      const { key } = targets[i];
      setBusyKeys((s) => ({ ...s, [key]: true }));
      const success = await runOne(key);
      setBusyKeys((s) => ({ ...s, [key]: false }));
      setBatchProgress({ done: i + 1, total: targets.length });
      if (!success) break; // Stop the batch on first failure so we don't burn credits.
    }
    setBatchProgress(null);
  };

  return (
    <div className="border-b border-slate-100 px-4 py-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-expanded={!collapsed}
          className="flex min-w-0 items-start gap-2 text-left"
        >
          <ChevronDown
            className={`mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition-transform ${
              collapsed ? "-rotate-90" : ""
            }`}
          />
          <span className="min-w-0">
            <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Storyboard
              <span className="ml-1.5 font-medium normal-case tracking-normal text-slate-400">
                ({keyedFrames.length} frame{keyedFrames.length === 1 ? "" : "s"})
              </span>
            </span>
            <span className="mt-0.5 block text-xs text-slate-500">
              {collapsed
                ? "Tap to show frames."
                : "One frame per shot. Generate photoreal AI stills or match inspiration refs."}
            </span>
          </span>
        </button>
        <div className="flex items-center gap-3">
          {appliedProjectId ? (
            <Link
              href={`/projects/${appliedProjectId}/production`}
              className="text-xs font-medium text-amber-800 hover:text-amber-900 hover:underline"
            >
              Open pre-production board →
            </Link>
          ) : null}
          {canGenerate && missingCount > 0 ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void generateAll()}
              disabled={Boolean(batchProgress)}
            >
              {batchProgress ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Generating {batchProgress.done}/{batchProgress.total}…
                </>
              ) : (
                <>
                  <Sparkles className="mr-1.5 h-4 w-4" />
                  Generate all frames ({formatCost(frames.length)})
                </>
              )}
            </Button>
          ) : null}
        </div>
      </div>

      {error ? (
        <p className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {error}
        </p>
      ) : null}

      {collapsed ? null : (
      <div className="grid gap-3 sm:grid-cols-2">
        {keyedFrames.map(({ frame, key }) => {
          const gen = generated[key];
          const img = frame.inspirationImageId
            ? imageById.get(frame.inspirationImageId)
            : undefined;
          const displayUrl = gen?.url || img?.storageUrl;
          const busy = busyKeys[key];
          return (
            <article
              key={key}
              className="overflow-hidden rounded-xl border border-amber-200/60 bg-amber-50/30"
            >
              <div className="relative aspect-[4/3] bg-slate-100">
                {displayUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={displayUrl}
                    alt={frameTitle(frame)}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-1 text-slate-400">
                    <ImageIcon className="h-8 w-8 opacity-40" />
                    <span className="text-[10px]">
                      {canGenerate ? "No frame yet" : "Reference image TBD"}
                    </span>
                  </div>
                )}
                {busy ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-900/40 text-white">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : null}
                {gen?.url ? (
                  <span className="absolute left-1.5 top-1.5 rounded-full bg-violet-600/90 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
                    AI frame
                  </span>
                ) : null}
              </div>
              <div className="p-2.5">
                <h3 className="text-xs font-bold text-orange-800">{frameTitle(frame)}</h3>
                {frame.sceneHeading ? (
                  <p className="text-[10px] text-slate-500">{frame.sceneHeading}</p>
                ) : null}
                <p className="mt-1 text-xs leading-relaxed text-slate-700">{frame.caption}</p>
                {frame.audioCue ? (
                  <p className="mt-1 text-[10px] italic text-slate-500">{frame.audioCue}</p>
                ) : null}
                {canGenerate ? (
                  <button
                    type="button"
                    onClick={() => void generateOne(key)}
                    disabled={busy || Boolean(batchProgress)}
                    className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-violet-700 hover:text-violet-900 disabled:opacity-50"
                  >
                    <Sparkles className="h-3 w-3" />
                    {gen?.url ? "Regenerate" : "Generate sketch"}
                  </button>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
      )}
      {collapsed ? null : (
        <p className="mt-3 text-[11px] text-slate-500">
          Frames are photoreal AI stills for inspiration. After you apply this script to a project,
          use the shot list <strong>Grid</strong> view to swap references and print a client PDF.
        </p>
      )}
    </div>
  );
}
