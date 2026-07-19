"use client";

import { useRef, useState } from "react";
import { Check, ImageIcon, Upload } from "lucide-react";
import type { ProductionDayShot, ProductionInspirationImage } from "@/lib/production/types";
import { formatShotTypeLabel } from "@/lib/production/shotLabels";
import { uploadProductionImage } from "@/lib/production/storage";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/Button";

export type CoverageShotRow = ProductionDayShot & {
  dayId: string;
  dayNumber: number;
  dayTitle: string;
};

interface CoverageBoardViewProps {
  projectId: string;
  shots: CoverageShotRow[];
  inspirationImages: ProductionInspirationImage[];
  layout?: "grid" | "linear";
  readOnly?: boolean;
  onPatchShot: (dayId: string, shotId: string, patch: Partial<ProductionDayShot>) => void;
  className?: string;
}

function shotTitle(shot: CoverageShotRow): string {
  const num = shot.scoutShotNumber ?? shot.sortOrder + 1;
  const name = shot.shotName?.trim();
  if (name) return `${num}. ${name}`;
  const type = shot.shotType ? formatShotTypeLabel(shot.shotType) : "Shot";
  return `${num}. ${type}`;
}

export function CoverageBoardView({
  projectId,
  shots,
  inspirationImages,
  layout = "grid",
  readOnly,
  onPatchShot,
  className,
}: CoverageBoardViewProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pickerShotId, setPickerShotId] = useState<string | null>(null);
  const [uploadTarget, setUploadTarget] = useState<{ dayId: string; shotId: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const sorted = [...shots].sort((a, b) => {
    if (a.dayNumber !== b.dayNumber) return a.dayNumber - b.dayNumber;
    return a.sortOrder - b.sortOrder;
  });

  const applyImage = (
    dayId: string,
    shotId: string,
    imageUrl: string,
    storagePath?: string,
    inspirationImageId?: string,
    source: ProductionDayShot["referenceImageSource"] = "upload"
  ) => {
    onPatchShot(dayId, shotId, {
      referenceImageUrl: imageUrl,
      referenceImageStoragePath: storagePath,
      referenceImageSource: source,
      inspirationImageId,
    });
    setPickerShotId(null);
  };

  const uploadFile = async (dayId: string, shotId: string, file: File) => {
    if (!file.type.startsWith("image/")) return;
    setUploading(true);
    setUploadTarget({ dayId, shotId });
    try {
      const id = crypto.randomUUID();
      const { storageUrl, storagePath } = await uploadProductionImage(
        projectId,
        "storyboard",
        id,
        file
      );
      applyImage(dayId, shotId, storageUrl, storagePath, undefined, "upload");
    } finally {
      setUploading(false);
      setUploadTarget(null);
    }
  };

  if (sorted.length === 0) {
    return (
      <section
        className={cn(
          "rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center",
          className
        )}
      >
        <ImageIcon className="mx-auto mb-3 h-8 w-8 text-slate-300" />
        <p className="font-medium text-slate-800">No coverage yet</p>
        <p className="mt-1 text-sm text-slate-500">
          Apply a script with suggested shots, or add shots from a shoot day.
        </p>
      </section>
    );
  }

  return (
    <section className={cn("space-y-4", className)}>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && uploadTarget) void uploadFile(uploadTarget.dayId, uploadTarget.shotId, file);
          e.target.value = "";
        }}
      />

      <div
        className={cn(
          layout === "linear"
            ? "mx-auto flex max-w-xl flex-col gap-4"
            : "grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
        )}
      >
        {sorted.map((shot) => {
          const expanded = expandedId === shot.id;
          const caption =
            shot.description?.trim() ||
            shot.subjectAction?.trim() ||
            shot.notes?.split("\n")[0] ||
            "";
          return (
            <article
              key={`${shot.dayId}-${shot.id}`}
              className={cn(
                "flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm",
                shot.done && "ring-1 ring-emerald-200",
                dragOverId === shot.id && "border-sky-400 ring-2 ring-sky-200"
              )}
              onDragOver={(e) => {
                if (readOnly) return;
                e.preventDefault();
                setDragOverId(shot.id);
              }}
              onDragLeave={() => setDragOverId(null)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverId(null);
                if (readOnly) return;
                const file = e.dataTransfer.files?.[0];
                if (file) void uploadFile(shot.dayId, shot.id, file);
              }}
            >
              <div className="relative aspect-video bg-slate-100">
                {shot.referenceImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={shot.referenceImageUrl}
                    alt={shotTitle(shot)}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-400">
                    <ImageIcon className="h-8 w-8" />
                    <span className="text-xs">Add frame</span>
                  </div>
                )}
                <div className="absolute left-2 top-2 flex flex-wrap gap-1">
                  <span className="rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white">
                    Day {shot.dayNumber}
                  </span>
                  {shot.sceneRef ? (
                    <span className="rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white">
                      Sc {shot.sceneRef}
                    </span>
                  ) : null}
                </div>
                {shot.done ? (
                  <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-md bg-emerald-600 px-1.5 py-0.5 text-[10px] font-medium text-white">
                    <Check className="h-3 w-3" /> Captured
                  </span>
                ) : null}
              </div>

              <div className="flex flex-1 flex-col gap-2 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{shotTitle(shot)}</p>
                    <p className="text-xs text-slate-500">
                      {shot.shotType ? formatShotTypeLabel(shot.shotType) : "Shot"}
                      {shot.cameraMovement ? ` · ${shot.cameraMovement}` : ""}
                    </p>
                  </div>
                  {!readOnly && (
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-slate-300"
                      checked={shot.done}
                      onChange={(e) =>
                        onPatchShot(shot.dayId, shot.id, { done: e.target.checked })
                      }
                      aria-label={`Mark ${shotTitle(shot)} captured`}
                    />
                  )}
                </div>
                {caption ? (
                  <p className="line-clamp-3 text-sm text-slate-600">{caption}</p>
                ) : null}
                {shot.audioCue ? (
                  <p className="text-xs text-slate-500">
                    <span className="font-medium text-slate-700">Audio:</span> {shot.audioCue}
                  </p>
                ) : null}

                {expanded && (
                  <dl className="mt-1 grid gap-1 border-t border-slate-100 pt-2 text-xs text-slate-600">
                    {[
                      ["Lens", shot.lens],
                      ["Framing", shot.framing],
                      ["Height", shot.cameraHeight],
                      ["Blocking", shot.blocking],
                      ["Lighting", shot.lighting],
                      ["Support", shot.support],
                    ]
                      .filter(([, v]) => Boolean(v?.trim()))
                      .map(([label, value]) => (
                        <div key={label} className="flex gap-2">
                          <dt className="w-16 shrink-0 font-medium text-slate-500">{label}</dt>
                          <dd>{value}</dd>
                        </div>
                      ))}
                  </dl>
                )}

                <div className="mt-auto flex flex-wrap gap-2 pt-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setExpandedId(expanded ? null : shot.id)}
                  >
                    {expanded ? "Less" : "Details"}
                  </Button>
                  {!readOnly && (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={uploading}
                        onClick={() => {
                          setUploadTarget({ dayId: shot.dayId, shotId: shot.id });
                          fileRef.current?.click();
                        }}
                      >
                        <Upload className="mr-1 h-3.5 w-3.5" />
                        Upload
                      </Button>
                      {inspirationImages.length > 0 && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setPickerShotId(pickerShotId === shot.id ? null : shot.id)
                          }
                        >
                          Library
                        </Button>
                      )}
                    </>
                  )}
                </div>

                {pickerShotId === shot.id && (
                  <div className="mt-2 grid max-h-40 grid-cols-3 gap-2 overflow-y-auto rounded-lg border border-slate-100 bg-slate-50 p-2">
                    {inspirationImages.map((img) => (
                      <button
                        key={img.id}
                        type="button"
                        className="aspect-square overflow-hidden rounded-md border border-slate-200 bg-white"
                        onClick={() =>
                          applyImage(
                            shot.dayId,
                            shot.id,
                            img.imageUrl,
                            img.storagePath,
                            img.id,
                            "inspiration"
                          )
                        }
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img.imageUrl}
                          alt={img.caption ?? "Reference"}
                          className="h-full w-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
