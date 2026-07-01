"use client";

import { useRef, useState } from "react";
import { ImageIcon, Upload } from "lucide-react";
import { ProductionInspirationImage, ProductionDayShot, ProductionSceneFrame } from "@/lib/production/types";
import { formatShotTypeLabel } from "@/lib/production/shotLabels";
import { isSceneCaptured, sceneCaptureSummary } from "@/lib/production/storyboardScene";
import { uploadProductionImage } from "@/lib/production/storage";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/Button";

function sceneTitle(frame: ProductionSceneFrame): string {
  const typeLabel = frame.shotType ? formatShotTypeLabel(frame.shotType) : "Shot";
  const name = frame.shotName?.trim();
  return name ? `Scene ${frame.sceneRef}, ${name}` : `Scene ${frame.sceneRef}, ${typeLabel}`;
}

interface ProductionStoryboardGridViewProps {
  projectId: string;
  projectTitle: string;
  frames: ProductionSceneFrame[];
  shots: ProductionDayShot[];
  inspirationImages: ProductionInspirationImage[];
  onChange: (frames: ProductionSceneFrame[]) => void;
  readOnly?: boolean;
  className?: string;
}

export function ProductionStoryboardGridView({
  projectId,
  projectTitle,
  frames,
  shots,
  inspirationImages,
  onChange,
  readOnly,
  className,
}: ProductionStoryboardGridViewProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pickerFrameId, setPickerFrameId] = useState<string | null>(null);
  const [uploadTargetId, setUploadTargetId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const sorted = [...frames].sort((a, b) => a.sortOrder - b.sortOrder);

  const patchFrame = (id: string, patch: Partial<ProductionSceneFrame>) => {
    onChange(frames.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };

  const applyImage = (
    frameId: string,
    imageUrl: string,
    storagePath?: string,
    inspirationImageId?: string,
    source: ProductionSceneFrame["referenceImageSource"] = "upload"
  ) => {
    patchFrame(frameId, {
      referenceImageUrl: imageUrl,
      referenceImageStoragePath: storagePath,
      referenceImageSource: source,
      inspirationImageId,
    });
    setPickerFrameId(null);
  };

  const uploadFile = async (frameId: string, file: File) => {
    if (!file.type.startsWith("image/")) return;
    setUploading(true);
    setUploadTargetId(frameId);
    try {
      const id = crypto.randomUUID();
      const { storageUrl, storagePath } = await uploadProductionImage(
        projectId,
        "storyboard",
        id,
        file
      );
      applyImage(frameId, storageUrl, storagePath, undefined, "upload");
    } finally {
      setUploading(false);
      setUploadTargetId(null);
    }
  };

  const onDrop = (frameId: string, e: React.DragEvent) => {
    e.preventDefault();
    setDragOverId(null);
    if (readOnly) return;
    const file = e.dataTransfer.files?.[0];
    if (file) void uploadFile(frameId, file);
  };

  if (sorted.length === 0) {
    return (
      <section
        className={cn(
          "rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center",
          className
        )}
      >
        <p className="text-sm text-slate-500">
          No storyboard frames yet. Enable <strong>Storyboard mode</strong> in Script writer,
          apply the script, or refresh from script.
        </p>
      </section>
    );
  }

  return (
    <>
      <section
        className={cn(
          "overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm",
          className
        )}
      >
        <div className="bg-gradient-to-r from-amber-700 to-orange-700 px-5 py-3 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/90">
            Project
          </p>
          <h2 className="text-lg font-bold uppercase text-white">{projectTitle}</h2>
        </div>

        <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-2">
          {sorted.map((frame) => {
            const captured = isSceneCaptured(frame.sceneRef, shots);
            const progress = sceneCaptureSummary(frame.sceneRef, shots);
            const busy = uploading && uploadTargetId === frame.id;

            return (
              <article
                key={frame.id}
                className={cn(
                  "flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white",
                  captured && "ring-2 ring-emerald-400/60",
                  dragOverId === frame.id && !readOnly && "ring-2 ring-amber-400"
                )}
                onDragOver={(e) => {
                  if (readOnly) return;
                  e.preventDefault();
                  setDragOverId(frame.id);
                }}
                onDragLeave={() => setDragOverId(null)}
                onDrop={(e) => onDrop(frame.id, e)}
              >
                <div className="relative aspect-[4/3] bg-slate-100">
                  {frame.referenceImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={frame.referenceImageUrl}
                      alt={sceneTitle(frame)}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-400">
                      <ImageIcon className="h-10 w-10 opacity-40" />
                      <span className="text-xs">Drop reference image</span>
                    </div>
                  )}
                  {captured && (
                    <span className="absolute right-2 top-2 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold uppercase text-white">
                      Captured
                    </span>
                  )}
                  {!readOnly && (
                    <div className="absolute bottom-2 right-2 flex gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 bg-white/95 text-xs"
                        disabled={busy}
                        onClick={() => {
                          setUploadTargetId(frame.id);
                          fileRef.current?.click();
                        }}
                      >
                        <Upload className="mr-1 h-3.5 w-3.5" />
                        {busy ? "…" : "Upload"}
                      </Button>
                      {inspirationImages.length > 0 && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8 bg-white/95 text-xs"
                          onClick={() => setPickerFrameId(frame.id)}
                        >
                          Library
                        </Button>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-1.5 p-3">
                  <h3 className="text-sm font-bold text-orange-700">{sceneTitle(frame)}</h3>
                  {frame.caption && (
                    <p className="text-xs leading-relaxed text-slate-700">{frame.caption}</p>
                  )}
                  {frame.audioCue && (
                    <p className="text-xs italic text-slate-500">{frame.audioCue}</p>
                  )}
                  {progress.total > 0 && (
                    <p className="mt-auto text-[10px] tabular-nums text-slate-400">
                      Coverage {progress.done}/{progress.total} shots
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          const frameId = uploadTargetId;
          if (file && frameId) void uploadFile(frameId, file);
          e.target.value = "";
        }}
      />

      {pickerFrameId && !readOnly && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setPickerFrameId(null)}
        >
          <div
            className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-3 font-semibold text-slate-900">Choose inspiration image</h3>
            <div className="grid grid-cols-2 gap-2">
              {inspirationImages.map((img) => (
                <button
                  key={img.id}
                  type="button"
                  className="overflow-hidden rounded-lg border border-slate-200 text-left hover:ring-2 hover:ring-amber-400"
                  onClick={() =>
                    applyImage(pickerFrameId, img.imageUrl, img.storagePath, img.id, "inspiration")
                  }
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.imageUrl} alt={img.caption ?? "Reference"} className="aspect-video w-full object-cover" />
                  {img.caption && (
                    <p className="truncate px-2 py-1 text-xs text-slate-600">{img.caption}</p>
                  )}
                </button>
              ))}
            </div>
            <Button type="button" variant="outline" className="mt-4 w-full" onClick={() => setPickerFrameId(null)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
