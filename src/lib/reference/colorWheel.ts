/** RYB-style 12-segment color wheel for on-set reference. */

export type WheelColor = {
  name: string;
  hex: string;
  /** primary | secondary | tertiary */
  tier: "primary" | "secondary" | "tertiary";
};

export const COLOR_WHEEL: WheelColor[] = [
  { name: "Red", hex: "#E53935", tier: "primary" },
  { name: "Red-orange", hex: "#F4511E", tier: "tertiary" },
  { name: "Orange", hex: "#FB8C00", tier: "secondary" },
  { name: "Yellow-orange", hex: "#FDD835", tier: "tertiary" },
  { name: "Yellow", hex: "#FFEB3B", tier: "primary" },
  { name: "Yellow-green", hex: "#C0CA33", tier: "tertiary" },
  { name: "Green", hex: "#43A047", tier: "secondary" },
  { name: "Blue-green", hex: "#00897B", tier: "tertiary" },
  { name: "Blue", hex: "#1E88E5", tier: "primary" },
  { name: "Blue-violet", hex: "#5E35B1", tier: "tertiary" },
  { name: "Violet", hex: "#8E24AA", tier: "secondary" },
  { name: "Red-violet", hex: "#D81B60", tier: "tertiary" },
];

export const WHEEL_SEGMENT_COUNT = COLOR_WHEEL.length;

export function wrapIndex(index: number): number {
  return ((index % WHEEL_SEGMENT_COUNT) + WHEEL_SEGMENT_COUNT) % WHEEL_SEGMENT_COUNT;
}

/** Color directly opposite on the wheel (complementary). */
export function complementaryIndex(index: number): number {
  return wrapIndex(index + WHEEL_SEGMENT_COUNT / 2);
}

/** Neighbors on either side (analogous). */
export function analogousIndices(index: number): [number, number] {
  return [wrapIndex(index - 1), wrapIndex(index + 1)];
}

/** Three colors evenly spaced 120° apart (triadic). */
export function triadicIndices(index: number): [number, number, number] {
  const step = WHEEL_SEGMENT_COUNT / 3;
  return [index, wrapIndex(index + step), wrapIndex(index + step * 2)];
}

export function segmentLabel(tier: WheelColor["tier"]): string {
  if (tier === "primary") return "Primary";
  if (tier === "secondary") return "Secondary";
  return "Tertiary";
}
