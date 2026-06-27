import {
  ScoutBestAngleAnalysis,
  ScoutDpPlan,
  ScoutImageAnalysis,
  ScoutLocationAnalysis,
  ScoutPreview,
  ScoutProject,
  ScoutProjectImage,
  ScoutShotList,
  LightFixture,
} from "./types";
import { CINESCOUT_ON_SET_WORKFLOW } from "./prompts/cineScoutSystem";
import { buildFixtureAwareLightingPlan } from "./fixtureLighting";

function scoreForIndex(i: number, total: number): number {
  const base = 92 - i * 8;
  return Math.max(55, Math.min(98, base + (total > 3 ? 0 : 5)));
}

export function mockPerImageAnalysis(
  image: ScoutProjectImage,
  index: number,
  total: number
): ScoutImageAnalysis {
  const roomTypes = ["living_room", "kitchen", "bedroom", "studio", "garage"];
  const roomType = roomTypes[index % roomTypes.length];
  return {
    imageId: image.id,
    roomType,
    score: scoreForIndex(index, total),
    strengths: [
      "Clear depth through the space",
      image.label === "window_light"
        ? "Natural window motivation visible"
        : "Readable background layers",
    ],
    weaknesses: [
      index === 0 ? "Slightly flat angle — limited depth cues" : "Some clutter on the left edge",
      "Mixed color temperature between practicals",
    ],
    backgroundPotential:
      "Strong mid-ground separation; background can carry texture without competing with subject.",
    lightingPotential:
      image.label === "window_light"
        ? "Excellent soft key from window — augment with negative fill camera-right."
        : "Practical overhead can motivate rim; add key from window side if available.",
    cameraPlacementPotential:
      index === 1
        ? "Corner placement gives diagonal depth and clean leading lines."
        : "Wall-mounted position works for medium shots; move 2–3 ft for wider master.",
    subjectPlacementPotential:
      "Place subject on the third mark from the window, facing 30° toward camera for dimension.",
    clutterIssues: ["Visible cables near floor", "Busy shelf upper-left"],
    practicalLightSources: ["Ceiling pendant", "Window daylight"],
    suggestedImprovements: [
      "Remove or hide cables",
      "Add subtle depth object on foreground table edge",
      "Dim overhead practical or gel to match key",
    ],
    depthScore: scoreForIndex(index, total) - 5,
    backgroundScore: scoreForIndex(index, total) - 3,
    lightingScore: image.label === "window_light" ? 90 : scoreForIndex(index, total) - 8,
    blockingScore: scoreForIndex(index, total) - 6,
    soundRiskScore: 70 + (index % 3) * 5,
    verticalPotentialScore: scoreForIndex(index, total),
    horizontalPotentialScore: scoreForIndex(index, total) - 2,
    suggestedRemovals: ["Cables near floor", "Busy shelf upper-left"],
    suggestedAdditions: ["Mid-ground plant or practical", "Foreground depth object"],
    recommendedCameraPosition:
      index === 1
        ? "Corner placement gives diagonal depth and clean leading lines."
        : "Wall-mounted position works for medium shots; move 2–3 ft for wider master.",
    recommendedSubjectPosition:
      "Place subject on the third mark from the window, facing 30° toward camera for dimension.",
    reflectionRisk: index === 2 ? "Glass surface camera-right may pick up key light" : "Low",
    audioRisk: "Room may have HVAC hum — record room tone",
  };
}

export function mockBestAngleAnalysis(
  perImage: ScoutImageAnalysis[],
  images: ScoutProjectImage[]
): ScoutBestAngleAnalysis {
  const sorted = [...perImage].sort((a, b) => b.score - a.score);
  const best = sorted[0];
  const bestImage = images.find((i) => i.id === best.imageId) ?? images[0];
  return {
    bestImageId: bestImage.id,
    reasonBestAngle:
      "This angle shows the fullest room depth, cleanest background separation, and the most usable window motivation for a cinematic key light.",
    whyOtherAnglesAreWeaker: sorted.slice(1).map(
      (a) =>
        `${images.find((i) => i.id === a.imageId)?.label ?? "Angle"} (score ${a.score}): ${a.weaknesses[0] ?? "Less depth"}`
    ),
    recommendedCameraPosition:
      "Camera in the back-left corner, ~ chest height, 35mm equivalent, angled toward the window side for depth.",
    recommendedSubjectPosition:
      "Subject on the mark 4 ft from the main background, key side toward window, eyes on upper third.",
    recommendedBackgroundChanges: [
      "Clear left shelf clutter",
      "Add one practical or plant for depth mid-ground",
      "Hang neutral throw to reduce busy pattern if needed",
    ],
    recommendedLightingMotivation:
      "Motivate key from window camera-left; use your LED as soft fill or negative fill opposite; optional hair light from overhead practical.",
  };
}

export function mockLocationAnalysis(
  projectId: string,
  images: ScoutProjectImage[]
): Omit<ScoutLocationAnalysis, "createdAt"> {
  const perImage = images.map((img, i) => mockPerImageAnalysis(img, i, images.length));
  const bestAngle = mockBestAngleAnalysis(perImage, images);
  return {
    id: `analysis-${projectId}`,
    perImage,
    bestAngle,
    missingQuestions: [
      "What is the subject doing in the scene?",
      "How many people are in frame?",
      "Do you want camera movement?",
    ],
  };
}

export function mockDpPlan(
  project: ScoutProject,
  analysis: ScoutLocationAnalysis,
  fixtures: LightFixture[] = []
): Omit<ScoutDpPlan, "createdAt"> {
  const isBeginner = project.skillLevel === "beginner";
  const lens = project.lensOptions?.includes("35")
    ? "35mm"
    : project.lensOptions?.includes("85")
      ? "85mm"
      : "50mm";

  const fixturePlan = buildFixtureAwareLightingPlan(
    project,
    fixtures,
    analysis.bestAngle.recommendedLightingMotivation
  );

  return {
    id: `dp-${project.id}`,
    sceneIdea: project.sceneIdea,
    mood: project.mood,
    theme: project.theme,
    bestAngle: analysis.bestAngle.reasonBestAngle,
    whyThisAngleWorks:
      "Diagonal depth, motivated window light, and a clean background plane make this the strongest hero angle for your mood.",
    backgroundRecommendations: analysis.bestAngle.recommendedBackgroundChanges,
    whyOtherAnglesWeaker: analysis.bestAngle.whyOtherAnglesAreWeaker,
    backgroundPlan: {
      remove: ["Cables and clutter on camera-left", "Over-bright reflections on glass if distracting"],
      add: ["Mid-ground depth object", "Subtle fill flag or black negative fill"],
      move: ["Reposition busy shelf items off the hero plane"],
      practicals: fixturePlan.practicalsToUse,
    },
    whatToRemove: ["Cables and clutter on camera-left", "Over-bright reflections on glass if distracting"],
    whatToAdd: ["Mid-ground depth object", "Subtle fill flag or black negative fill"],
    whatToMove: ["Reposition busy shelf items off the hero plane"],
    onSetWorkflow: [...CINESCOUT_ON_SET_WORKFLOW],
    blockingPlan: {
      subjectStartingPosition: "Standing at the hero mark near window-side third",
      subjectMovement: "Slow step toward camera on the emotional beat (optional)",
      heroMark: "Tape mark 4 ft from primary background, window-side",
      emotionalBeat: "Hold on medium before any movement — let light shape the face",
      finalPosition: "Settle 6 inches closer for optional close-up coverage",
      cameraMovement: "Static for master; slow push for close-up if time allows",
      propActions: ["Optional prop beat at hero mark"],
    },
    lightingPlan: {
      lightingMotivation: fixturePlan.lightingMotivation,
      keyLightPlacement: fixturePlan.assignments.find((a) => a.role === "key")?.placement ?? "",
      fillOrNegativeFill: fixturePlan.negativeFillPlan,
      hairBackLight: fixturePlan.assignments.find((a) => a.role === "hair")?.placement ?? "",
      backgroundPracticalLights: fixturePlan.practicalsToUse.join(", "),
      practicalLights: fixturePlan.practicalsToUse.join(", "),
      lightsToTurnOff: fixturePlan.lightsToTurnOff,
      flagOrBlock: ["Flag window spill off background", "Block spill on lens"],
      whiteBalanceRecommendation: fixturePlan.whiteBalanceRecommendation,
    },
    fixtureAwareLighting: fixturePlan,
    cameraSettings: {
      lensRecommendation: `${lens} — ${lens === "85mm" ? "intimate compression" : lens === "35mm" ? "environmental context" : "natural portrait perspective"}`,
      frameRate:
        project.platform.includes("shorts") || project.aspectRatio === "9:16" ? "24fps or 30fps" : "24fps",
      shutter: "1/48 at 24fps (180° rule) for natural motion blur",
      apertureStartingPoint: "f/2.8 – f/4 for subject separation without focus struggle",
      isoGuidance: "Base ISO 640–800 on FX3/A7IV; expose for skin highlights, protect window if needed",
      pictureProfileRecommendation:
        project.preferredLook === "s_log3"
          ? "S-Log3 / S-Gamut3.Cine — expose to middle grey per chart"
          : "S-Cinetone — expose slightly darker than Rec.709 for highlight headroom",
      ndFilterRecommendation: "ND 1.2–1.8 if window blows highlights at target aperture",
      focusMode: "AF-C with face/eye detect for solo subject; manual for locked interview",
      stabilizationRecommendation: project.stabilizationGear?.toLowerCase().includes("gimbal")
        ? "Gimbal for movement shots; tripod for master and interview"
        : "Tripod mandatory for master; handheld only for intentional energy",
    },
    audioNotes: project.audioGear
      ? `Use ${project.audioGear} — lav on subject, room tone 30s after scene`
      : "Record room tone; prefer lav or shotgun at 45° off-axis from subject",
    rehearsalNotes: [
      "Walk the mark once with subject facing window",
      "Check focus at widest and tightest planned lens",
      "Slate scene + take for audio sync",
    ].join(" · "),
    commonMistakes: [
      "Shooting flat against the wall with no depth",
      "Ignoring mixed color temps between window and overhead",
      "Opening aperture too wide for the subject's movement",
    ],
    beginnerExplanation: isBeginner
      ? "Think of the window as your main light. Put the camera in the corner that shows the most room depth. Place your subject so the light hits the side of their face, not flat-on. Start at f/2.8 and 1/48 shutter — adjust ISO so skin looks bright but window isn't blown out."
      : "Window-motivated key with negative fill opposite; corner camera for depth; match practicals to key or dim them.",
    proNotes:
      "Consider 4:1 key-to-fill ratio; meter skin at +1 stop over middle grey in S-Log3; flag window spill off background if needed.",
    previewPrompt: [
      `Cinematic ${project.sceneType.replace(/_/g, " ")} previsualization`,
      `mood: ${project.mood}`,
      fixturePlan.lightingMotivation,
      `${lens} lens look`,
      project.aspectRatio === "9:16" ? "vertical 9:16" : "16:9 widescreen",
    ].join(". "),
  };
}

export function mockShotList(
  project: ScoutProject,
  dpPlan: ScoutDpPlan
): Omit<ScoutShotList, "createdAt" | "updatedAt"> {
  const lens = dpPlan.cameraSettings.lensRecommendation.split(" ")[0];
  const scene = project.projectName;
  return {
    id: `shots-${project.id}`,
    shots: [
      {
        shotNumber: 1,
        scene,
        shotType: "master_wide",
        camera: project.cameraBody ?? "Sony FX3",
        lens,
        frameRate: dpPlan.cameraSettings.frameRate,
        cameraMovement: "Static on sticks",
        subjectAction: "Subject hits hero mark, holds",
        blockingNotes: dpPlan.blockingPlan.subjectStartingPosition,
        lightingNotes: dpPlan.lightingPlan.keyLightPlacement,
        audioDialogueNotes: "Room tone + dialogue if scripted",
        priority: "must_have",
        status: "planned",
        notes: "Establish space and light",
      },
      {
        shotNumber: 2,
        scene,
        shotType: "medium_shot",
        camera: project.cameraBody ?? "Sony FX3",
        lens: "50mm or 75mm",
        frameRate: dpPlan.cameraSettings.frameRate,
        cameraMovement: "Static or slow push",
        subjectAction: "Delivery / performance",
        blockingNotes: "Same mark, tighter frame",
        lightingNotes: "Same lighting — check eye light",
        audioDialogueNotes: "Primary dialogue capture",
        priority: "must_have",
        status: "planned",
        notes: "",
      },
      {
        shotNumber: 3,
        scene,
        shotType: "close_up",
        camera: project.cameraBody ?? "Sony FX3",
        lens: "85mm or 75mm",
        frameRate: dpPlan.cameraSettings.frameRate,
        cameraMovement: "Static",
        subjectAction: "Emotional beat",
        blockingNotes: dpPlan.blockingPlan.emotionalBeat,
        lightingNotes: "Watch shadow under chin",
        audioDialogueNotes: "Clean dialogue",
        priority: "must_have",
        status: "planned",
        notes: "",
      },
      {
        shotNumber: 4,
        scene,
        shotType: "vertical_social_shot",
        camera: project.cameraBody ?? "Sony FX3",
        lens: "35mm",
        frameRate: "30fps",
        cameraMovement: "Handheld or gimbal",
        subjectAction: "Platform-native framing",
        blockingNotes: "Center subject for 9:16 safe zone",
        lightingNotes: "Same key — reframe for vertical",
        audioDialogueNotes: "Optional VO hook",
        priority:
          project.aspectRatio === "9:16" || project.aspectRatio === "both" ? "must_have" : "nice_to_have",
        status: "planned",
        notes: "For Reels / TikTok / Shorts",
      },
      {
        shotNumber: 5,
        scene,
        shotType: "reaction_shot",
        camera: project.cameraBody ?? "Sony FX3",
        lens: "75mm",
        frameRate: dpPlan.cameraSettings.frameRate,
        cameraMovement: "Static",
        subjectAction: "Reaction beat",
        blockingNotes: "Same mark, tighter on eyes",
        lightingNotes: "Match master lighting",
        audioDialogueNotes: "Off-camera line or reaction",
        priority: "nice_to_have",
        status: "planned",
        notes: "",
      },
      {
        shotNumber: 6,
        scene,
        shotType: "insert_shot",
        camera: project.cameraBody ?? "Sony FX3",
        lens: "50mm macro or close focus",
        frameRate: dpPlan.cameraSettings.frameRate,
        cameraMovement: "Static",
        subjectAction: "Hands / product / detail",
        blockingNotes: "Use foreground table",
        lightingNotes: "Small LED or bounce",
        audioDialogueNotes: "N/A",
        priority: "nice_to_have",
        status: "planned",
        notes: "",
      },
      {
        shotNumber: 7,
        shotType: "thumbnail_shot",
        scene,
        camera: project.cameraBody ?? "Sony FX3",
        lens: "85mm",
        frameRate: dpPlan.cameraSettings.frameRate,
        cameraMovement: "Static",
        subjectAction: "Hero expression / hook frame",
        blockingNotes: "Best light on face",
        lightingNotes: "Same key — optimize for still frame",
        audioDialogueNotes: "N/A",
        priority: "must_have",
        status: "planned",
        notes: "Cover / thumbnail frame",
      },
      {
        shotNumber: 8,
        scene,
        shotType: "bts_shot",
        camera: project.cameraBody ?? "Sony FX3",
        lens: "35mm",
        frameRate: "24fps",
        cameraMovement: "Handheld",
        subjectAction: "Behind-the-scenes setup",
        blockingNotes: "Wide showing lights and camera",
        lightingNotes: "Ambient room",
        audioDialogueNotes: "N/A",
        priority:
          project.sceneType === "creator_reel" || project.sceneType === "social_reel"
            ? "nice_to_have"
            : "optional",
        status: "planned",
        notes: "Creator / commercial BTS",
      },
      {
        shotNumber: 9,
        scene,
        shotType: "room_tone",
        camera: project.cameraBody ?? "Sony FX3",
        lens: "Any",
        frameRate: dpPlan.cameraSettings.frameRate,
        cameraMovement: "Static",
        subjectAction: "Empty room — 30 seconds",
        blockingNotes: "Everyone quiet, lights as picture",
        lightingNotes: "Same as scene",
        audioDialogueNotes: "Room tone for edit",
        priority: "must_have",
        status: "planned",
        notes: "",
      },
      {
        shotNumber: 10,
        scene,
        shotType: "wild_line",
        camera: project.cameraBody ?? "Sony FX3",
        lens: "50mm",
        frameRate: dpPlan.cameraSettings.frameRate,
        cameraMovement: "Static",
        subjectAction: "Clean dialogue lines",
        blockingNotes: "Same mark as medium",
        lightingNotes: "Match medium",
        audioDialogueNotes: "Wild lines for edit safety",
        priority: "optional",
        status: "planned",
        notes: "If dialogue matters",
      },
    ],
  };
}

export function mockPreviews(project: ScoutProject, dpPlan: ScoutDpPlan): Omit<ScoutPreview, "createdAt">[] {
  const prompt = [
    `Cinematic ${project.sceneType.replace(/_/g, " ")} frame`,
    `mood: ${project.mood}`,
    `theme: ${project.theme}`,
    dpPlan.cameraSettings.lensRecommendation,
    dpPlan.lightingPlan.keyLightPlacement,
    dpPlan.blockingPlan.subjectStartingPosition,
    project.aspectRatio === "9:16" ? "vertical 9:16 composition" : "16:9 widescreen",
    "photorealistic previsualization, film still, shallow depth of field",
  ].join(". ");

  return [
    {
      id: `preview-${project.id}-diagram`,
      prompt,
      type: "lighting_diagram",
      shotLabel: "Top-down lighting plan",
    },
    {
      id: `preview-${project.id}-hero`,
      prompt: `Cinematic previs of ${project.sceneType.replace(/_/g, " ")} — ${project.mood} mood, lit per DP plan`,
      type: "cinematic_frame",
      shotLabel: "Hero master wide",
      shotNumber: 1,
    },
  ];
}
