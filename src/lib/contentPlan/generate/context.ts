import { contentStyleGuide } from "@/lib/contentPlan/styleGuide";
import type {
  ContentPlan,
  ContentPlanInputs,
  CreativeBrief,
  StoryBeat,
} from "@/lib/contentPlan/types";

export function inputsContextBlock(inputs: ContentPlanInputs): string {
  return JSON.stringify(
    {
      contentStyle: inputs.contentStyle,
      styleGuide: contentStyleGuide(inputs.contentStyle),
      idea: inputs.idea,
      durationSeconds: inputs.durationSeconds,
      durationPreset: inputs.durationPreset,
      customDurationLabel: inputs.customDurationLabel,
      platform: inputs.platform,
      orientation: inputs.orientation,
      energy: inputs.energy,
      customEnergy: inputs.customEnergy,
      dialogueMode: inputs.dialogueMode,
      customDialogue: inputs.customDialogue,
      cta: inputs.cta,
      customCta: inputs.customCta,
      brand: inputs.brand,
      product: inputs.product,
      creatorName: inputs.creatorName,
      creatorId: inputs.creatorId || null,
      creatorCatalogNotes: inputs.creatorCatalogNotes,
      location: inputs.location,
      locationId: inputs.locationId || null,
      locationCatalogNotes: inputs.locationCatalogNotes,
      wardrobe: inputs.wardrobe,
      existingScript: inputs.existingScript,
      talkingPoints: inputs.talkingPoints,
      requiredPhrases: inputs.requiredPhrases,
      avoid: inputs.avoid,
      equipmentAvailable: inputs.equipmentAvailable,
      camerasAvailable: inputs.camerasAvailable,
      lensesAvailable: inputs.lensesAvailable,
      lightingAvailable: inputs.lightingAvailable,
      useAvailableGearOnly: inputs.useAvailableGearOnly,
      teachMe: inputs.teachMe,
    },
    null,
    2
  );
}

export function briefContext(brief: CreativeBrief | null | undefined): string {
  if (!brief) return "";
  return JSON.stringify(brief, null, 2);
}

export function beatsContext(beats: StoryBeat[]): string {
  if (!beats.length) return "";
  return JSON.stringify(beats, null, 2);
}

export function planSummaryForShots(plan: Pick<ContentPlan, "creativeBrief" | "beats" | "scriptLines" | "inputs">): string {
  return JSON.stringify(
    {
      inputs: {
        contentStyle: plan.inputs.contentStyle,
        durationSeconds: plan.inputs.durationSeconds,
        platform: plan.inputs.platform,
        orientation: plan.inputs.orientation,
        dialogueMode: plan.inputs.dialogueMode,
        useAvailableGearOnly: plan.inputs.useAvailableGearOnly,
        camerasAvailable: plan.inputs.camerasAvailable,
        lensesAvailable: plan.inputs.lensesAvailable,
        lightingAvailable: plan.inputs.lightingAvailable,
        equipmentAvailable: plan.inputs.equipmentAvailable,
        product: plan.inputs.product,
        brand: plan.inputs.brand,
        creatorName: plan.inputs.creatorName,
        creatorCatalogNotes: plan.inputs.creatorCatalogNotes,
        location: plan.inputs.location,
        locationCatalogNotes: plan.inputs.locationCatalogNotes,
        teachMe: plan.inputs.teachMe,
      },
      creativeBrief: plan.creativeBrief,
      beats: plan.beats,
      scriptLines: plan.scriptLines,
    },
    null,
    2
  );
}
