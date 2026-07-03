"use client";

import { BEAM_COLOR_PRESETS, LightBeamConfig } from "@/lib/stage/lightBeam";

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (hex: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <span className="text-xs font-medium text-slate-700">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-12 cursor-pointer rounded-lg border border-slate-200 bg-white p-0.5"
          title="Pick color"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => {
            const v = e.target.value.trim();
            if (/^#[0-9A-Fa-f]{6}$/.test(v)) onChange(v);
          }}
          placeholder="#000000"
          className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 font-mono text-xs text-slate-800 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
        />
      </div>
    </div>
  );
}

export function StageBeamInspectorControls({
  enabled,
  onEnabledChange,
  beamColor,
  onBeamColorChange,
  spread,
  onSpreadChange,
  length,
  onLengthChange,
  opacity,
  onOpacityChange,
  spreadLabel,
  spreadMin,
  spreadMax,
  lengthMin,
  lengthMax,
  hint,
}: {
  enabled: boolean;
  onEnabledChange: (value: boolean) => void;
  beamColor: string;
  onBeamColorChange: (hex: string) => void;
  spread: number;
  onSpreadChange: (value: number) => void;
  length: number;
  onLengthChange: (value: number) => void;
  opacity: number;
  onOpacityChange: (value: number) => void;
  spreadLabel: string;
  spreadMin: number;
  spreadMax: number;
  lengthMin: number;
  lengthMax: number;
  hint: string;
}) {
  return (
    <div className="space-y-3 border-t border-slate-100 pt-3">
      <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onEnabledChange(e.target.checked)}
          className="h-3.5 w-3.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
        />
        Show light spill
      </label>

      {enabled && (
        <>
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-slate-700">Color temp / gel</span>
            <div className="flex flex-wrap gap-1">
              {BEAM_COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  title={preset.hint}
                  className="rounded-md border border-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-700 hover:border-sky-300 hover:bg-sky-50"
                  style={{ borderLeftWidth: 3, borderLeftColor: preset.color }}
                  onClick={() => onBeamColorChange(preset.color)}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
          <ColorField label="Spill color" value={beamColor} onChange={onBeamColorChange} />
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700" htmlFor="beam-spread-inspector">
              {spreadLabel} — {Math.round(spread)}
              {spreadLabel.includes("%") ? "" : "°"}
            </label>
            <input
              id="beam-spread-inspector"
              type="range"
              min={spreadMin}
              max={spreadMax}
              step={1}
              value={spread}
              onChange={(e) => onSpreadChange(Number(e.target.value))}
              className="w-full accent-amber-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700" htmlFor="beam-length-inspector">
              Reach — {Math.round(length)} px
            </label>
            <input
              id="beam-length-inspector"
              type="range"
              min={lengthMin}
              max={lengthMax}
              step={4}
              value={length}
              onChange={(e) => onLengthChange(Number(e.target.value))}
              className="w-full accent-amber-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700" htmlFor="beam-opacity-inspector">
              Intensity — {Math.round(opacity * 100)}%
            </label>
            <input
              id="beam-opacity-inspector"
              type="range"
              min={0.1}
              max={0.85}
              step={0.05}
              value={opacity}
              onChange={(e) => onOpacityChange(Number(e.target.value))}
              className="w-full accent-amber-500"
            />
          </div>
          <p className="text-[10px] leading-snug text-slate-500">{hint}</p>
        </>
      )}
    </div>
  );
}

export function beamValuesFromDefaults(
  element: {
    beamEnabled?: boolean;
    beamColor?: string;
    beamSpread?: number;
    beamLength?: number;
    beamOpacity?: number;
    color?: string;
  },
  defaults: Partial<LightBeamConfig>,
  resolved: LightBeamConfig | null
) {
  return {
    enabled: element.beamEnabled ?? defaults.enabled ?? true,
    color: element.beamColor ?? element.color ?? resolved?.color ?? defaults.color ?? "#fde68a",
    spread: element.beamSpread ?? defaults.spread ?? 45,
    length: element.beamLength ?? defaults.length ?? 160,
    opacity: element.beamOpacity ?? defaults.opacity ?? 0.4,
  };
}
