import { findStageProp } from "@/lib/stage/propCatalog";
import { StageElement, StagePropElement } from "@/lib/stage/types";

export const STAGE_DEFAULT_COLORS = {
  room: "#f8fafc",
  roomBorder: "#64748b",
  wall: "#475569",
  doorway: "#fef3c7",
  doorwayStroke: "#b45309",
  window: "#bae6fd",
  windowStroke: "#0284c7",
  arrow: "#fbbf24",
  noteHeader: "#334155",
} as const;

export function resolvePropColor(el: StagePropElement): string {
  if (el.color) return el.color;
  const prop = findStageProp(el.propId);
  return prop?.color ?? "#94a3b8";
}

export function resolveElementColor(el: StageElement): string {
  switch (el.kind) {
    case "prop":
      return resolvePropColor(el);
    case "room":
      return el.color ?? STAGE_DEFAULT_COLORS.room;
    case "wall":
      return el.color ?? STAGE_DEFAULT_COLORS.wall;
    case "doorway":
      return el.color ?? STAGE_DEFAULT_COLORS.doorway;
    case "window":
      return el.color ?? STAGE_DEFAULT_COLORS.window;
    case "arrow":
      return el.color ?? STAGE_DEFAULT_COLORS.arrow;
    case "note":
      return el.color ?? STAGE_DEFAULT_COLORS.noteHeader;
    default:
      return "#64748b";
  }
}

export function elementTypeLabel(el: StageElement): string {
  switch (el.kind) {
    case "prop": {
      const prop = findStageProp(el.propId);
      return prop?.name ?? "Prop";
    }
    case "room":
      return "Room";
    case "wall":
      return "Wall";
    case "doorway":
      return "Doorway";
    case "window":
      return "Window";
    case "arrow":
      return "Light direction";
    case "note":
      return "Note";
    default:
      return "Element";
  }
}

/** Pill badge background for prop labels (reference-style diagram). */
export function labelBadgeColor(category: string | undefined, fillColor: string): string {
  switch (category) {
    case "lighting":
      return "#2563eb";
    case "camera":
      return "#db2777";
    case "subject":
      return "#059669";
    case "furniture":
      return "#92400e";
    case "set":
      return "#64748b";
    default:
      return fillColor;
  }
}
