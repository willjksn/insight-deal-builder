import { ProductionDayShot } from "@/lib/production/types";

/** Scene is captured when every shot tagged with that scene is checked off. */
export function isSceneCaptured(sceneRef: string, shots: ProductionDayShot[]): boolean {
  const sceneShots = shots.filter((s) => s.sceneRef === sceneRef);
  if (sceneShots.length === 0) return false;
  return sceneShots.every((s) => s.done);
}

export function sceneCaptureSummary(
  sceneRef: string,
  shots: ProductionDayShot[]
): { done: number; total: number } {
  const sceneShots = shots.filter((s) => s.sceneRef === sceneRef);
  return {
    done: sceneShots.filter((s) => s.done).length,
    total: sceneShots.length,
  };
}
