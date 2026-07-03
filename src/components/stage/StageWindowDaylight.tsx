"use client";

import { windowSpillPolygon, LightBeamConfig } from "@/lib/stage/lightBeam";
import { STAGE_DEFAULT_COLORS } from "@/lib/stage/elementColor";

export function StageWindowDaylight({
  width,
  height,
  spill,
  windowId,
  glassColor,
  strokeColor,
}: {
  width: number;
  height: number;
  spill: LightBeamConfig | null;
  windowId: string;
  glassColor: string;
  strokeColor: string;
}) {
  const fill = spill?.color ?? glassColor;
  const spillLength = spill?.length ?? Math.min(72, Math.max(24, width * 0.6));
  const spillOpacity = spill?.opacity ?? 0.45;
  const spread = spill?.spread ?? 56;
  const totalH = height + (spill ? spillLength : 0);

  return (
    <svg
      width={width}
      height={totalH}
      viewBox={`0 0 ${width} ${totalH}`}
      className="pointer-events-none overflow-visible"
      aria-hidden
    >
      <defs>
        <linearGradient id={`window-spill-${windowId}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fill} stopOpacity={Math.min(1, spillOpacity + 0.1)} />
          <stop offset="55%" stopColor={fill} stopOpacity={spillOpacity * 0.7} />
          <stop offset="100%" stopColor={fill} stopOpacity={0} />
        </linearGradient>
      </defs>
      {spill && (
        <>
          <polygon
            points={windowSpillPolygon(width, height, spillLength, spread)}
            fill={`url(#window-spill-${windowId})`}
          />
          <line
            x1={width / 2}
            y1={height}
            x2={width / 2}
            y2={height + spillLength}
            stroke={fill}
            strokeWidth={0.5}
            strokeOpacity={spillOpacity * 0.35}
            strokeDasharray="3 5"
          />
        </>
      )}
      <rect
        x={1}
        y={1}
        width={width - 2}
        height={height - 2}
        fill={glassColor}
        stroke={strokeColor}
        strokeWidth={2}
      />
      <line
        x1={width / 2}
        y1={2}
        x2={width / 2}
        y2={height - 2}
        stroke={strokeColor}
        strokeWidth={1}
        opacity={0.65}
      />
      <line
        x1={2}
        y1={height / 2}
        x2={width - 2}
        y2={height / 2}
        stroke={strokeColor}
        strokeWidth={1}
        opacity={0.65}
      />
    </svg>
  );
}

export function defaultWindowGlassColor(): string {
  return STAGE_DEFAULT_COLORS.window;
}
