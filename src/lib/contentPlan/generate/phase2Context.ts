import type { ContentPlan, ContentShot } from "@/lib/contentPlan/types";

export function slimShotsForPost(shots: ContentShot[]) {
  return shots.slice(0, 10).map((s) => ({
    id: s.id,
    shotNumber: s.shotNumber,
    shotName: s.shotName,
    startTime: s.startTime,
    endTime: s.endTime,
    shotSize: s.shotSize,
    movement: s.movement,
    visualDescription: (s.visualDescription || "").slice(0, 140),
    cutTrigger: s.cutTrigger,
    transitionOut: s.transitionOut,
    productionAudio: s.productionAudio,
    foley: s.foley,
    soundEffects: s.soundEffects,
    musicCue: s.musicCue,
    lightingIntent: s.lightingIntent,
    colorLook: s.colorLook,
  }));
}

export function phase2PlanContext(
  plan: Pick<
    ContentPlan,
    "inputs" | "creativeBrief" | "beats" | "shots" | "scriptLines"
  >
): string {
  return JSON.stringify({
    style: plan.inputs.contentStyle,
    durationSeconds: plan.inputs.durationSeconds,
    platform: plan.inputs.platform,
    energy: plan.inputs.energy,
    teachMe: plan.inputs.teachMe,
    location: plan.inputs.location,
    product: plan.inputs.product,
    brand: plan.inputs.brand,
    camerasAvailable: plan.inputs.camerasAvailable,
    lensesAvailable: plan.inputs.lensesAvailable,
    lightingAvailable: plan.inputs.lightingAvailable,
    useAvailableGearOnly: plan.inputs.useAvailableGearOnly,
    title: plan.creativeBrief?.workingTitle,
    hook: plan.creativeBrief?.hook,
    editingPhilosophy: plan.creativeBrief?.editingPhilosophy,
    soundPhilosophy: plan.creativeBrief?.soundPhilosophy,
    visualStyle: plan.creativeBrief?.visualStyle,
    cameraPhilosophy: plan.creativeBrief?.cameraPhilosophy,
    beats: (plan.beats || []).slice(0, 10).map((b) => ({
      startTime: b.startTime,
      endTime: b.endTime,
      label: b.label,
    })),
    shots: slimShotsForPost(plan.shots || []),
  });
}
