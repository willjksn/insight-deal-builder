import { ScoutProject, ScoutProjectImage, ScoutGearProfile, ScoutGearList } from "@/lib/scout/types";
import {
  buildGearInventory,
  buildGearInventoryBlock,
  GEAR_CONSTRAINT_INSTRUCTIONS,
} from "@/lib/scout/gearContext";
import {
  CINESCOUT_ON_SET_WORKFLOW,
  CINESCOUT_SCORING_CRITERIA,
  CINESCOUT_SYSTEM_PROMPT,
  DP_PLAN_JSON_SCHEMA,
  LOCATION_ANALYSIS_JSON_SCHEMA,
  PREVIEW_JSON_SCHEMA,
  SHOT_LIST_JSON_SCHEMA,
} from "@/lib/scout/prompts/cineScoutSystem";

export function buildSceneContext(
  project: ScoutProject,
  gearProfile?: ScoutGearProfile | null,
  gearList?: ScoutGearList | null
): string {
  const inventory = buildGearInventory(project, gearProfile, gearList);
  const lines = [
    `Session: ${project.projectName}`,
    `Scene type: ${project.sceneType}`,
    `Scene idea: ${project.sceneIdea}`,
    `Mood: ${project.mood}`,
    `Theme: ${project.theme}`,
    `Platform: ${project.platform}`,
    `Aspect ratio: ${project.aspectRatio}`,
    `Skill level: ${project.skillLevel}`,
    `Preferred look: ${project.preferredLook}`,
    "",
    buildGearInventoryBlock(inventory),
    "",
    `Session gear selections (may be a subset of the kit above):`,
    `  Camera body: ${project.cameraBody ?? "not selected yet"}`,
    `  Lens: ${project.lensOptions ?? "not selected yet"}`,
    `  Lights: ${project.lightingGear ?? "not selected yet"}`,
    `  Audio: ${project.audioGear ?? "not selected yet"}`,
    `  Stabilization: ${project.stabilizationGear ?? "not selected yet"}`,
  ];
  if (project.linkedProjectName) {
    lines.push(`Linked production project: ${project.linkedProjectName}`);
  }
  if (project.creativeBrief) {
    const brief = project.creativeBrief;
    if (brief.subjectAction) lines.push(`Subject action: ${brief.subjectAction}`);
    if (brief.peopleCount != null) lines.push(`People count: ${brief.peopleCount}`);
    if (brief.subjectPose) lines.push(`Subject pose: ${brief.subjectPose}`);
    if (brief.cameraMovement) lines.push(`Camera movement intent: ${brief.cameraMovement}`);
    if (brief.avoidHeavyGrading) lines.push("Avoid heavy grading: yes");
  }
  if (project.sceneLightNotes?.trim()) {
    lines.push(`Scene lighting notes: ${project.sceneLightNotes.trim()}`);
  }
  return lines.join("\n");
}

export function buildImageManifest(images: ScoutProjectImage[]): string {
  return images
    .map(
      (img, i) =>
        `Photo ${i + 1} — imageId: "${img.id}", label: "${img.label}" (attached below in the same order)`
    )
    .join("\n");
}

export function buildLocationAnalysisUserPrompt(
  project: ScoutProject,
  images: ScoutProjectImage[],
  gearProfile?: ScoutGearProfile | null,
  gearList?: ScoutGearList | null
): string {
  const mode =
    project.skillLevel === "beginner"
      ? "Beginner Mode — explain recommendations in plain language in strengths/weaknesses."
      : project.skillLevel === "pro"
        ? "Pro Mode — include technical depth in analysis fields."
        : "Intermediate Mode — balance clarity and technique.";

  return `${mode}

Scene context:
${buildSceneContext(project, gearProfile, gearList)}

Uploaded location photos (${images.length} attached — analyze what you SEE in each image; use exact imageId values):
${buildImageManifest(images)}

Look at walls, windows, ceiling height, depth, clutter, practicals, background, subject placement options, and natural light direction in each photo.

Score each angle 0–100 using these criteria: ${CINESCOUT_SCORING_CRITERIA.join(", ")}.

${GEAR_CONSTRAINT_INSTRUCTIONS}
When scoring angles, consider how each angle works with the user's available camera and lighting gear for the scene idea above.

Return JSON only matching this schema:
${LOCATION_ANALYSIS_JSON_SCHEMA}

If subject action, people count, camera movement intent, or platform framing needs are unclear, add questions to missingQuestions.`;
}

export function buildDpPlanUserPrompt(
  project: ScoutProject,
  analysisJson: string,
  gearProfile?: ScoutGearProfile | null,
  gearList?: ScoutGearList | null
): string {
  const workflow = CINESCOUT_ON_SET_WORKFLOW.join(" → ");
  return `Skill level: ${project.skillLevel}

Scene context:
${buildSceneContext(project, gearProfile, gearList)}

Location analysis (already completed):
${analysisJson}

Build a complete DP plan a crew can execute on set.
Include onSetWorkflow as these 18 steps in order: ${workflow}

${GEAR_CONSTRAINT_INSTRUCTIONS}
In cameraSettings, set cameraBodyRecommendation and lensRecommendation to exact models from the available gear lists.
In lightingPlan, name exact lights from the available inventory for key, fill, hair, and practicals.

Return JSON only matching this schema:
${DP_PLAN_JSON_SCHEMA}`;
}

export function buildShotListUserPrompt(
  project: ScoutProject,
  dpPlanJson: string,
  gearProfile?: ScoutGearProfile | null,
  gearList?: ScoutGearList | null
): string {
  return `Scene context:
${buildSceneContext(project, gearProfile, gearList)}

DP plan:
${dpPlanJson}

Generate coverage including master, medium, close-up, inserts, reaction, movement, vertical social (if platform needs it), and BTS as appropriate.
${GEAR_CONSTRAINT_INSTRUCTIONS}
Each shot's camera field must be an exact camera body from available gear; lens must be from available lenses; lightingNotes must reference only available lights.

Return JSON only matching this schema:
${SHOT_LIST_JSON_SCHEMA}`;
}

export function buildPreviewUserPrompt(
  project: ScoutProject,
  dpPlanJson: string,
  gearProfile?: ScoutGearProfile | null,
  gearList?: ScoutGearList | null,
  bestImageUrl?: string
): string {
  return `Scene context:
${buildSceneContext(project, gearProfile, gearList)}

DP plan:
${dpPlanJson}

The attached location photo is the actual room/location to light. Your prompts must reflect the real layout, windows, depth, and background visible in that photo.

Generate previs prompts for lighting_diagram (required) and cinematic_frame at minimum.
The lighting_diagram prompt must describe a professional top-down bird's-eye lighting schematic — grayscale technical illustration style like a studio lighting plan — showing subject, camera, and each light with gear labels from the DP plan.

Return JSON only matching this schema:
${PREVIEW_JSON_SCHEMA}`;
}

export function buildLightingDiagramImagePromptRequest(
  project: ScoutProject,
  dpPlanJson: string,
  gearProfile?: ScoutGearProfile | null,
  gearList?: ScoutGearList | null
): string {
  const fixtureBlock = dpPlanJson.includes("fixtureAwareLighting")
    ? "Use exact fixture names and roles from fixtureAwareLighting.assignments in the DP plan."
    : "Use exact gear names from lightingPlan and scene context.";

  return `You are creating an image-generation prompt for a cinematography lighting diagram.

Scene context:
${buildSceneContext(project, gearProfile, gearList)}

DP plan (includes lighting assignments):
${dpPlanJson}

The attached photo is the REAL location the crew will shoot in. Study the room shape, windows, doors, depth, furniture, and background visible in the photo.

Write ONE detailed image-generation prompt (plain text, no JSON) for a professional top-down bird's-eye lighting diagram schematic. Style reference: clean grayscale technical illustration like a film studio lighting plan — subject icon from above, camera icon, softbox/octabox/striplight icons with text labels showing exact gear model names, window/backdrop positions matching THIS room layout.

Requirements:
- Match the room proportions and features visible in the uploaded photo (windows on correct wall, depth, subject/camera positions from the DP plan)
- Label each light with the actual fixture name from the DP plan (${fixtureBlock})
- Label camera with lens from cameraSettings
- Show key, fill, hair/rim, negative fill, and practicals as appropriate
- White or light gray background, black line art, readable text labels
- No photorealistic rendering — this is a technical diagram for the gaffer and DP

Return ONLY the image prompt text, nothing else.`;
}

export function buildCinematicFramePromptRequest(
  project: ScoutProject,
  dpPlanJson: string,
  shot?: { shotNumber: number; shotType: string; subjectAction: string; lens: string; cameraMovement: string; lightingNotes: string; shotName?: string },
  overallViewLabel?: string,
  gearProfile?: ScoutGearProfile | null,
  gearList?: ScoutGearList | null
): string {
  const shotBlock = shot
    ? `Target shot #${shot.shotNumber}${shot.shotName ? ` (${shot.shotName})` : ""}:
- Type: ${shot.shotType.replace(/_/g, " ")}
- Subject action: ${shot.subjectAction}
- Lens: ${shot.lens}
- Camera movement: ${shot.cameraMovement}
- Lighting notes: ${shot.lightingNotes}`
    : overallViewLabel
      ? `Overall scene coverage (not a single shot list row): ${overallViewLabel}. Show how the full location reads on set with DP lighting applied — establish space, blocking zones, and mood.`
      : `Target shot: Hero master wide — establish the full scene with cinematic lighting applied.`;

  return `You are writing an image-generation prompt to create a CINEMATIC PREVIS still — how this scene should look ON SET after lighting, NOT a diagram.

Scene context:
${buildSceneContext(project, gearProfile, gearList)}

DP plan:
${dpPlanJson}

${shotBlock}

The attached photo is the REAL location. The generated image must:
- Preserve this exact room architecture, layout, furniture, windows, and depth from the photo
- Re-light the space per the DP plan (key, fill, rim, practicals, negative fill, color contrast)
- Match mood "${project.mood}" and theme "${project.theme}" — premium cinematic look like a professional horror/thriller or commercial previs
- Use shallow depth of field, filmic contrast, motivated warm vs cool light where appropriate
- Show subjects/blocking as described if the shot calls for people; otherwise show the lit empty frame ready for talent
- Aspect ratio feel: ${project.aspectRatio}
- Camera/lens from DP plan: ${shot?.lens ?? "from cameraSettings in DP plan"}

Style references: production handout previs — moody, high contrast, deep shadows, subtle haze, warm kitchen practicals vs cool hallway spill when applicable, photorealistic film still NOT illustration.

Write ONE detailed image-generation prompt (plain text, no JSON). Start with "Using this exact location as reference," and describe the final lit cinematic frame.

Return ONLY the prompt text, nothing else.`;
}

export { CINESCOUT_SYSTEM_PROMPT };
