"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  DoorOpen,
  LayoutPanelTop,
  MousePointer2,
  RotateCw,
  RotateCcw,
  Square,
  StickyNote,
  Trash2,
  Grid3X3,
  Minus,
  Eraser,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StageCanvas } from "@/components/stage/StageCanvas";
import { StageElementInspector } from "@/components/stage/StageElementInspector";
import { StagePropSidebar } from "@/components/stage/StagePropSidebar";
import { saveStageBoard } from "@/lib/stage/stageFirestore";
import { isStageRotatable, stageElementRotation } from "@/lib/stage/elementBounds";
import { NOTE_TEMPLATES, StageBoard, StageElement, StageTool } from "@/lib/stage/types";
import { cn } from "@/lib/utils/cn";

export function StagePlanner({
  board,
  onBoardChange,
  readOnly,
}: {
  board: StageBoard;
  onBoardChange: (board: StageBoard) => void;
  readOnly?: boolean;
}) {
  const [elements, setElements] = useState<StageElement[]>(board.elements ?? []);
  const [showGrid, setShowGrid] = useState(board.showGrid !== false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<StageTool>("select");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setElements(board.elements ?? []);
    setShowGrid(board.showGrid !== false);
  }, [board.id, board.elements, board.showGrid]);

  const persist = useCallback(
    (next: StageElement[], grid = showGrid) => {
      onBoardChange({ ...board, elements: next, showGrid: grid });
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        setSaving(true);
        setSaveError(null);
        try {
          await saveStageBoard(board.id, { elements: next, showGrid: grid });
        } catch (e) {
          setSaveError(e instanceof Error ? e.message : "Failed to save stage plan");
        } finally {
          setSaving(false);
        }
      }, 600);
    },
    [board, onBoardChange, showGrid]
  );

  const updateElements = (next: StageElement[]) => {
    setElements(next);
    persist(next);
  };

  const selected = elements.find((e) => e.id === selectedId);

  const rotateSelected = (direction: "left" | "right") => {
    if (!selected || !isStageRotatable(selected) || readOnly) return;
    const delta = direction === "right" ? 15 : -15;
    updateElements(
      elements.map((el) => {
        if (el.id !== selected.id || !isStageRotatable(el)) return el;
        const current = stageElementRotation(el);
        const rotation = (((current + delta) % 360) + 360) % 360;
        return { ...el, rotation };
      })
    );
  };

  const deleteSelected = () => {
    if (!selectedId || readOnly) return;
    updateElements(elements.filter((e) => e.id !== selectedId));
    setSelectedId(null);
  };

  const addNoteTemplate = (template: keyof typeof NOTE_TEMPLATES) => {
    if (readOnly) return;
    const t = NOTE_TEMPLATES[template];
    const id = crypto.randomUUID();
    updateElements([
      ...elements,
      {
        id,
        kind: "note",
        x: 80,
        y: 80,
        width: 150,
        height: 110,
        title: t.title,
        body: t.body,
        template,
      },
    ]);
    setSelectedId(id);
    setActiveTool("select");
  };

  const patchSelected = (patch: Partial<StageElement>) => {
    if (!selectedId || readOnly) return;
    updateElements(
      elements.map((el) => (el.id === selectedId ? ({ ...el, ...patch } as StageElement) : el))
    );
  };

  const resetBoard = () => {
    if (elements.length === 0) return;
    if (
      !window.confirm(
        "Clear the entire stage plan? All rooms, props, and lighting elements will be removed."
      )
    ) {
      return;
    }
    updateElements([]);
    setSelectedId(null);
    setActiveTool("select");
  };

  return (
    <div className="flex flex-col gap-3 lg:flex-row">
      {!readOnly && <StagePropSidebar className="max-h-[70vh] lg:max-h-[calc(100vh-12rem)]" />}

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-1">
          {saving && <span className="text-xs text-slate-400">Saving…</span>}
          {saveError && <span className="text-xs text-red-600">{saveError}</span>}
          <div className="flex rounded-lg border border-slate-200 bg-white p-0.5">
            {(
              [
                { id: "select" as const, icon: MousePointer2, label: "Select" },
                { id: "wall" as const, icon: Minus, label: "Wall" },
                { id: "room" as const, icon: Square, label: "Room" },
                { id: "doorway" as const, icon: DoorOpen, label: "Doorway" },
                { id: "window" as const, icon: LayoutPanelTop, label: "Window" },
                { id: "note" as const, icon: StickyNote, label: "Note" },
                { id: "arrow" as const, icon: ArrowRight, label: "Light arrow" },
              ] as const
            ).map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                type="button"
                title={label}
                disabled={readOnly}
                className={cn(
                  "flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium",
                  activeTool === id ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"
                )}
                onClick={() => {
                  setActiveTool(id);
                  setSelectedId(null);
                }}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
          {!readOnly && (
            <>
              <Button type="button" size="sm" variant="outline" onClick={() => addNoteTemplate("camera")}>
                + Camera note
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => addNoteTemplate("light")}>
                + Light note
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => rotateSelected("left")}
                disabled={!selected || !isStageRotatable(selected)}
                title="Rotate left 15°"
              >
                <RotateCcw className="mr-1 h-3.5 w-3.5" />
                Left
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => rotateSelected("right")}
                disabled={!selected || !isStageRotatable(selected)}
                title="Rotate right 15° — props face arrow; windows spill into room"
              >
                <RotateCw className="mr-1 h-3.5 w-3.5" />
                Right
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  const next = !showGrid;
                  setShowGrid(next);
                  persist(elements, next);
                }}
              >
                <Grid3X3 className="mr-1 h-3.5 w-3.5" />
                Grid
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={elements.length === 0}
                onClick={resetBoard}
              >
                <Eraser className="mr-1 h-3.5 w-3.5" />
                Reset
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={!selectedId}
                onClick={deleteSelected}
              >
                <Trash2 className="mr-1 h-3.5 w-3.5" />
                Delete
              </Button>
            </>
          )}
        </div>

        {activeTool === "arrow" && !readOnly && (
          <p className="text-xs text-sky-700">Click start point, then end point for light direction arrow.</p>
        )}
        {(activeTool === "wall" || activeTool === "room" || activeTool === "doorway" || activeTool === "window") && !readOnly && (
          <p className="text-xs text-sky-700">
            {activeTool === "wall"
              ? "Click and drag to draw a wall segment."
              : activeTool === "room"
                ? "Click and drag to outline a room."
                : activeTool === "window"
                  ? "Click and drag on a wall to place a window — daylight spill shows into the room."
                  : "Click and drag to mark a doorway opening."}
          </p>
        )}
        {activeTool === "select" && selected && !readOnly && (
          <p className="text-xs text-slate-500">
            Drag to move · corner handles to resize · use the color picker in the panel to match your
            diagram.
          </p>
        )}

        <div className="flex min-w-0 flex-1 flex-col gap-3 lg:flex-row">
          <StageCanvas
            elements={elements}
            onChange={updateElements}
            showGrid={showGrid}
            selectedId={selectedId}
            onSelect={setSelectedId}
            activeTool={activeTool}
            readOnly={readOnly}
          />
          {activeTool === "select" && selected && !readOnly ? (
            <StageElementInspector element={selected} onPatch={patchSelected} />
          ) : null}
        </div>
      </div>
    </div>
  );
}
