"use client";

import { useCallback, useRef, useState } from "react";
import { StagePropIcon } from "@/components/stage/StagePropIcon";
import {
  applyCornerResize,
  getElementBounds,
  getPropDisplaySize,
  ResizeHandle,
  rotateDelta,
} from "@/lib/stage/elementBounds";
import { findStageProp } from "@/lib/stage/propCatalog";
import { StageElement, StageTool } from "@/lib/stage/types";
import { cn } from "@/lib/utils/cn";

const HANDLE_SIZE = 10;

function ResizeHandles({
  onPointerDown,
}: {
  onPointerDown: (e: React.PointerEvent, handle: ResizeHandle) => void;
}) {
  const handles: { id: ResizeHandle; className: string }[] = [
    { id: "nw", className: "left-0 top-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize" },
    { id: "ne", className: "right-0 top-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize" },
    { id: "sw", className: "bottom-0 left-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize" },
    { id: "se", className: "bottom-0 right-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize" },
  ];

  return (
    <>
      {handles.map(({ id, className }) => (
        <div
          key={id}
          className={cn(
            "absolute z-10 rounded-sm border-2 border-sky-500 bg-white shadow-sm",
            className
          )}
          style={{ width: HANDLE_SIZE, height: HANDLE_SIZE }}
          onPointerDown={(e) => {
            e.stopPropagation();
            onPointerDown(e, id);
          }}
        />
      ))}
    </>
  );
}

type DragState = {
  id: string;
  startX: number;
  startY: number;
  origX: number;
  origY: number;
  origX2?: number;
  origY2?: number;
};

type ResizeState = {
  id: string;
  handle: ResizeHandle;
  startX: number;
  startY: number;
  orig: { x: number; y: number; width: number; height: number };
  rotation: number;
};

type DrawState = {
  tool: "wall" | "room" | "doorway";
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
};

export function StageCanvas({
  elements,
  onChange,
  showGrid,
  selectedId,
  onSelect,
  activeTool,
  readOnly,
}: {
  elements: StageElement[];
  onChange: (elements: StageElement[]) => void;
  showGrid: boolean;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  activeTool: StageTool;
  readOnly?: boolean;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [resize, setResize] = useState<ResizeState | null>(null);
  const [draw, setDraw] = useState<DrawState | null>(null);
  const [arrowStart, setArrowStart] = useState<{ x: number; y: number } | null>(null);
  const [dropPreview, setDropPreview] = useState<{ x: number; y: number; propId: string } | null>(
    null
  );

  const clientToCanvas = useCallback((clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: clientX - rect.left, y: clientY - rect.top };
  }, []);

  const patchElement = (id: string, patch: Partial<StageElement>) => {
    onChange(
      elements.map((el) => (el.id === id ? ({ ...el, ...patch } as StageElement) : el))
    );
  };

  const applyBoundsToElement = (el: StageElement, bounds: { x: number; y: number; width: number; height: number }) => {
    if (el.kind === "note" || el.kind === "room" || el.kind === "doorway") {
      return { ...el, x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height };
    }
    if (el.kind === "prop") {
      return { ...el, x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height, scale: 1 };
    }
    return el;
  };

  const onPointerDownResize = (
    e: React.PointerEvent,
    el: StageElement,
    handle: ResizeHandle
  ) => {
    if (readOnly || activeTool !== "select") return;
    const bounds = getElementBounds(el);
    if (!bounds) return;
    onSelect(el.id);
    const { x, y } = clientToCanvas(e.clientX, e.clientY);
    setResize({
      id: el.id,
      handle,
      startX: x,
      startY: y,
      orig: bounds,
      rotation: el.kind === "prop" ? el.rotation : 0,
    });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerDownElement = (e: React.PointerEvent, el: StageElement) => {
    if (readOnly || activeTool !== "select") return;
    e.stopPropagation();
    onSelect(el.id);
    const { x, y } = clientToCanvas(e.clientX, e.clientY);
    setDrag({
      id: el.id,
      startX: x,
      startY: y,
      origX: el.x,
      origY: el.y,
      ...(el.kind === "wall" ? { origX2: el.x2, origY2: el.y2 } : {}),
    });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerDownCanvas = (e: React.PointerEvent) => {
    if (readOnly) return;
    const { x, y } = clientToCanvas(e.clientX, e.clientY);

    if (activeTool === "wall" || activeTool === "room" || activeTool === "doorway") {
      setDraw({ tool: activeTool, startX: x, startY: y, currentX: x, currentY: y });
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      return;
    }

    if (activeTool === "select") {
      onSelect(null);
    }
  };

  const onPointerMoveCanvas = (e: React.PointerEvent) => {
    const { x, y } = clientToCanvas(e.clientX, e.clientY);

    if (draw && !readOnly) {
      setDraw((d) => (d ? { ...d, currentX: x, currentY: y } : null));
      return;
    }

    if (resize && !readOnly) {
      let dx = x - resize.startX;
      let dy = y - resize.startY;
      if (resize.rotation) {
        ({ dx, dy } = rotateDelta(dx, dy, resize.rotation));
      }
      const next = applyCornerResize(resize.handle, resize.orig, dx, dy);
      onChange(
        elements.map((el) =>
          el.id === resize.id ? applyBoundsToElement(el, next) : el
        )
      );
      return;
    }

    if (drag && !readOnly) {
      const dx = x - drag.startX;
      const dy = y - drag.startY;
      if (drag.origX2 != null && drag.origY2 != null) {
        patchElement(drag.id, {
          x: drag.origX + dx,
          y: drag.origY + dy,
          x2: drag.origX2 + dx,
          y2: drag.origY2 + dy,
        });
      } else {
        patchElement(drag.id, {
          x: drag.origX + dx,
          y: drag.origY + dy,
        });
      }
      return;
    }
  };

  const finishDraw = (state: DrawState) => {
    const { startX, startY, currentX, currentY, tool } = state;
    const id = crypto.randomUUID();

    if (tool === "wall") {
      const len = Math.hypot(currentX - startX, currentY - startY);
      if (len < 12) return;
      onChange([
        ...elements,
        { id, kind: "wall", x: startX, y: startY, x2: currentX, y2: currentY, thickness: 10 },
      ]);
      onSelect(id);
      return;
    }

    const x = Math.min(startX, currentX);
    const y = Math.min(startY, currentY);
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);
    if (width < 16 || height < 16) return;

    if (tool === "room") {
      onChange([
        ...elements,
        { id, kind: "room", x, y, width, height, label: "Room" },
      ]);
    } else {
      onChange([
        ...elements,
        { id, kind: "doorway", x, y, width: Math.max(width, 32), height: Math.max(height, 12), swing: "right" },
      ]);
    }
    onSelect(id);
  };

  const onPointerUpCanvas = () => {
    if (draw) {
      finishDraw(draw);
      setDraw(null);
    }
    setDrag(null);
    setResize(null);
  };

  const onCanvasClick = (e: React.MouseEvent) => {
    if (readOnly || draw) return;
    const { x, y } = clientToCanvas(e.clientX, e.clientY);

    if (activeTool === "note") {
      const id = crypto.randomUUID();
      onChange([
        ...elements,
        {
          id,
          kind: "note",
          x,
          y,
          width: 140,
          height: 100,
          title: "NOTES",
          body: "Camera / light settings…",
          template: "general",
        },
      ]);
      onSelect(id);
      return;
    }

    if (activeTool === "arrow") {
      if (!arrowStart) {
        setArrowStart({ x, y });
        return;
      }
      const id = crypto.randomUUID();
      onChange([
        ...elements,
        { id, kind: "arrow", x: arrowStart.x, y: arrowStart.y, x2: x, y2: y },
      ]);
      setArrowStart(null);
      return;
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    const propId = e.dataTransfer.getData("application/x-stage-prop");
    if (!propId) return;
    const { x, y } = clientToCanvas(e.clientX, e.clientY);
    setDropPreview({ x, y, propId });
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (readOnly) return;
    const propId = e.dataTransfer.getData("application/x-stage-prop");
    if (!propId) return;
    const prop = findStageProp(propId);
    const { x, y } = clientToCanvas(e.clientX, e.clientY);
    const id = crypto.randomUUID();
    const w = prop?.width ?? 48;
    const h = prop?.height ?? 48;
    onChange([
      ...elements,
      {
        id,
        kind: "prop",
        propId,
        x: x - w / 2,
        y: y - h / 2,
        rotation: 0,
        scale: 1,
        width: w,
        height: h,
      },
    ]);
    setDropPreview(null);
    onSelect(id);
  };

  const showResizeHandles = (el: StageElement) =>
    !readOnly && activeTool === "select" && el.id === selectedId &&
    (el.kind === "prop" || el.kind === "note" || el.kind === "room" || el.kind === "doorway");

  const renderDrawPreview = () => {
    if (!draw) return null;
    const { tool, startX, startY, currentX, currentY } = draw;

    if (tool === "wall") {
      return (
        <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
          <line
            x1={startX}
            y1={startY}
            x2={currentX}
            y2={currentY}
            stroke="#475569"
            strokeWidth={10}
            strokeLinecap="square"
            opacity={0.7}
          />
        </svg>
      );
    }

    const x = Math.min(startX, currentX);
    const y = Math.min(startY, currentY);
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);

    if (tool === "room") {
      return (
        <div
          className="pointer-events-none absolute border-2 border-dashed border-slate-500 bg-slate-200/30"
          style={{ left: x, top: y, width, height }}
        />
      );
    }

    return (
      <div
        className="pointer-events-none absolute border-2 border-dashed border-amber-600 bg-amber-100/40"
        style={{ left: x, top: y, width: Math.max(width, 32), height: Math.max(height, 12) }}
      />
    );
  };

  return (
    <div
      ref={canvasRef}
      className={cn(
        "relative min-h-[520px] flex-1 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 touch-none",
        showGrid && "stage-grid-bg",
        activeTool === "wall" || activeTool === "room" || activeTool === "doorway"
          ? "cursor-crosshair"
          : undefined
      )}
      onPointerDown={onPointerDownCanvas}
      onPointerMove={onPointerMoveCanvas}
      onPointerUp={onPointerUpCanvas}
      onPointerLeave={onPointerUpCanvas}
      onClick={onCanvasClick}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragLeave={() => setDropPreview(null)}
    >
      {elements.map((el) => {
        if (el.kind === "wall") {
          const selected = el.id === selectedId;
          return (
            <svg
              key={el.id}
              className={cn("absolute inset-0 h-full w-full", selected ? "z-[1]" : undefined)}
              aria-hidden={false}
            >
              <line
                x1={el.x}
                y1={el.y}
                x2={el.x2}
                y2={el.y2}
                stroke="transparent"
                strokeWidth={Math.max(el.thickness + 12, 20)}
                strokeLinecap="square"
                className={readOnly || activeTool !== "select" ? undefined : "cursor-move"}
                onPointerDown={(e) => onPointerDownElement(e, el)}
              />
              <line
                x1={el.x}
                y1={el.y}
                x2={el.x2}
                y2={el.y2}
                stroke={selected ? "#0ea5e9" : "#475569"}
                strokeWidth={el.thickness}
                strokeLinecap="square"
                pointerEvents="none"
              />
            </svg>
          );
        }

        if (el.kind === "room") {
          const selected = el.id === selectedId;
          return (
            <div
              key={el.id}
              className={cn(
                "absolute cursor-move select-none border-2 bg-slate-100/20",
                selected ? "border-sky-500 ring-2 ring-sky-500/30" : "border-slate-500"
              )}
              style={{ left: el.x, top: el.y, width: el.width, height: el.height }}
              onPointerDown={(e) => onPointerDownElement(e, el)}
            >
              {el.label && (
                <span className="absolute left-1 top-1 text-[10px] font-medium text-slate-500">
                  {readOnly ? (
                    el.label
                  ) : (
                    <input
                      className="w-24 bg-transparent outline-none"
                      value={el.label}
                      onChange={(ev) => patchElement(el.id, { label: ev.target.value })}
                      onClick={(ev) => ev.stopPropagation()}
                    />
                  )}
                </span>
              )}
              {showResizeHandles(el) && (
                <ResizeHandles onPointerDown={(e, handle) => onPointerDownResize(e, el, handle)} />
              )}
            </div>
          );
        }

        if (el.kind === "doorway") {
          const selected = el.id === selectedId;
          const swing = el.swing ?? "right";
          return (
            <div
              key={el.id}
              className={cn(
                "absolute cursor-move select-none",
                selected && "ring-2 ring-sky-500 ring-offset-1"
              )}
              style={{ left: el.x, top: el.y, width: el.width, height: el.height }}
              onPointerDown={(e) => onPointerDownElement(e, el)}
            >
              <svg width="100%" height="100%" viewBox={`0 0 ${el.width} ${el.height}`} aria-hidden>
                <rect
                  x={1}
                  y={1}
                  width={el.width - 2}
                  height={el.height - 2}
                  fill="#fef3c7"
                  stroke={selected ? "#0ea5e9" : "#b45309"}
                  strokeWidth={2}
                  strokeDasharray="6 3"
                />
                <path
                  d={
                    swing === "right"
                      ? `M 2 ${el.height - 2} L 2 2 A ${el.width - 4} ${el.height - 4} 0 0 1 ${el.width - 2} ${el.height - 2}`
                      : `M ${el.width - 2} ${el.height - 2} L ${el.width - 2} 2 A ${el.width - 4} ${el.height - 4} 0 0 0 2 ${el.height - 2}`
                  }
                  fill="none"
                  stroke={selected ? "#0ea5e9" : "#92400e"}
                  strokeWidth={1.5}
                />
              </svg>
              {showResizeHandles(el) && (
                <ResizeHandles onPointerDown={(e, handle) => onPointerDownResize(e, el, handle)} />
              )}
            </div>
          );
        }

        if (el.kind === "arrow") {
          const selected = el.id === selectedId;
          return (
            <svg
              key={el.id}
              className="pointer-events-none absolute inset-0 h-full w-full"
              aria-hidden
            >
              <defs>
                <marker id={`arrowhead-${el.id}`} markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                  <polygon points="0 0, 8 3, 0 6" fill={selected ? "#0ea5e9" : "#64748b"} />
                </marker>
              </defs>
              <line
                x1={el.x}
                y1={el.y}
                x2={el.x2}
                y2={el.y2}
                stroke={selected ? "#0ea5e9" : "#64748b"}
                strokeWidth={selected ? 2.5 : 2}
                strokeDasharray="6 4"
                markerEnd={`url(#arrowhead-${el.id})`}
              />
            </svg>
          );
        }

        if (el.kind === "note") {
          const selected = el.id === selectedId;
          return (
            <div
              key={el.id}
              className={cn(
                "absolute cursor-move select-none overflow-visible rounded-md border shadow-sm",
                selected ? "ring-2 ring-sky-500" : "border-slate-300"
              )}
              style={{ left: el.x, top: el.y, width: el.width, minHeight: el.height }}
              onPointerDown={(e) => onPointerDownElement(e, el)}
            >
              <div className="overflow-hidden rounded-md">
                <div className="bg-slate-700 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                  {readOnly ? (
                    el.title
                  ) : (
                    <input
                      className="w-full bg-transparent outline-none"
                      value={el.title}
                      onChange={(ev) => patchElement(el.id, { title: ev.target.value })}
                      onClick={(ev) => ev.stopPropagation()}
                    />
                  )}
                </div>
                {readOnly ? (
                  <pre className="whitespace-pre-wrap bg-white p-2 text-[11px] leading-snug text-slate-800">
                    {el.body}
                  </pre>
                ) : (
                  <textarea
                    className="min-h-[72px] w-full resize-none bg-white p-2 text-[11px] leading-snug text-slate-800 outline-none"
                    style={{ minHeight: Math.max(72, el.height - 28) }}
                    value={el.body}
                    onChange={(ev) => patchElement(el.id, { body: ev.target.value })}
                    onClick={(ev) => ev.stopPropagation()}
                  />
                )}
              </div>
              {showResizeHandles(el) && (
                <ResizeHandles onPointerDown={(e, handle) => onPointerDownResize(e, el, handle)} />
              )}
            </div>
          );
        }

        const prop = findStageProp(el.propId);
        if (!prop) return null;
        const selected = el.id === selectedId;
        const { width, height } = getPropDisplaySize(el, prop.width, prop.height);
        return (
          <div
            key={el.id}
            className={cn(
              "absolute select-none",
              activeTool === "select" ? "cursor-move" : undefined,
              selected && "ring-2 ring-sky-500 ring-offset-2 rounded"
            )}
            style={{
              left: el.x,
              top: el.y,
              width,
              height,
              transform: `rotate(${el.rotation}deg)`,
              transformOrigin: `${width / 2}px ${height / 2}px`,
            }}
            onPointerDown={(e) => onPointerDownElement(e, el)}
          >
            <StagePropIcon prop={prop} width={width} height={height} />
            {el.label && (
              <p className="mt-0.5 max-w-[120px] text-center text-[9px] leading-tight text-slate-600">
                {el.label}
              </p>
            )}
            {showResizeHandles(el) && (
              <ResizeHandles onPointerDown={(e, handle) => onPointerDownResize(e, el, handle)} />
            )}
          </div>
        );
      })}

      {renderDrawPreview()}

      {arrowStart && (
        <div
          className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-500"
          style={{ left: arrowStart.x, top: arrowStart.y }}
        />
      )}

      {dropPreview && (
        <div
          className="pointer-events-none absolute opacity-50"
          style={{ left: dropPreview.x - 24, top: dropPreview.y - 24 }}
        >
          {findStageProp(dropPreview.propId) && (
            <StagePropIcon prop={findStageProp(dropPreview.propId)!} />
          )}
        </div>
      )}
    </div>
  );
}
