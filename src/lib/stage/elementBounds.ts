import { findStageProp } from "@/lib/stage/propCatalog";
import { StageElement, StagePropElement } from "@/lib/stage/types";

export function getPropDisplaySize(
  el: StagePropElement,
  propWidth: number,
  propHeight: number
): { width: number; height: number } {
  const scale = el.scale ?? 1;
  return {
    width: el.width ?? Math.round(propWidth * scale),
    height: el.height ?? Math.round(propHeight * scale),
  };
}

export type ElementBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function getElementBounds(el: StageElement): ElementBounds | null {
  if (el.kind === "note" || el.kind === "room" || el.kind === "doorway") {
    return { x: el.x, y: el.y, width: el.width, height: el.height };
  }

  if (el.kind === "prop") {
    const prop = findStageProp(el.propId);
    if (!prop) return null;
    const { width, height } = getPropDisplaySize(el, prop.width, prop.height);
    return { x: el.x, y: el.y, width, height };
  }

  if (el.kind === "wall") {
    const minX = Math.min(el.x, el.x2);
    const minY = Math.min(el.y, el.y2);
    const maxX = Math.max(el.x, el.x2);
    const maxY = Math.max(el.y, el.y2);
    const pad = el.thickness / 2;
    return {
      x: minX - pad,
      y: minY - pad,
      width: Math.max(maxX - minX, el.thickness) + pad * 2,
      height: Math.max(maxY - minY, el.thickness) + pad * 2,
    };
  }

  if (el.kind === "arrow") {
    const minX = Math.min(el.x, el.x2);
    const minY = Math.min(el.y, el.y2);
    return {
      x: minX - 8,
      y: minY - 8,
      width: Math.max(Math.abs(el.x2 - el.x), 16) + 16,
      height: Math.max(Math.abs(el.y2 - el.y), 16) + 16,
    };
  }

  return null;
}

export type ResizeHandle = "nw" | "ne" | "sw" | "se";

export function applyCornerResize(
  handle: ResizeHandle,
  orig: ElementBounds,
  dx: number,
  dy: number,
  minSize = 16
): ElementBounds {
  let { x, y, width, height } = orig;

  if (handle === "se") {
    width = Math.max(minSize, orig.width + dx);
    height = Math.max(minSize, orig.height + dy);
  } else if (handle === "sw") {
    const nextWidth = Math.max(minSize, orig.width - dx);
    x = orig.x + (orig.width - nextWidth);
    width = nextWidth;
    height = Math.max(minSize, orig.height + dy);
  } else if (handle === "ne") {
    width = Math.max(minSize, orig.width + dx);
    const nextHeight = Math.max(minSize, orig.height - dy);
    y = orig.y + (orig.height - nextHeight);
    height = nextHeight;
  } else {
    const nextWidth = Math.max(minSize, orig.width - dx);
    const nextHeight = Math.max(minSize, orig.height - dy);
    x = orig.x + (orig.width - nextWidth);
    y = orig.y + (orig.height - nextHeight);
    width = nextWidth;
    height = nextHeight;
  }

  return { x, y, width, height };
}

export function rotateDelta(dx: number, dy: number, degrees: number): { dx: number; dy: number } {
  const rad = (degrees * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    dx: dx * cos + dy * sin,
    dy: -dx * sin + dy * cos,
  };
}
