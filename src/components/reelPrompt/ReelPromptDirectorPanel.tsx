"use client";

import { useState } from "react";
import { Check, Clapperboard, Copy, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { formatReelClipForCopy, formatReelPackForCopy } from "@/lib/reelPrompt/format";
import { REEL_TALENT_KITS } from "@/lib/reelPrompt/talentKits";
import type {
  ReelPromptPack,
  ReelPromptPlatform,
  ReelPromptStyle,
} from "@/lib/reelPrompt/types";
import { cn } from "@/lib/utils/cn";

export type ReelPromptDirectorOptions = {
  style: ReelPromptStyle;
  platform: ReelPromptPlatform;
  targetLength: string;
  talentKitId: string;
  talentNotes: string;
};

type Props = {
  mode: "freeform" | "script";
  onGenerateFromScript?: (opts: ReelPromptDirectorOptions) => Promise<ReelPromptPack>;
  onGenerateFreeform?: (
    opts: ReelPromptDirectorOptions & { idea: string }
  ) => Promise<ReelPromptPack>;
  initialIdea?: string;
  compact?: boolean;
};

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function ReelPromptDirectorPanel({
  mode,
  onGenerateFromScript,
  onGenerateFreeform,
  initialIdea = "",
  compact = false,
}: Props) {
  const [idea, setIdea] = useState(initialIdea);
  const [style, setStyle] = useState<ReelPromptStyle>("ugc_ad");
  const [platform, setPlatform] = useState<ReelPromptPlatform>("reels");
  const [targetLength, setTargetLength] = useState("15–20s");
  const [talentKitId, setTalentKitId] = useState("stormi");
  const [talentNotes, setTalentNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pack, setPack] = useState<ReelPromptPack | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  async function flashCopied(key: string) {
    setCopied(key);
    window.setTimeout(() => setCopied((c) => (c === key ? null : c)), 1600);
  }

  async function onGenerate() {
    setBusy(true);
    setError(null);
    const opts: ReelPromptDirectorOptions = {
      style,
      platform,
      targetLength,
      talentKitId,
      talentNotes,
    };
    try {
      const next =
        mode === "script"
          ? await onGenerateFromScript?.(opts)
          : await onGenerateFreeform?.({ ...opts, idea: idea.trim() });
      if (!next) throw new Error("Generator not wired");
      setPack(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200 bg-white shadow-sm",
        compact ? "p-4" : "p-5"
      )}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white">
          <Clapperboard className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-slate-900">Reel prompt director</h3>
          <p className="mt-0.5 text-sm text-slate-600">
            Break your idea into a tight shot list of <span className="font-medium">video</span>{" "}
            prompts — hook through CTA, with continuity locked for the same talent.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {mode === "freeform" ? (
          <label className="sm:col-span-2 block space-y-1">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Reel idea</span>
            <textarea
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              rows={3}
              placeholder="e.g. Stormi UGC for Monopoly Night — cozy, funny, direct-to-camera…"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none ring-sky-200 focus:ring-2"
            />
          </label>
        ) : null}

        <Select
          label="Style"
          value={style}
          onChange={(e) => setStyle(e.target.value as ReelPromptStyle)}
          options={[
            { value: "ugc_ad", label: "UGC ad" },
            { value: "cinematic_reel", label: "Cinematic reel" },
            { value: "hybrid", label: "Hybrid" },
          ]}
        />

        <Select
          label="Platform"
          value={platform}
          onChange={(e) => setPlatform(e.target.value as ReelPromptPlatform)}
          options={[
            { value: "reels", label: "Instagram Reels" },
            { value: "tiktok", label: "TikTok" },
            { value: "shorts", label: "YouTube Shorts" },
            { value: "flexible", label: "Flexible" },
          ]}
        />

        <label className="block space-y-1">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Length</span>
          <input
            value={targetLength}
            onChange={(e) => setTargetLength(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none ring-sky-200 focus:ring-2"
          />
        </label>

        <Select
          label="Talent kit"
          value={talentKitId}
          onChange={(e) => setTalentKitId(e.target.value)}
          options={REEL_TALENT_KITS.map((k) => ({ value: k.id, label: k.name }))}
        />

        <label className="sm:col-span-2 block space-y-1">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">
            Extra continuity (optional)
          </span>
          <input
            value={talentNotes}
            onChange={(e) => setTalentNotes(e.target.value)}
            placeholder="Wardrobe, location, product name…"
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none ring-sky-200 focus:ring-2"
          />
        </label>
      </div>

      <div className="mt-4">
        <Button
          type="button"
          onClick={() => void onGenerate()}
          disabled={
            busy ||
            (mode === "freeform" && !idea.trim()) ||
            (mode === "script" && !onGenerateFromScript)
          }
        >
          {busy ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-1.5 h-4 w-4" />
          )}
          {mode === "script" ? "Generate from script" : "Generate reel prompts"}
        </Button>
      </div>

      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}

      {pack ? (
        <div className="mt-5 space-y-4 border-t border-slate-100 pt-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h4 className="font-semibold text-slate-900">{pack.title}</h4>
              <p className="mt-1 text-sm text-slate-600">{pack.logline}</p>
              <p className="mt-1 text-xs text-slate-500">
                {pack.targetLength} · {pack.style.replace("_", " ")} · {pack.clips.length} clips
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() =>
                void copyText(formatReelPackForCopy(pack)).then((ok) => {
                  if (ok) void flashCopied("all");
                })
              }
            >
              {copied === "all" ? (
                <Check className="mr-1.5 h-3.5 w-3.5" />
              ) : (
                <Copy className="mr-1.5 h-3.5 w-3.5" />
              )}
              Copy all clips
            </Button>
          </div>

          <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Continuity
            </p>
            <p className="mt-1 whitespace-pre-wrap">{pack.continuityBlock}</p>
          </div>

          <div className="space-y-3">
            {pack.clips.map((clip) => (
              <div
                key={clip.id}
                className="rounded-xl border border-slate-200 bg-white px-3 py-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Clip {clip.index} · {clip.beat}{" "}
                      <span className="font-normal text-slate-500">({clip.duration})</span>
                    </p>
                    {clip.camera ? (
                      <p className="mt-0.5 text-xs text-slate-500">{clip.camera}</p>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      void copyText(formatReelClipForCopy(pack, clip)).then((ok) => {
                        if (ok) void flashCopied(clip.id);
                      })
                    }
                  >
                    {copied === clip.id ? (
                      <Check className="mr-1.5 h-3.5 w-3.5" />
                    ) : (
                      <Copy className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    Copy
                  </Button>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{clip.prompt}</p>
                {clip.dialogueOrVo ? (
                  <p className="mt-2 text-sm text-slate-600">
                    <span className="font-medium text-slate-800">VO:</span> {clip.dialogueOrVo}
                  </p>
                ) : null}
                {clip.onScreenText ? (
                  <p className="mt-1 text-sm text-slate-600">
                    <span className="font-medium text-slate-800">Text:</span> {clip.onScreenText}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
