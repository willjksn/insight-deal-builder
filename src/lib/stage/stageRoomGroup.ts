import { captureDragOrigin, getElementBounds } from "@/lib/stage/elementBounds";
import { StageElement, StageRoomElement } from "@/lib/stage/types";

export type ElementDragOrigin = {
  x: number;
  y: number;
  x2?: number;
  y2?: number;
};

export { captureDragOrigin };

export function elementCenter(el: StageElement): { x: number; y: number } | null {
  const bounds = getElementBounds(el);
  if (!bounds) return null;
  return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
}

/** True when the element's center lies inside the room bounds. */
export function isElementInsideRoom(el: StageElement, room: StageRoomElement): boolean {
  if (el.kind === "room" || el.id === room.id) return false;
  const center = elementCenter(el);
  if (!center) return false;
  return (
    center.x >= room.x &&
    center.x <= room.x + room.width &&
    center.y >= room.y &&
    center.y <= room.y + room.height
  );
}

export function elementsInsideRoom(room: StageRoomElement, elements: StageElement[]): StageElement[] {
  return elements.filter((el) => isElementInsideRoom(el, room));
}

export function groupedDragOrigins(
  room: StageRoomElement,
  elements: StageElement[]
): Record<string, ElementDragOrigin> | undefined {
  if (!room.lockContents) return undefined;
  const origins: Record<string, ElementDragOrigin> = {};
  for (const el of elementsInsideRoom(room, elements)) {
    origins[el.id] = captureDragOrigin(el);
  }
  return Object.keys(origins).length ? origins : undefined;
}

export function applyDragDelta(
  el: StageElement,
  origin: ElementDragOrigin,
  dx: number,
  dy: number
): StageElement {
  if (el.kind === "wall" || el.kind === "arrow") {
    return {
      ...el,
      x: origin.x + dx,
      y: origin.y + dy,
      x2: (origin.x2 ?? el.x2) + dx,
      y2: (origin.y2 ?? el.y2) + dy,
    };
  }
  return { ...el, x: origin.x + dx, y: origin.y + dy };
}
