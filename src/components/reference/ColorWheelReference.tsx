"use client";

import { useState, type ReactNode } from "react";
import {
  analogousIndices,
  COLOR_WHEEL,
  complementaryIndex,
  segmentLabel,
  triadicIndices,
  WheelColor,
} from "@/lib/reference/colorWheel";
import { cn } from "@/lib/utils/cn";

const CX = 200;
const CY = 200;
const OUTER_R = 168;
const INNER_R = 72;
const SEGMENTS = COLOR_WHEEL.length;
const DEG = 360 / SEGMENTS;

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function segmentPath(index: number): string {
  const start = index * DEG;
  const end = start + DEG;
  const outerStart = polarToCartesian(CX, CY, OUTER_R, start);
  const outerEnd = polarToCartesian(CX, CY, OUTER_R, end);
  const innerEnd = polarToCartesian(CX, CY, INNER_R, end);
  const innerStart = polarToCartesian(CX, CY, INNER_R, start);
  const largeArc = DEG > 180 ? 1 : 0;
  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${OUTER_R} ${OUTER_R} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${INNER_R} ${INNER_R} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
    "Z",
  ].join(" ");
}

function labelPosition(index: number) {
  const mid = index * DEG + DEG / 2;
  return polarToCartesian(CX, CY, (OUTER_R + INNER_R) / 2, mid);
}

function Swatch({ color, className }: { color: WheelColor; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span
        className="h-3.5 w-3.5 shrink-0 rounded-full ring-1 ring-black/10"
        style={{ backgroundColor: color.hex }}
        aria-hidden
      />
      <span>{color.name}</span>
    </span>
  );
}

export function ColorWheelReference() {
  const [selected, setSelected] = useState(0);

  const complement = complementaryIndex(selected);
  const [analogLeft, analogRight] = analogousIndices(selected);
  const triad = triadicIndices(selected);

  const selectedColor = COLOR_WHEEL[selected];

  return (
    <div className="mt-4 space-y-5">
      <div className="mx-auto max-w-md">
        <svg
          viewBox="0 0 400 400"
          className="w-full touch-manipulation select-none"
          role="img"
          aria-label="Interactive RYB color wheel. Tap a segment to see complementary, analogous, and triadic relationships."
        >
          {COLOR_WHEEL.map((color, i) => {
            const isSelected = i === selected;
            const isComplement = i === complement;
            const isAnalog = i === analogLeft || i === analogRight;
            const isTriad = triad.includes(i) && i !== selected;
            return (
              <g key={color.name}>
                <path
                  d={segmentPath(i)}
                  fill={color.hex}
                  stroke={isSelected ? "#0f172a" : isComplement ? "#ffffff" : "rgba(15,23,42,0.15)"}
                  strokeWidth={isSelected ? 3 : isComplement ? 2.5 : 1}
                  strokeDasharray={isComplement ? "6 4" : undefined}
                  className="cursor-pointer transition-opacity hover:opacity-95"
                  onClick={() => setSelected(i)}
                />
                {(isSelected || isComplement || isAnalog || isTriad) && (
                  <path
                    d={segmentPath(i)}
                    fill="none"
                    stroke="#0f172a"
                    strokeWidth={isSelected ? 0 : 2}
                    strokeOpacity={isComplement ? 0.5 : 0.25}
                    pointerEvents="none"
                  />
                )}
              </g>
            );
          })}

          {/* Complementary axis line */}
          <line
            x1={polarToCartesian(CX, CY, INNER_R - 4, selected * DEG + DEG / 2).x}
            y1={polarToCartesian(CX, CY, INNER_R - 4, selected * DEG + DEG / 2).y}
            x2={polarToCartesian(CX, CY, INNER_R - 4, complement * DEG + DEG / 2).x}
            y2={polarToCartesian(CX, CY, INNER_R - 4, complement * DEG + DEG / 2).y}
            stroke="#0f172a"
            strokeWidth={1.5}
            strokeOpacity={0.35}
            strokeDasharray="4 3"
            pointerEvents="none"
          />

          {COLOR_WHEEL.map((color, i) => {
            const pos = labelPosition(i);
            const short =
              color.name.length > 10
                ? color.name.replace("-", "-\n")
                : color.name.replace("-", "-");
            return (
              <text
                key={`label-${color.name}`}
                x={pos.x}
                y={pos.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="pointer-events-none fill-slate-900 text-[9px] font-semibold"
                style={{ textShadow: "0 0 3px rgba(255,255,255,0.85)" }}
              >
                {short.split("\n").map((line, li) => (
                  <tspan key={li} x={pos.x} dy={li === 0 ? 0 : 10}>
                    {line}
                  </tspan>
                ))}
              </text>
            );
          })}

          <circle cx={CX} cy={CY} r={INNER_R - 6} fill="white" fillOpacity={0.92} />
          <text
            x={CX}
            y={CY - 6}
            textAnchor="middle"
            className="fill-slate-900 text-[13px] font-bold"
          >
            {selectedColor.name}
          </text>
          <text x={CX} y={CY + 12} textAnchor="middle" className="fill-slate-500 text-[10px]">
            {segmentLabel(selectedColor.tier)}
          </text>
        </svg>
        <p className="mt-2 text-center text-xs text-slate-500">
          Tap any segment — dashed border marks the complement across the wheel.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <SchemeCard
          title="Complementary"
          subtitle="Opposite — high contrast"
          description="Pop subjects against backgrounds; use sparingly so it doesn’t feel loud."
        >
          <Swatch color={COLOR_WHEEL[selected]} />
          <span className="text-slate-400">↔</span>
          <Swatch color={COLOR_WHEEL[complement]} />
        </SchemeCard>

        <SchemeCard
          title="Analogous"
          subtitle="Neighbors — harmony"
          description="Natural, cohesive grades; great for skin, sky, and environment in the same family."
        >
          <Swatch color={COLOR_WHEEL[analogLeft]} />
          <Swatch color={COLOR_WHEEL[selected]} />
          <Swatch color={COLOR_WHEEL[analogRight]} />
        </SchemeCard>

        <SchemeCard
          title="Triadic"
          subtitle="Evenly spaced — vibrant"
          description="Balanced energy; pick one dominant hue and use the others as accents."
        >
          {triad.map((i) => (
            <Swatch key={i} color={COLOR_WHEEL[i]} />
          ))}
        </SchemeCard>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
        <p className="font-semibold text-slate-800">On set & in the grade</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>
            <strong>Correction first</strong> — match white balance and exposure across clips, then
            grade toward your palette.
          </li>
          <li>
            <strong>Mood</strong> — warm gold for nostalgia, desaturated cool for tension; the wheel
            shows which hues support that direction.
          </li>
          <li>
            <strong>Focus</strong> — complementary wardrobe vs. background pulls the eye; analogous
            sets feel unified.
          </li>
        </ul>
      </div>

      {/* Screen-reader summary of current selection */}
      <p className="sr-only">
        Selected {selectedColor.name}. Complement {COLOR_WHEEL[complement].name}. Analogous{" "}
        {COLOR_WHEEL[analogLeft].name} and {COLOR_WHEEL[analogRight].name}. Triadic{" "}
        {triad.map((i) => COLOR_WHEEL[i].name).join(", ")}.
      </p>
    </div>
  );
}

function SchemeCard({
  title,
  subtitle,
  description,
  children,
}: {
  title: string;
  subtitle: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="text-[11px] font-medium text-sky-700">{subtitle}</p>
      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-700">
        {children}
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-slate-500">{description}</p>
    </div>
  );
}
