"use client";

import { StagePropDefinition } from "@/lib/stage/types";
import { renderStagePropShape } from "@/components/stage/stagePropShapes";

export function StagePropIcon({
  prop,
  width: widthOverride,
  height: heightOverride,
  scale = 1,
}: {
  prop: StagePropDefinition;
  width?: number;
  height?: number;
  scale?: number;
}) {
  const w = widthOverride ?? prop.width * scale;
  const h = heightOverride ?? prop.height * scale;

  return renderStagePropShape(prop, w, h);
}
