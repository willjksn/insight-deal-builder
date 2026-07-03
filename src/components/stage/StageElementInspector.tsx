"use client";

import { StageElement } from "@/lib/stage/types";
import {
  elementTypeLabel,
  resolveElementColor,
  STAGE_DEFAULT_COLORS,
} from "@/lib/stage/elementColor";
import { findStageProp } from "@/lib/stage/propCatalog";
import {
  beamValuesFromDefaults,
  StageBeamInspectorControls,
} from "@/components/stage/StageBeamInspectorControls";
import {
  defaultBeamForProp,
  defaultBeamForWindow,
  isBeamCapableProp,
  resolveLightBeam,
  resolveWindowSpill,
} from "@/lib/stage/lightBeam";

interface StageElementInspectorProps {
  element: StageElement;
  onPatch: (patch: Partial<StageElement>) => void;
}

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

export function StageElementInspector({ element, onPatch }: StageElementInspectorProps) {
  const typeLabel = elementTypeLabel(element);
  const color = resolveElementColor(element);
  const beamCapable = element.kind === "prop" && isBeamCapableProp(element.propId);

  const setColor = (hex: string) => onPatch({ color: hex });

  const resetColor = () => {
    if (element.kind === "prop") {
      const prop = findStageProp(element.propId);
      onPatch({ color: prop?.color });
      return;
    }
    const defaults: Partial<Record<StageElement["kind"], string>> = {
      room: STAGE_DEFAULT_COLORS.room,
      wall: STAGE_DEFAULT_COLORS.wall,
      doorway: STAGE_DEFAULT_COLORS.doorway,
      window: STAGE_DEFAULT_COLORS.window,
      arrow: STAGE_DEFAULT_COLORS.arrow,
      note: STAGE_DEFAULT_COLORS.noteHeader,
    };
    onPatch({ color: defaults[element.kind] });
  };

  const propBeam =
    element.kind === "prop"
      ? beamValuesFromDefaults(
          element,
          defaultBeamForProp(element.propId) ?? {},
          resolveLightBeam(element)
        )
      : null;

  const windowBeam =
    element.kind === "window"
      ? beamValuesFromDefaults(
          element,
          defaultBeamForWindow(element.width),
          resolveWindowSpill(element)
        )
      : null;

  return (
    <aside className="w-full shrink-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:w-56">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Selected</p>
      <p className="mt-0.5 text-sm font-medium text-slate-900">{typeLabel}</p>

      <div className="mt-4 space-y-4">
        <ColorField
          label={element.kind === "window" ? "Glass tint" : "Color"}
          value={color}
          onChange={setColor}
        />

        {element.kind === "prop" && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700" htmlFor="stage-prop-label">
              Label
            </label>
            <input
              id="stage-prop-label"
              type="text"
              value={element.label ?? ""}
              onChange={(e) => onPatch({ label: e.target.value })}
              placeholder={findStageProp(element.propId)?.name ?? "Equipment label"}
              className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
            />
            <p className="text-[10px] leading-snug text-slate-500">
              Shown on the diagram — e.g. &quot;Arri 650 PLUS · 3200K&quot;
            </p>
          </div>
        )}

        {beamCapable && element.kind === "prop" && propBeam && (
          <StageBeamInspectorControls
            enabled={propBeam.enabled}
            onEnabledChange={(v) => onPatch({ beamEnabled: v })}
            beamColor={propBeam.color}
            onBeamColorChange={(hex) => onPatch({ beamColor: hex })}
            spread={propBeam.spread}
            onSpreadChange={(v) => onPatch({ beamSpread: v })}
            length={propBeam.length}
            onLengthChange={(v) => onPatch({ beamLength: v })}
            opacity={propBeam.opacity}
            onOpacityChange={(v) => onPatch({ beamOpacity: v })}
            spreadLabel="Spread"
            spreadMin={8}
            spreadMax={120}
            lengthMin={40}
            lengthMax={420}
            hint="Rotate the light with the toolbar arrows — the beam follows."
          />
        )}

        {element.kind === "room" && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700" htmlFor="stage-room-label">
              Room name
            </label>
            <input
              id="stage-room-label"
              type="text"
              value={element.label ?? ""}
              onChange={(e) => onPatch({ label: e.target.value })}
              placeholder="Living room"
              className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
            />
          </div>
        )}

        {element.kind === "arrow" && (
          <p className="text-[10px] leading-snug text-slate-500">
            Use warm amber for light spill, or match your gel / CTB color.
          </p>
        )}

        {element.kind === "note" && (
          <p className="text-[10px] leading-snug text-slate-500">
            Color tints the note header bar.
          </p>
        )}

        {element.kind === "wall" && (
          <p className="text-[10px] leading-snug text-slate-500">
            Color applies to the wall stroke.
          </p>
        )}

        {element.kind === "doorway" && (
          <p className="text-[10px] leading-snug text-slate-500">
            Color tints the doorway fill.
          </p>
        )}

        {element.kind === "window" && windowBeam && (
          <>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700" htmlFor="stage-window-label">
                Label
              </label>
              <input
                id="stage-window-label"
                type="text"
                value={element.label ?? ""}
                onChange={(e) => onPatch({ label: e.target.value })}
                placeholder="Daylight · 5600K"
                className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
              />
            </div>
            <StageBeamInspectorControls
              enabled={windowBeam.enabled}
              onEnabledChange={(v) => onPatch({ beamEnabled: v })}
              beamColor={windowBeam.color}
              onBeamColorChange={(hex) => onPatch({ beamColor: hex })}
              spread={windowBeam.spread}
              onSpreadChange={(v) => onPatch({ beamSpread: v })}
              length={windowBeam.length}
              onLengthChange={(v) => onPatch({ beamLength: v })}
              opacity={windowBeam.opacity}
              onOpacityChange={(v) => onPatch({ beamOpacity: v })}
              spreadLabel="Spread width %"
              spreadMin={20}
              spreadMax={100}
              lengthMin={24}
              lengthMax={280}
              hint="Daylight spill extends into the room from the bottom of the window. Match color to sun angle or gel."
            />
          </>
        )}
      </div>

      <button
        type="button"
        className="mt-4 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
        onClick={resetColor}
      >
        Reset color
      </button>
    </aside>
  );
}
