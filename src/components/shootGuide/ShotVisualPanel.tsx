"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { refreshShotVisual, startShotVisual } from "@/lib/shootGuide/apiClient";
import { uploadShotVisualAsset } from "@/lib/shootGuide/storage";
import {
  SHOT_ASSET_TYPE_LABELS,
  SHOT_VISUAL_STATUS_LABELS,
  type ShootGuide,
  type ShootGuideShot,
  type ShotAssetType,
  type ShotVisualAsset,
} from "@/lib/shootGuide/types";
import {
  isMotionAsset,
  latestPreviewAsset,
  resolveVisualStatus,
  shotVisualPrompt,
  statusAfterAsset,
} from "@/lib/shootGuide/visualAssets";
import { formatApproxCost, motionModel, stillModel } from "@/lib/visualGeneration/cost";
import { motionDurationSeconds, selectReferenceImages } from "@/lib/visualGeneration/prompts";
import type { VisualQuality } from "@/lib/visualGeneration/types";

function latestAsset(assets: ShotVisualAsset[], type: ShotAssetType): ShotVisualAsset | null {
  return [...assets].reverse().find((asset) => asset.type === type) ?? null;
}

export function ShotVisualPanel({
  guide,
  shot,
  userId,
  compact = false,
  getToken,
  onShotChange,
  onGuide,
}: {
  guide: ShootGuide;
  shot: ShootGuideShot;
  userId: string;
  compact?: boolean;
  getToken: () => Promise<string | null>;
  onShotChange: (patch: Partial<ShootGuideShot>) => void | Promise<void>;
  onGuide: (guide: ShootGuide) => void;
}) {
  const storyboardRef = useRef<HTMLInputElement>(null);
  const footageRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<ShotAssetType | null>(null);
  const [quality, setQuality] = useState<VisualQuality>("fast");
  const [error, setError] = useState<string | null>(null);
  const assets = shot.visualAssets ?? [];
  const preview = latestPreviewAsset(assets);
  const visualStatus = resolveVisualStatus(shot);
  const stillJob = latestAsset(assets, "ai_still");
  const motionJob = latestAsset(assets, "ai_motion");
  const stillCost = formatApproxCost(stillModel(selectReferenceImages(guide).length).credits);
  const motionCost = formatApproxCost(motionModel(quality, motionDurationSeconds(shot)).credits);
  const pendingKey = assets
    .filter((asset) => asset.status === "pending" && asset.providerTaskId)
    .map((asset) => asset.id)
    .join(",");

  useEffect(() => {
    if (!pendingKey) return;
    let cancelled = false;
    const poll = async () => {
      const pending = (shot.visualAssets ?? []).filter((asset) => asset.status === "pending" && asset.providerTaskId);
      for (const asset of pending) {
        try {
          const { guide: next } = await refreshShotVisual(getToken, guide.id, shot.id, asset.id);
          if (!cancelled) onGuide(next);
        } catch (err) {
          if (!cancelled) setError(err instanceof Error ? err.message : "Could not refresh generation");
        }
      }
    };
    void poll();
    const timer = window.setInterval(() => void poll(), 5000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
    // Poll only while the pending task ids stay the same.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingKey, getToken, guide.id, shot.id, onGuide]);

  function appendAsset(asset: ShotVisualAsset) {
    const visualAssets = [...assets, asset];
    return onShotChange({
      visualAssets,
      visualStatus: statusAfterAsset(visualStatus, asset),
    });
  }

  async function generate(type: "ai_still" | "ai_motion", regenerate = false) {
    setBusy(type);
    setError(null);
    try {
      const { guide: next, asset } = await startShotVisual(getToken, guide.id, {
        shotId: shot.id,
        type,
        quality,
        regenerate,
      });
      onGuide(next);
      if (asset.status === "failed" && asset.error) setError(asset.error);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setBusy(null);
    }
  }

  async function upload(type: "storyboard" | "real_footage", file: File | undefined) {
    if (!file) return;
    setBusy(type);
    setError(null);
    try {
      const fileId = crypto.randomUUID();
      const uploaded = await uploadShotVisualAsset(userId, guide.id, shot.id, type, fileId, file);
      await appendAsset({
        id: fileId,
        sceneId: guide.id,
        shotId: shot.id,
        type,
        provider: "upload",
        createdAt: new Date().toISOString(),
        storageUrl: uploaded.storageUrl,
        storagePath: uploaded.storagePath,
        fileName: uploaded.fileName,
        mimeType: uploaded.mimeType,
        prompt: type === "storyboard" ? shotVisualPrompt(guide, shot) : null,
        status: "ready",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
        {preview?.storageUrl && isMotionAsset(preview) ? (
          <video src={preview.storageUrl} controls className={compact ? "h-36 w-full bg-black object-contain" : "max-h-80 w-full bg-black object-contain"} />
        ) : preview?.storageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview.storageUrl}
            alt={SHOT_ASSET_TYPE_LABELS[preview.type]}
            className={compact ? "h-36 w-full object-cover" : "max-h-80 w-full object-contain bg-slate-100"}
          />
        ) : (
          <div className="flex h-28 items-center justify-center px-4 text-center text-sm text-slate-500">
            No still or motion preview yet.
          </div>
        )}
        <div className="flex items-center justify-between gap-2 px-3 py-2 text-xs text-slate-500">
          <span>{preview ? SHOT_ASSET_TYPE_LABELS[preview.type] : "Visual preview"}</span>
          <span className="font-semibold text-slate-700">{SHOT_VISUAL_STATUS_LABELS[visualStatus]}</span>
        </div>
      </div>
      {stillJob?.status === "failed" || motionJob?.status === "failed" ? (
        <p className="text-sm text-red-700">
          {stillJob?.status === "failed" ? stillJob.error || "AI still failed." : ""}
          {motionJob?.status === "failed" ? ` ${motionJob.error || "Animation failed."}` : ""}
        </p>
      ) : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" disabled={Boolean(busy)} onClick={() => storyboardRef.current?.click()}>
          {busy === "storyboard" ? "Uploading…" : "Storyboard frame"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={Boolean(busy) || stillJob?.status === "pending"}
          onClick={() => void generate("ai_still", stillJob?.status === "failed" || stillJob?.status === "ready")}
        >
          {stillJob?.status === "pending" || busy === "ai_still"
            ? "Generating…"
            : stillJob?.status === "failed" || stillJob?.status === "ready"
              ? "Regenerate still"
              : "Generate AI shot"}
        </Button>
        <span className="text-xs text-slate-500">{stillCost}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs font-semibold">
          {(["fast", "high"] as const).map((option) => (
            <button
              key={option}
              type="button"
              className={`rounded-md px-2 py-1 ${quality === option ? "bg-white text-slate-900" : "text-slate-500"}`}
              onClick={() => setQuality(option)}
            >
              {option === "fast" ? "Fast Previs" : "High Quality"}
            </button>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={Boolean(busy) || motionJob?.status === "pending"}
          onClick={() => void generate("ai_motion", motionJob?.status === "failed" || motionJob?.status === "ready")}
        >
          {motionJob?.status === "pending" || busy === "ai_motion"
            ? "Animating…"
            : motionJob?.status === "failed" || motionJob?.status === "ready"
              ? "Regenerate animation"
              : "Animate frame"}
        </Button>
        <span className="text-xs text-slate-500">{motionCost}</span>
        <Button type="button" variant="outline" size="sm" disabled={Boolean(busy)} onClick={() => footageRef.current?.click()}>
          {busy === "real_footage" ? "Uploading…" : "Use real footage"}
        </Button>
      </div>
      <input
        ref={storyboardRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          void upload("storyboard", file);
        }}
      />
      <input
        ref={footageRef}
        type="file"
        accept="video/*,image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          void upload("real_footage", file);
        }}
      />
    </div>
  );
}
