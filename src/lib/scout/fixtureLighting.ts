import { FixtureAwareLightingPlan, LightFixture, ScoutProject } from "./types";
import { pickLightingPreset } from "./lightingPresets";
import { WINDOW_DAYLIGHT_FIXTURE, WINDOW_DAYLIGHT_ID } from "./mockFixtures";

function fixtureLabel(f: LightFixture): string {
  return `${f.brand} ${f.model}`.trim();
}

function cctForFixture(f: LightFixture, warm: boolean): string {
  if (f.colorType === "daylight_only" && f.fixedCct) {
    return `${f.fixedCct}K (fixed — balance with WB/gels, do not change fixture CCT)`;
  }
  if (f.colorType === "bi_color" && f.cctMin && f.cctMax) {
    return warm ? `${Math.min(4000, f.cctMax)}K` : `${Math.max(5200, f.cctMin)}K`;
  }
  if (f.fixedCct) return `${f.fixedCct}K`;
  return warm ? "3200K" : "5600K";
}

export function buildFixtureAwareLightingPlan(
  project: ScoutProject,
  fixtures: LightFixture[],
  motivation?: string
): FixtureAwareLightingPlan {
  const preset = pickLightingPreset(project.mood, project.appMode);
  const isBeginner = project.skillLevel === "beginner";
  const isHorror = preset.id === "horror" || project.mood === "scary" || project.mood === "suspense";

  const available = fixtures.length ? fixtures : [WINDOW_DAYLIGHT_FIXTURE];
  const keyCandidate =
    available.find((f) => f.bestUses.includes("key") && f.fixtureType === "COB") ??
    available.find((f) => f.id === WINDOW_DAYLIGHT_ID || f.bestUses.includes("key")) ??
    available[0];

  const hairCandidate = available.find(
    (f) => f.id !== keyCandidate.id && (f.bestUses.includes("hair") || f.bestUses.includes("accent"))
  );

  const practicalCandidate = available.find(
    (f) => f.fixtureType === "practical" || f.bestUses.includes("practical")
  );

  const fillCandidate = available.find(
    (f) =>
      f.id !== keyCandidate.id &&
      f.id !== hairCandidate?.id &&
      (f.bestUses.includes("fill") || f.fixtureType === "COB")
  );

  const assignments: FixtureAwareLightingPlan["assignments"] = [
    {
      role: "key",
      ...(keyCandidate.id !== WINDOW_DAYLIGHT_ID ? { fixtureId: keyCandidate.id } : {}),
      fixtureName: fixtureLabel(keyCandidate),
      placement: keyCandidate.id === WINDOW_DAYLIGHT_ID ? "Use visible window camera-left" : "Camera-left, 45° to subject",
      direction: "Toward subject face / hero mark",
      height: "Slightly above eye line (~6–12 in)",
      distanceEstimate: keyCandidate.fixtureType === "COB" ? "4–6 ft through softbox" : "As motivated by window",
      powerStartingRange: keyCandidate.fixtureType === "COB" ? "35–55%" : "N/A (ambient)",
      cctStartingPoint: cctForFixture(keyCandidate, preset.id === "warm_creator" || preset.id === "podcast"),
      modifier:
        keyCandidate.modifiersOwned.includes("softbox") && !isHorror
          ? "Softbox or diffusion"
          : isHorror
            ? "Minimal diffusion or bare reflector"
            : "Sheer curtain / bounce",
      spillControl: "Flag spill off background; control window bloom if needed",
      controlNotes:
        keyCandidate.colorType === "daylight_only"
          ? "Daylight-only fixture — adjust camera WB, not fixture CCT"
          : keyCandidate.controlMethod === "sidus_link"
            ? "Sidus Link or manual dimmer"
            : "Set CCT within fixture range",
      reasonChosen: `${fixtureLabel(keyCandidate)} is your strongest key for ${preset.name} in a ${project.sceneType.replace(/_/g, " ")} scene.`,
    },
  ];

  if (!isHorror) {
    assignments.push({
      role: "fill",
      ...(fillCandidate && fillCandidate.id !== WINDOW_DAYLIGHT_ID
        ? { fixtureId: fillCandidate.id }
        : {}),
      fixtureName: fillCandidate ? fixtureLabel(fillCandidate) : "Bounce card / white wall",
      placement: "Camera-right, opposite key",
      direction: "Back toward subject shadow side",
      height: "Near subject chest height",
      distanceEstimate: fillCandidate?.fixtureType === "COB" ? "6–8 ft" : "Adjacent bounce",
      powerStartingRange: fillCandidate ? "15–25%" : "N/A",
      cctStartingPoint: fillCandidate ? cctForFixture(fillCandidate, true) : "Match key via bounce",
      modifier: "Soft diffusion or bounce",
      spillControl: "Keep off background",
      controlNotes: "Lower power than key for shape, not flatness",
      reasonChosen: "Gentle fill preserves skin tone without killing shadow depth.",
    });
  }

  assignments.push({
    role: "negative_fill",
    fixtureName: "Black flag / dark wall / duvet",
    placement: "Camera-right, close to subject shadow side",
    direction: "Absorbs bounce fill",
    height: "Subject head to torso",
    distanceEstimate: "2–3 ft off shadow cheek",
    powerStartingRange: "N/A",
    cctStartingPoint: "N/A",
    modifier: "Matte black fabric or flag",
    spillControl: "Blocks room bounce that flattens the face",
    controlNotes: "Essential for cinematic contrast",
    reasonChosen: preset.contrastLevel !== "low" ? "Negative fill adds dimension and stops the room from acting as accidental fill." : "Optional for softer documentary look.",
  });

  if (hairCandidate) {
    assignments.push({
      role: "hair",
      fixtureId: hairCandidate.id,
      fixtureName: fixtureLabel(hairCandidate),
      placement: "Behind subject camera-right, elevated",
      direction: "Rim on hair and shoulder",
      height: "1–2 ft above head",
      distanceEstimate: hairCandidate.beamAngleMin ? "3–5 ft with barn doors" : "4 ft",
      powerStartingRange: "20–35%",
      cctStartingPoint: cctForFixture(hairCandidate, false),
      modifier: hairCandidate.modifiersOwned.includes("barn doors") ? "Barn doors / snoot" : "Grid or flag",
      spillControl: "Feather so it does not hit lens",
      controlNotes: hairCandidate.beamAngleMin ? `Use narrow beam ~${hairCandidate.beamAngleMin}° for edge separation` : "Feather edge",
      reasonChosen: `${fixtureLabel(hairCandidate)} separates subject from background without adding fill to the face.`,
    });
  }

  if (practicalCandidate) {
    assignments.push({
      role: "practical",
      fixtureId: practicalCandidate.id,
      fixtureName: fixtureLabel(practicalCandidate),
      placement: "Background shelf or corner visible in frame",
      direction: "Motivated warm glow into depth",
      height: "Table or floor lamp height",
      distanceEstimate: "Behind subject in depth",
      powerStartingRange: "Dim to 40–60% or lower watt bulb",
      cctStartingPoint: cctForFixture(practicalCandidate, true),
      modifier: "Shade / dimmer",
      spillControl: "Do not compete with key on face",
      controlNotes: "Motivates warmth and depth",
      reasonChosen: "Practicals sell realism and layered background interest.",
    });
  }

  const lookName = preset.name;
  const lightingMotivation =
    motivation ??
    (keyCandidate.id === WINDOW_DAYLIGHT_ID
      ? "Window daylight motivates the key; supplement only where needed."
      : `${preset.keyStyle}. ${preset.fillStyle}.`);

  return {
    lookName,
    mood: project.mood,
    lightingMotivation,
    whiteBalanceRecommendation: preset.whiteBalance,
    contrastLevel: preset.contrastLevel,
    assignments,
    lightsToTurnOff: [
      preset.overhead,
      "Bright cool LEDs that fight your key color",
      "Under-cabinet kitchen strips if they create ugly mixed color",
    ],
    practicalsToUse: practicalCandidate
      ? [fixtureLabel(practicalCandidate)]
      : ["Existing lamp in frame — dim to match key"],
    negativeFillPlan: "Place black flag camera-right on shadow side of face to deepen contrast.",
    safetyNotes: [
      "Sandbag every stand; tape cables; keep hot COBs away from diffusion and hands.",
      "Watch reflections in mirrors, glass, and eyeglasses.",
      "Do not block exits; route power safely.",
    ],
    troubleshooting: [
      "If flat: reduce fill, add negative fill, turn off overhead lights.",
      "If harsh: add diffusion, move key closer with larger source, or use softbox.",
      "If background is boring: add practical glow, foreground element, or hair light slash.",
      "If mixed color: manual white balance, turn off conflicting sources, balance practicals to key.",
    ],
    beginnerExplanation: isBeginner
      ? `Start with your ${fixtureLabel(keyCandidate)} as the main light on the bright side of the face. Turn off ceiling lights if they make everything flat. Put something dark on the shadow side of the face (negative fill) so the image has shape. Set white balance manually to match your key light color.`
      : `Fixture-aware ${lookName}: motivated key, controlled fill, negative fill for contrast, hair/practical separation as available.`,
    proNotes: [
      `Target contrast: ${preset.contrastLevel}. Motivated light from ${lightingMotivation.split(".")[0]}.`,
      "Meter skin ~+1 stop in S-Log3; protect highlights on practicals.",
      "Spill control and edge separation matter more than raw output in small rooms.",
    ],
  };
}
