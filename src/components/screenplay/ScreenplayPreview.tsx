"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { ScriptDocument } from "@/lib/scriptWriter/types";
import { getScriptElements } from "@/lib/screenplay/normalize";
import { paginateScreenplay, screenplayElementClass } from "@/lib/screenplay/paginate";
import { ScriptElement } from "@/lib/screenplay/types";

const ZOOM_OPTIONS = [0.75, 1, 1.25];

function renderElement(element: ScriptElement) {
  const className = screenplayElementClass(element.type);
  const text =
    element.type === "scene_heading" ||
    element.type === "character" ||
    element.type === "transition" ||
    element.type === "shot"
      ? element.text.toUpperCase()
      : element.text;

  return (
    <div key={element.id} className={className}>
      {text}
    </div>
  );
}

export function ScreenplayPreview({
  script,
  showNotes = false,
  showPageOneNumber = false,
  zoom = 1,
}: {
  script: ScriptDocument;
  showNotes?: boolean;
  showPageOneNumber?: boolean;
  zoom?: number;
}) {
  const elements = useMemo(
    () => getScriptElements(script),
    [script]
  );

  const pages = useMemo(
    () => paginateScreenplay(elements, { includeNotes: showNotes }),
    [elements, showNotes]
  );

  return (
    <div className="screenplay-workspace overflow-x-auto rounded-2xl border border-slate-200 bg-slate-200/70 p-6">
      <div
        className="mx-auto origin-top space-y-8"
        style={{ transform: `scale(${zoom})`, width: "8.5in" }}
      >
        {pages.map((page) => {
          const showNumber = page.pageNumber > 1 || showPageOneNumber;
          return (
            <div key={page.pageNumber} className="screenplay-page">
              {showNumber ? <div className="page-number">{page.pageNumber}</div> : null}
              {page.elements.map((element) => renderElement(element))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ScreenplayPreviewControls({
  zoom,
  onZoomChange,
  showNotes,
  onShowNotesChange,
  showPageOneNumber,
  onShowPageOneNumberChange,
}: {
  zoom: number;
  onZoomChange: (zoom: number) => void;
  showNotes: boolean;
  onShowNotesChange: (value: boolean) => void;
  showPageOneNumber: boolean;
  onShowPageOneNumberChange: (value: boolean) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Zoom</span>
        {ZOOM_OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onZoomChange(option)}
            className={cn(
              "rounded-lg px-2.5 py-1 text-sm font-medium",
              zoom === option ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-600"
            )}
          >
            {Math.round(option * 100)}%
          </button>
        ))}
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={showNotes}
          onChange={(event) => onShowNotesChange(event.target.checked)}
        />
        Show notes
      </label>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={showPageOneNumber}
          onChange={(event) => onShowPageOneNumberChange(event.target.checked)}
        />
        Page number on page 1
      </label>
    </div>
  );
}

export function useScreenplayPreviewState(script: ScriptDocument) {
  const [zoom, setZoom] = useState(1);
  const [showNotes, setShowNotes] = useState(false);
  const [showPageOneNumber, setShowPageOneNumber] = useState(false);
  return {
    zoom,
    setZoom,
    showNotes,
    setShowNotes,
    showPageOneNumber,
    setShowPageOneNumber,
    previewScript: script,
  };
}
