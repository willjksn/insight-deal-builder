"use client";

import { lightBeamPolygon, LightBeamConfig } from "@/lib/stage/lightBeam";

export function StageLightBeam({
  width,
  beam,
  beamId,
}: {
  width: number;
  beam: LightBeamConfig;
  beamId: string;
}) {
  const length = Math.max(40, beam.length);
  const points = lightBeamPolygon(width, beam.spread, length);

  return (
    <svg
      className="pointer-events-none absolute left-0 overflow-visible"
      style={{ top: 0, width, height: length, zIndex: 0 }}
      aria-hidden
    >
      <defs>
        <linearGradient id={`beam-grad-${beamId}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={beam.color} stopOpacity={Math.min(1, beam.opacity + 0.12)} />
          <stop offset="55%" stopColor={beam.color} stopOpacity={beam.opacity * 0.65} />
          <stop offset="100%" stopColor={beam.color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon
        points={points}
        fill={`url(#beam-grad-${beamId})`}
        stroke={beam.color}
        strokeWidth={0.75}
        strokeOpacity={beam.opacity * 0.35}
      />
      <line
        x1={width / 2}
        y1={0}
        x2={width / 2}
        y2={length}
        stroke={beam.color}
        strokeWidth={0.5}
        strokeOpacity={beam.opacity * 0.25}
        strokeDasharray="4 6"
      />
    </svg>
  );
}
