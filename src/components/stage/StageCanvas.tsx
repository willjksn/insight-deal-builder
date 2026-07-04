"use client";

import { Lock } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { StagePropIcon } from "@/components/stage/StagePropIcon";
import { StageLightBeam } from "@/components/stage/StageLightBeam";
import { StageWindowDaylight } from "@/components/stage/StageWindowDaylight";
import {
  applyResize,
  elementRenderRank,
  getElementBounds,
  getPropDisplaySize,
  hitTestAtPoint,
  hitTestRoomEdge,
  labelAnchorAboveRotatedBox,
  ResizeHandle,
  ROOM_EDGE_HIT,
  rotateDelta,
  stageElementRotation,
} from "@/lib/stage/elementBounds";
import { findStageProp } from "@/lib/stage/propCatalog";
import { defaultBeamForProp, isBeamCapableProp, resolveLightBeam, resolveWindowSpill } from "@/lib/stage/lightBeam";
import {
  labelBadgeColor,
  resolvePropColor,
  STAGE_DEFAULT_COLORS,
} from "@/lib/stage/elementColor";
import { StageElement, StageTool } from "@/lib/stage/types";
import {
  applyDragDelta,
  groupedDragOrigins,
  type ElementDragOrigin,
} from "@/lib/stage/stageRoomGroup";
import { cn } from "@/lib/utils/cn";

const HANDLE_SIZE = 10;
const NOTE_MIN_HEIGHT = 40;

function RoomEdgeHitTargets({
  onPointerDown,
}: {
  onPointerDown: (e: React.PointerEvent) => void;
}) {
  const edge = ROOM_EDGE_HIT;
  const strip = "absolute pointer-events-auto cursor-move";
  return (
    <>
      <div className={strip} style={{ left: 0, top: 0, right: 0, height: edge }} onPointerDown={onPointerDown} />
      <div className={strip} style={{ left: 0, right: 0, bottom: 0, height: edge }} onPointerDown={onPointerDown} />
      <div className={strip} style={{ left: 0, top: 0, bottom: 0, width: edge }} onPointerDown={onPointerDown} />
      <div className={strip} style={{ right: 0, top: 0, bottom: 0, width: edge }} onPointerDown={onPointerDown} />
    </>
  );
}

function ResizeHandles({
  onPointerDown,
  edges,
}: {
  onPointerDown: (e: React.PointerEvent, handle: ResizeHandle) => void;
  edges?: boolean;
}) {
  const handles: { id: ResizeHandle; className: string }[] = [
    { id: "nw", className: "left-0 top-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize" },
    { id: "ne", className: "right-0 top-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize" },
    { id: "sw", className: "bottom-0 left-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize" },
    { id: "se", className: "bottom-0 right-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize" },
  ];
  if (edges) {
    handles.push(
      { id: "n", className: "left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize" },
      { id: "s", className: "bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 cursor-ns-resize" },
      { id: "e", className: "right-0 top-1/2 translate-x-1/2 -translate-y-1/2 cursor-ew-resize" },
      { id: "w", className: "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize" }
    );
  }

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
  groupedOrigins?: Record<string, ElementDragOrigin>;
};

type ResizeState = {
  id: string;
  handle: ResizeHandle;
  startX: number;
  startY: number;
  orig: { x: number; y: number; width: number; height: number };
  rotation: number;
  minSize: number;
};

type DrawState = {
  tool: "wall" | "room" | "doorway" | "window";
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

  const captureOnCanvas = (e: React.PointerEvent) => {
    canvasRef.current?.setPointerCapture(e.pointerId);
  };

  const beginDrag = (el: StageElement, clientX: number, clientY: number) => {
    onSelect(el.id);
    const { x, y } = clientToCanvas(clientX, clientY);
    const groupedOrigins =
      el.kind === "room" ? groupedDragOrigins(el, elements) : undefined;
    setDrag({
      id: el.id,
      startX: x,
      startY: y,
      origX: el.x,
      origY: el.y,
      ...(el.kind === "wall" ? { origX2: el.x2, origY2: el.y2 } : {}),
      ...(groupedOrigins ? { groupedOrigins } : {}),
    });
  };

  const patchElement = (id: string, patch: Partial<StageElement>) => {
    onChange(
      elements.map((el) => (el.id === id ? ({ ...el, ...patch } as StageElement) : el))
    );
  };

  const applyBoundsToElement = (el: StageElement, bounds: { x: number; y: number; width: number; height: number }) => {
    if (el.kind === "note" || el.kind === "room" || el.kind === "doorway" || el.kind === "window") {
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
    handle: ResizeHandle,
    minSize = 16
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
      rotation: stageElementRotation(el),
      minSize,
    });
    captureOnCanvas(e);
  };

  const onPointerDownElement = (e: React.PointerEvent, el: StageElement) => {
    if (readOnly || activeTool !== "select") return;
    e.stopPropagation();
    beginDrag(el, e.clientX, e.clientY);
    captureOnCanvas(e);
  };

  const onPointerDownCanvas = (e: React.PointerEvent) => {
    if (readOnly) return;
    const { x, y } = clientToCanvas(e.clientX, e.clientY);

    if (activeTool === "wall" || activeTool === "room" || activeTool === "doorway" || activeTool === "window") {
      setDraw({ tool: activeTool, startX: x, startY: y, currentX: x, currentY: y });
      captureOnCanvas(e);
      return;
    }

    if (activeTool === "select") {
      const hit = hitTestAtPoint(x, y, elements);
      if (hit) {
        e.stopPropagation();
        beginDrag(hit, e.clientX, e.clientY);
        captureOnCanvas(e);
        return;
      }
      const roomEdge = [...elements]
        .reverse()
        .find((el) => el.kind === "room" && hitTestRoomEdge(x, y, el));
      if (roomEdge) {
        e.stopPropagation();
        beginDrag(roomEdge, e.clientX, e.clientY);
        captureOnCanvas(e);
        return;
      }
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
      const next = applyResize(resize.handle, resize.orig, dx, dy, resize.minSize);
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
      onChange(
        elements.map((el) => {
          if (el.id === drag.id) {
            if (drag.origX2 != null && drag.origY2 != null && el.kind === "wall") {
              return {
                ...el,
                x: drag.origX + dx,
                y: drag.origY + dy,
                x2: drag.origX2 + dx,
                y2: drag.origY2 + dy,
              };
            }
            return { ...el, x: drag.origX + dx, y: drag.origY + dy };
          }
          const origin = drag.groupedOrigins?.[el.id];
          if (origin) return applyDragDelta(el, origin, dx, dy);
          return el;
        })
      );
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

    if (tool === "room") {
      if (width < 16 || height < 16) return;
      onChange([
        ...elements,
        { id, kind: "room", x, y, width, height, label: "Room", lockContents: true },
      ]);
      onSelect(id);
      return;
    }

    if (tool === "window") {
      if (width < 6 && height < 6) return;
      const winWidth = Math.max(width, 32);
      onChange([
        ...elements,
        {
          id,
          kind: "window",
          x,
          y,
          width: winWidth,
          height: Math.max(height, 10),
          color: STAGE_DEFAULT_COLORS.window,
          beamEnabled: true,
          beamSpread: 56,
          beamLength: Math.min(120, Math.max(40, winWidth * 0.75)),
          beamOpacity: 0.45,
        },
      ]);
      onSelect(id);
      return;
    }

    if (tool === "doorway") {
      if (width < 6 && height < 6) return;
      onChange([
        ...elements,
        {
          id,
          kind: "doorway",
          x,
          y,
          width: Math.max(width, 32),
          height: Math.max(height, 12),
          swing: "right",
          color: STAGE_DEFAULT_COLORS.doorway,
        },
      ]);
      onSelect(id);
      return;
    }
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
          title: "",
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
    const beamDefaults = isBeamCapableProp(propId) ? defaultBeamForProp(propId) : {};
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
        color: prop?.color,
        label: prop?.name,
        ...(isBeamCapableProp(propId)
          ? {
              beamEnabled: beamDefaults.enabled ?? true,
              beamSpread: beamDefaults.spread,
              beamLength: beamDefaults.length,
              beamColor: beamDefaults.color,
              beamOpacity: beamDefaults.opacity,
            }
          : {}),
      },
    ]);
    setDropPreview(null);
    onSelect(id);
  };

  const showResizeHandles = (el: StageElement) =>
    !readOnly && activeTool === "select" && el.id === selectedId &&
    (el.kind === "prop" || el.kind === "note" || el.kind === "room" || el.kind === "doorway" || el.kind === "window");

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
          className="pointer-events-none absolute border-2 border-dashed border-slate-500 bg-slate-400/15"
          style={{ left: x, top: y, width, height }}
        />
      );
    }

    if (tool === "window") {
      return (
        <div
          className="pointer-events-none absolute border-2 border-dashed border-sky-500 bg-sky-200/50"
          style={{
            left: x,
            top: y,
            width: Math.max(width, 32),
            height: Math.max(height, 10),
          }}
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

  const sortedElements = [...elements].sort((a, b) => {
    const aBump = a.id === selectedId && a.kind !== "room";
    const bBump = b.id === selectedId && b.kind !== "room";
    if (aBump) return 1;
    if (bBump) return -1;
    return elementRenderRank(a) - elementRenderRank(b);
  });

  const elementZIndex = (el: StageElement, selected: boolean) => {
    if (el.kind === "room") return 1;
    if (selected) return 40;
    return 10 + elementRenderRank(el);
  };

  return (
    <div
      ref={canvasRef}
      className={cn(
        "relative min-h-[520px] flex-1 overflow-hidden rounded-xl border border-slate-300 bg-white touch-none",
        showGrid && "stage-grid-bg",
        activeTool === "wall" || activeTool === "room" || activeTool === "doorway" || activeTool === "window"
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
      {sortedElements.map((el) => {
        if (el.kind === "wall") {
          const selected = el.id === selectedId;
          const wallColor = el.color ?? STAGE_DEFAULT_COLORS.wall;
          return (
            <svg
              key={el.id}
              className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
              style={{ zIndex: elementZIndex(el, selected) }}
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
                className={readOnly || activeTool !== "select" ? undefined : "pointer-events-auto cursor-move"}
                onPointerDown={(e) => onPointerDownElement(e, el)}
              />
              <line
                x1={el.x}
                y1={el.y}
                x2={el.x2}
                y2={el.y2}
                stroke={selected ? "#0ea5e9" : wallColor}
                strokeWidth={el.thickness}
                strokeLinecap="square"
                pointerEvents="none"
              />
            </svg>
          );
        }

        if (el.kind === "room") {
          const selected = el.id === selectedId;
          const borderColor = selected ? "#0ea5e9" : STAGE_DEFAULT_COLORS.roomBorder;
          const locked = el.lockContents === true;
          return (
            <div
              key={el.id}
              className="pointer-events-none absolute select-none"
              style={{
                left: el.x,
                top: el.y,
                width: el.width,
                height: el.height,
                zIndex: elementZIndex(el, selected),
              }}
            >
              <div
                className={cn(
                  "absolute inset-0 border-2 transition-colors",
                  selected && "ring-2 ring-sky-500/40 ring-offset-1",
                  locked && !selected && "border-dashed"
                )}
                style={{
                  borderColor,
                  backgroundColor: selected
                    ? "rgba(14, 165, 233, 0.07)"
                    : "rgba(248, 250, 252, 0.35)",
                }}
              />
              {!readOnly && activeTool === "select" && (
                <RoomEdgeHitTargets
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    onPointerDownElement(e, el);
                  }}
                />
              )}
              {el.label && (
                <span className="pointer-events-auto absolute left-1 top-1 flex items-center gap-1 rounded bg-white/90 px-1 text-[10px] font-medium text-slate-600 shadow-sm">
                  {locked ? (
                    <Lock className="h-2.5 w-2.5 shrink-0 text-sky-600" aria-hidden />
                  ) : null}
                  {readOnly ? (
                    el.label
                  ) : (
                    <input
                      className="w-24 bg-transparent outline-none"
                      value={el.label}
                      onChange={(ev) => patchElement(el.id, { label: ev.target.value })}
                      onClick={(ev) => ev.stopPropagation()}
                      onPointerDown={(ev) => {
                        ev.stopPropagation();
                        onSelect(el.id);
                      }}
                    />
                  )}
                </span>
              )}
              {showResizeHandles(el) && (
                <div className="pointer-events-auto absolute inset-0">
                  <ResizeHandles onPointerDown={(e, handle) => onPointerDownResize(e, el, handle)} />
                </div>
              )}
            </div>
          );
        }

        if (el.kind === "window") {
          const selected = el.id === selectedId;
          const fill = el.color ?? STAGE_DEFAULT_COLORS.window;
          const stroke = selected ? "#0ea5e9" : STAGE_DEFAULT_COLORS.windowStroke;
          const spill = resolveWindowSpill(el);
          const rotation = el.rotation ?? 0;
          const labelPos = el.label
            ? labelAnchorAboveRotatedBox(el.width, el.height, rotation)
            : null;
          return (
            <div
              key={el.id}
              className={cn(
                "absolute cursor-move select-none overflow-visible",
                selected && "ring-2 ring-sky-500 ring-offset-1"
              )}
              style={{
                left: el.x,
                top: el.y,
                width: el.width,
                height: el.height,
                zIndex: elementZIndex(el, selected),
              }}
              onPointerDown={(e) => onPointerDownElement(e, el)}
            >
              {labelPos && (
                <span
                  className="pointer-events-none absolute z-30 text-[9px] font-medium text-sky-800"
                  style={{
                    left: labelPos.left,
                    top: labelPos.top,
                    transform: "translate(-50%, -100%)",
                  }}
                >
                  {el.label}
                </span>
              )}
              <div
                className="relative h-full w-full overflow-visible"
                style={{
                  transform: rotation ? `rotate(${rotation}deg)` : undefined,
                  transformOrigin: `${el.width / 2}px ${el.height / 2}px`,
                }}
              >
                <StageWindowDaylight
                  width={el.width}
                  height={el.height}
                  spill={spill}
                  windowId={el.id}
                  glassColor={fill}
                  strokeColor={stroke}
                />
                {showResizeHandles(el) && (
                  <ResizeHandles onPointerDown={(e, handle) => onPointerDownResize(e, el, handle)} />
                )}
              </div>
            </div>
          );
        }

        if (el.kind === "doorway") {
          const selected = el.id === selectedId;
          const swing = el.swing ?? "right";
          const fill = el.color ?? STAGE_DEFAULT_COLORS.doorway;
          const stroke = selected ? "#0ea5e9" : STAGE_DEFAULT_COLORS.doorwayStroke;
          const rotation = el.rotation ?? 0;
          return (
            <div
              key={el.id}
              className={cn(
                "absolute cursor-move select-none overflow-visible",
                selected && "ring-2 ring-sky-500 ring-offset-1"
              )}
              style={{
                left: el.x,
                top: el.y,
                width: el.width,
                height: el.height,
                zIndex: elementZIndex(el, selected),
              }}
              onPointerDown={(e) => onPointerDownElement(e, el)}
            >
              <div
                className="relative h-full w-full overflow-visible"
                style={{
                  transform: rotation ? `rotate(${rotation}deg)` : undefined,
                  transformOrigin: `${el.width / 2}px ${el.height / 2}px`,
                }}
              >
                <svg width="100%" height="100%" viewBox={`0 0 ${el.width} ${el.height}`} className="pointer-events-none" aria-hidden>
                  <rect
                    x={1}
                    y={1}
                    width={el.width - 2}
                    height={el.height - 2}
                    fill={fill}
                    stroke={stroke}
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
                    stroke={stroke}
                    strokeWidth={1.5}
                  />
                </svg>
                {showResizeHandles(el) && (
                  <ResizeHandles onPointerDown={(e, handle) => onPointerDownResize(e, el, handle)} />
                )}
              </div>
            </div>
          );
        }

        if (el.kind === "arrow") {
          const selected = el.id === selectedId;
          const arrowColor = el.color ?? STAGE_DEFAULT_COLORS.arrow;
          return (
            <svg
              key={el.id}
              className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
              style={{ zIndex: elementZIndex(el, selected) }}
              aria-hidden={false}
            >
              <defs>
                <marker id={`arrowhead-${el.id}`} markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                  <polygon points="0 0, 8 3, 0 6" fill={selected ? "#0ea5e9" : arrowColor} />
                </marker>
              </defs>
              <line
                x1={el.x}
                y1={el.y}
                x2={el.x2}
                y2={el.y2}
                stroke="transparent"
                strokeWidth={14}
                strokeLinecap="round"
                className={readOnly || activeTool !== "select" ? undefined : "pointer-events-auto cursor-move"}
                onPointerDown={(e) => onPointerDownElement(e, el)}
              />
              <line
                x1={el.x}
                y1={el.y}
                x2={el.x2}
                y2={el.y2}
                stroke={selected ? "#0ea5e9" : arrowColor}
                strokeWidth={selected ? 3 : 2.5}
                strokeOpacity={0.85}
                strokeDasharray="6 4"
                markerEnd={`url(#arrowhead-${el.id})`}
                pointerEvents="none"
              />
            </svg>
          );
        }

        if (el.kind === "note") {
          const selected = el.id === selectedId;
          const accent = el.color ?? STAGE_DEFAULT_COLORS.noteHeader;
          return (
            <div
              key={el.id}
              className={cn(
                "absolute flex cursor-move select-none flex-col overflow-visible rounded-md border bg-white shadow-sm",
                selected ? "ring-2 ring-sky-500" : "border-slate-300"
              )}
              style={{
                left: el.x,
                top: el.y,
                width: el.width,
                height: el.height,
                borderLeftWidth: 3,
                borderLeftColor: accent,
                zIndex: elementZIndex(el, selected),
              }}
              onPointerDown={(e) => onPointerDownElement(e, el)}
            >
              {readOnly ? (
                <pre className="h-full overflow-auto whitespace-pre-wrap p-2 text-[11px] leading-snug text-slate-800">
                  {el.body}
                </pre>
              ) : (
                <textarea
                  className="h-full w-full resize-none overflow-auto bg-transparent p-2 text-[11px] leading-snug text-slate-800 outline-none"
                  value={el.body}
                  onChange={(ev) => patchElement(el.id, { body: ev.target.value })}
                  onClick={(ev) => ev.stopPropagation()}
                  onPointerDown={(ev) => ev.stopPropagation()}
                  placeholder="Camera, light, lens…"
                />
              )}
              {showResizeHandles(el) && (
                <ResizeHandles
                  edges
                  onPointerDown={(e, handle) =>
                    onPointerDownResize(e, el, handle, NOTE_MIN_HEIGHT)
                  }
                />
              )}
            </div>
          );
        }

        const prop = findStageProp(el.propId);
        if (!prop) return null;
        const selected = el.id === selectedId;
        const { width, height } = getPropDisplaySize(el, prop.width, prop.height);
        const fillColor = resolvePropColor(el);
        const badgeBg = labelBadgeColor(prop.category, fillColor);
        const displayLabel = el.label?.trim() || prop.name;
        const beam = resolveLightBeam(el);
        const beamOriginY = height * (prop.category === "lighting" ? 0.88 : 0.72);
        const labelPos = displayLabel
          ? labelAnchorAboveRotatedBox(width, height, el.rotation)
          : null;
        return (
          <div
            key={el.id}
            className={cn(
              "absolute select-none overflow-visible",
              activeTool === "select" ? "cursor-move" : undefined,
              selected && "ring-2 ring-sky-500 ring-offset-2 rounded"
            )}
            style={{
              left: el.x,
              top: el.y,
              width,
              height,
              zIndex: elementZIndex(el, selected),
            }}
            onPointerDown={(e) => onPointerDownElement(e, el)}
          >
            {labelPos && (
              <div
                className="pointer-events-none absolute z-30 max-w-[160px] text-center"
                style={{
                  left: labelPos.left,
                  top: labelPos.top,
                  transform: "translate(-50%, -100%)",
                }}
              >
                <span
                  className="inline-block rounded-md px-1.5 py-0.5 text-[9px] font-semibold leading-tight text-white shadow-sm"
                  style={{ backgroundColor: badgeBg }}
                >
                  {displayLabel}
                </span>
              </div>
            )}
            <div
              className="relative h-full w-full overflow-visible"
              style={{
                transform: `rotate(${el.rotation}deg)`,
                transformOrigin: `${width / 2}px ${height / 2}px`,
              }}
            >
            {prop.shape === "light-cone" && beam ? (
              <StageLightBeam width={width} beam={{ ...beam, length: height }} beamId={el.id} />
            ) : (
              <>
                {beam && (
                  <div
                    className="pointer-events-none absolute left-0 overflow-visible"
                    style={{ top: beamOriginY, width, zIndex: 0 }}
                  >
                    <StageLightBeam width={width} beam={beam} beamId={el.id} />
                  </div>
                )}
                <StagePropIcon prop={prop} width={width} height={height} color={fillColor} />
              </>
            )}
            {showResizeHandles(el) && (
              <ResizeHandles onPointerDown={(e, handle) => onPointerDownResize(e, el, handle)} />
            )}
            </div>
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
