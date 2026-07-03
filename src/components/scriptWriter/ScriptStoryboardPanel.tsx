"use client";

import Link from "next/link";
import { ImageIcon } from "lucide-react";
import { formatShotTypeLabel } from "@/lib/production/shotLabels";
import { deriveStoryboardFramesFromScript } from "@/lib/scriptWriter/scriptMappers";
import {
  ScriptDocument,
  ScriptInspirationImage,
  ScriptStoryboardFrame,
} from "@/lib/scriptWriter/types";

function frameTitle(frame: ScriptStoryboardFrame): string {
  const typeLabel = formatShotTypeLabel(frame.shotType);
  const name = frame.shotName?.trim();
  return name ? `Scene ${frame.sceneNumber}, ${name}` : `Scene ${frame.sceneNumber}, ${typeLabel}`;
}

export function ScriptStoryboardPanel({
  script,
  inspirationImages = [],
  appliedProjectId,
}: {
  script: ScriptDocument;
  inspirationImages?: ScriptInspirationImage[];
  appliedProjectId?: string;
}) {
  const frames = script.storyboardFrames?.length
    ? script.storyboardFrames
    : deriveStoryboardFramesFromScript(script);

  if (!frames.length) return null;

  const imageById = new Map(inspirationImages.map((img) => [img.id, img]));

  return (
    <div className="border-b border-slate-100 px-4 py-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Storyboard
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            One hero frame per scene — matched to inspiration refs when available.
          </p>
        </div>
        {appliedProjectId ? (
          <Link
            href={`/projects/${appliedProjectId}/production`}
            className="text-xs font-medium text-amber-800 hover:text-amber-900 hover:underline"
          >
            Open pre-production board →
          </Link>
        ) : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {frames.map((frame) => {
          const img = frame.inspirationImageId
            ? imageById.get(frame.inspirationImageId)
            : undefined;
          return (
            <article
              key={`${frame.sceneNumber}-${frame.shotType}`}
              className="overflow-hidden rounded-xl border border-amber-200/60 bg-amber-50/30"
            >
              <div className="relative aspect-[4/3] bg-slate-100">
                {img?.storageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={img.storageUrl}
                    alt={frameTitle(frame)}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-1 text-slate-400">
                    <ImageIcon className="h-8 w-8 opacity-40" />
                    <span className="text-[10px]">Reference image TBD</span>
                  </div>
                )}
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
              </div>
            </article>
          );
        })}
      </div>
      <p className="mt-3 text-[11px] text-slate-500">
        After you apply this script to a project, use the shot list{" "}
        <strong>Grid</strong> view to upload frames, swap references, and print a client PDF.
      </p>
    </div>
  );
}
