import { findStageProp } from "@/lib/stage/propCatalog";
import { STAGE_DEFAULT_COLORS } from "@/lib/stage/elementColor";
import { StagePropElement, StageWindowElement } from "@/lib/stage/types";

export type LightBeamConfig = {
  enabled: boolean;
  color: string;
  spread: number;
  length: number;
  opacity: number;
};

const DEFAULT_BEAM_COLOR = "#fde68a";

export function isBeamCapableProp(propId: string): boolean {
  const prop = findStageProp(propId);
  if (!prop) return false;
  return prop.category === "lighting" || prop.shape === "light-cone";
}

export function defaultBeamForProp(propId: string): Partial<LightBeamConfig> {
  const prop = findStageProp(propId);
  if (!prop) return { enabled: true, spread: 45, length: 160, opacity: 0.42 };

  if (prop.shape === "light-cone") {
    return { enabled: true, spread: 52, length: prop.height, opacity: 0.45, color: prop.color };
  }

  const narrow = prop.shape === "fresnel" || prop.shape === "snoot";
  const wide = prop.shape === "softbox" || prop.shape === "octabox" || prop.shape === "umbrella";
  return {
    enabled: true,
    spread: narrow ? 22 : wide ? 58 : 40,
    length: Math.max(prop.width, prop.height) * 2.8,
    opacity: 0.4,
    color: prop.color ?? DEFAULT_BEAM_COLOR,
  };
}

export function resolveLightBeam(el: StagePropElement): LightBeamConfig | null {
  const prop = findStageProp(el.propId);
  if (!prop || !isBeamCapableProp(el.propId)) return null;

  const defaults = defaultBeamForProp(el.propId);
  const enabled = el.beamEnabled ?? defaults.enabled ?? false;
  if (!enabled) return null;

  return {
    enabled: true,
    color: el.beamColor ?? el.color ?? defaults.color ?? DEFAULT_BEAM_COLOR,
    spread: el.beamSpread ?? defaults.spread ?? 45,
    length: el.beamLength ?? defaults.length ?? 160,
    opacity: el.beamOpacity ?? defaults.opacity ?? 0.4,
  };
}

/** Cone polygon in local space — apex at top center, beam extends downward (+Y). */
export function lightBeamPolygon(width: number, spreadDeg: number, length: number): string {
  const halfSpreadRad = ((spreadDeg / 2) * Math.PI) / 180;
  const halfWidth = Math.max(8, length * Math.tan(halfSpreadRad));
  const apexX = width / 2;
  return `${apexX},0 ${apexX - halfWidth},${length} ${apexX + halfWidth},${length}`;
}

export function defaultBeamForWindow(width: number): Partial<LightBeamConfig> {
  return {
    enabled: true,
    spread: 56,
    length: Math.min(120, Math.max(40, width * 0.75)),
    opacity: 0.45,
    color: STAGE_DEFAULT_COLORS.window,
  };
}

export function resolveWindowSpill(el: StageWindowElement): LightBeamConfig | null {
  const defaults = defaultBeamForWindow(el.width);
  const enabled = el.beamEnabled ?? defaults.enabled ?? true;
  if (!enabled) return null;

  return {
    enabled: true,
    color: el.beamColor ?? el.color ?? defaults.color ?? STAGE_DEFAULT_COLORS.window,
    spread: el.beamSpread ?? defaults.spread ?? 56,
    length: el.beamLength ?? defaults.length ?? 72,
    opacity: el.beamOpacity ?? defaults.opacity ?? 0.45,
  };
}

/** Daylight trapezoid — spill extends downward from bottom of window frame. */
export function windowSpillPolygon(
  width: number,
  windowHeight: number,
  length: number,
  spreadPercent: number
): string {
  const halfSpread = (width * spreadPercent) / 200;
  const cx = width / 2;
  return `${2},${windowHeight} ${width - 2},${windowHeight} ${Math.min(width - 2, cx + halfSpread)},${windowHeight + length} ${Math.max(2, cx - halfSpread)},${windowHeight + length}`;
}

export const BEAM_COLOR_PRESETS = [
  { label: "5600K", color: "#bae6fd", hint: "Daylight" },
  { label: "4500K", color: "#dbeafe", hint: "Neutral" },
  { label: "3200K", color: "#fde68a", hint: "Tungsten" },
  { label: "CTO", color: "#fdba74", hint: "Warm" },
  { label: "CTB", color: "#7dd3fc", hint: "Cool" },
] as const;
