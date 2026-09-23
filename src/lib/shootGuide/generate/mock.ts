import type { ShootGuide } from "@/lib/shootGuide/types";

const TREADMILL = /treadmill|stormi|workout/i;
const HORROR = /horror|suspense|kitchen.*dark|uneasy/i;
const INTERVIEW = /interview|talking head|podcast/i;
const PRODUCT = /product|commercial|packshot|hero product/i;

function blob(guide: Pick<ShootGuide, "prompt" | "title"> & { creativeIntent?: string }): string {
  return `${guide.prompt || ""} ${guide.title || ""} ${guide.creativeIntent || ""}`;
}

function isTreadmill(guide: Pick<ShootGuide, "prompt" | "title">): boolean {
  return TREADMILL.test(`${guide.prompt} ${guide.title}`);
}

function isHorror(guide: Pick<ShootGuide, "prompt" | "title"> & { creativeIntent?: string }): boolean {
  return HORROR.test(blob(guide)) || /horror|suspense/i.test(guide.creativeIntent || "");
}

function isInterview(guide: Pick<ShootGuide, "prompt" | "title">): boolean {
  return INTERVIEW.test(`${guide.prompt} ${guide.title}`);
}

function isProduct(guide: Pick<ShootGuide, "prompt" | "title">): boolean {
  return PRODUCT.test(`${guide.prompt} ${guide.title}`);
}

export function mockSceneAnalysisJson(guide: Pick<ShootGuide, "prompt" | "title" | "creativeIntent">) {
  if (isTreadmill(guide)) {
    return {
      subject: "Stormi on a treadmill",
      action: "Walking then running through a workout",
      emotionalGoal: "Effort that reads as confidence, not struggle",
      environment: "Home or gym cardio corner with a treadmill as the hero prop",
      genreTone: guide.creativeIntent || "cinematic",
    };
  }
  if (isHorror(guide)) {
    return {
      subject: "Someone alone in a kitchen after dark",
      action: "A small sound, then a reveal of what should not be there",
      emotionalGoal: "Dread that tightens, then a matched reveal that lands",
      environment: "Kitchen at night; practicals only, corners that can hide a clean plate",
      genreTone: guide.creativeIntent || "horror",
    };
  }
  if (isInterview(guide)) {
    return {
      subject: "The interviewee in a quiet room",
      action: "They talk; we cover geography, the thought, and a still hero listen",
      emotionalGoal: "Trust and a last frame that feels like we heard them",
      environment: "Simple interior with a clean background and a motivated window or practical",
      genreTone: guide.creativeIntent || "documentary",
    };
  }
  if (isProduct(guide)) {
    return {
      subject: "The product as hero",
      action: "Show form, material, use, then a still packshot",
      emotionalGoal: "Desire without a carnival of camera moves",
      environment: "Controlled tabletop or a simple lifestyle nook",
      genreTone: guide.creativeIntent || "commercial",
    };
  }
  return {
    subject: "The person in the scene",
    action: guide.prompt?.trim() || "The main action of the scene",
    emotionalGoal: "A clear last image the audience can feel",
    environment: "The space implied by the prompt",
    genreTone: guide.creativeIntent || "cinematic",
  };
}

export function mockStrategyJson(
  guide: Pick<ShootGuide, "prompt" | "title" | "creativeIntent" | "desiredShotCount" | "useMyEquipment">
) {
  const n = guide.desiredShotCount || 5;
  if (isTreadmill(guide)) {
    return {
      overview: {
        sceneSummary:
          "Stormi works a treadmill in a contained space. Open on geography, then sell stride, effort, and a confident finish.",
        toneStyle: guide.creativeIntent || "cinematic",
        visualObjective:
          "Make the workout feel cinematic: controlled camera, sweat that reads, a last frame she owns.",
        recommendedShotCount: n,
        visualStrategy:
          "Locked wide for the room and machine, then step in through a working medium and a detail of effort into a hero closer. Save movement for the working shot; keep the finish still.",
        gearSummary: guide.useMyEquipment
          ? "Stay on catalog bodies and primes. Tripod for the wide and hero; handheld or a short slide only if you own the support."
          : "One cinema body, a 35 and 50 (or 85), sticks, and a soft key plus a small edge.",
      },
      setup: {
        locationNotes:
          "Clear the treadmill sightlines. Hide clutter behind her; leave a clean wall or window in the wide.",
        lightingNotes:
          "Soft key ~45° off camera, slight edge for sweat, practicals under the key. WB around 4300K.",
        cameraSettings: "24p, 180° shutter, S-Cinetone or similar, ISO as low as the key allows.",
        equipmentList: guide.useMyEquipment
          ? "Owned body + one wide-normal prime + one longer prime if cataloged, tripod, one key, one edge or bounce."
          : "Cinema body, 35mm, 50mm or 85mm, tripod, soft key, small edge, bounce.",
        cameraPlacement:
          "Wide: 3/4 front of the machine so the belt and room both read. Hero: just off her eyeline at chest-to-face height.",
      },
      visualAnalysis: {
        lightingDirection: "Key from camera-left, slight wrap, edge from behind the far shoulder",
        contrast: "Medium ratio so sweat and muscle still cut",
        colorTemperature: "4300K with a touch of warmth on skin",
        composition: "Machine as leading line into her; hero tighter on face and upper body",
        depth: "Let the room fall off behind her in the closer",
        lensCharacter: "35 for geography, 50/85 for effort and finish",
        cameraAngle: "Eye-level working shots; slightly low on the hero",
        palette: "Neutral gym, skin as the brightest thing",
        energy: "Still frames except one motivated working move",
      },
      lightingPlan: {
        cameraWb: "4300K",
        summary: "Soft key 45° off, dimmed practicals, small edge for sweat. Do not flatten with overhead.",
        fixtures: [
          {
            id: "fx_01",
            fixture: "Soft key",
            role: "key",
            placement: "Camera-left, 45°, just above eyeline",
            kelvin: "4300K",
          },
          {
            id: "fx_02",
            fixture: "Small edge or bounce",
            role: "edge",
            placement: "Far shoulder, behind the treadmill rail",
            kelvin: "4300–4500K",
          },
        ],
      },
    };
  }
  if (isHorror(guide)) {
    return {
      overview: {
        sceneSummary:
          "Night kitchen. Hold the empty room, then a matched reveal. Movement is uneasy only when the beat earns it.",
        toneStyle: guide.creativeIntent || "horror",
        visualObjective: "Dread from withholding, then one reveal the audience can match.",
        recommendedShotCount: n,
        visualStrategy:
          "Locked clean plate of the kitchen, then the same frame with the intrusion. Controlled holds; uneasy move only on the approach. Finish still.",
        gearSummary: guide.useMyEquipment
          ? "Catalog body, one wide, one longer prime, sticks. No gimbal unless you own it and the approach needs it."
          : "Cinema body, 24/35 and 50, sticks, hard key, negative fill.",
      },
      setup: {
        locationNotes: "Mark the clean plate. Hide clutter that would break the match. Practicals motivated.",
        lightingNotes: "Underexpose the room. Hard or small key, deep neg. Exposure holds between plate and reveal.",
        cameraSettings: "24p, 180° shutter, locked WB, ISO as low as the key allows.",
        equipmentList: "Body, wide, normal, tripod, key, flag.",
        cameraPlacement: "Same sticks mark for plate and reveal. Approach from the doorway if you move at all.",
      },
      visualAnalysis: {
        lightingDirection: "Hard key off-axis, neg opposite, practicals dim",
        contrast: "High; protect a sliver of face",
        colorTemperature: "Cool practicals or mixed, locked",
        composition: "Doorway and counter as leading lines into the empty space",
        depth: "Dark falloff; do not fill the corners",
        lensCharacter: "Wide for the plate, longer for the dread closer",
        cameraAngle: "Eye level locked; low only if it makes the room feel wrong",
        palette: "Desaturated kitchen, skin last",
        energy: "Still until the reveal; uneasy only on the approach",
      },
      lightingPlan: {
        cameraWb: "4300K",
        summary: "Small key, heavy neg, practicals under the key. Same stop on plate and reveal.",
        fixtures: [
          {
            id: "fx_01",
            fixture: "Hard key",
            role: "key",
            placement: "Camera-left, skimming the counter",
            kelvin: "4300K",
          },
          {
            id: "fx_02",
            fixture: "Solid flag",
            role: "negative",
            placement: "Camera-right of the subject line",
          },
        ],
      },
    };
  }
  if (isInterview(guide)) {
    return {
      overview: {
        sceneSummary: "One person, one room, one conversation. Geography, then a still hero listen.",
        toneStyle: guide.creativeIntent || "documentary",
        visualObjective: "Eyeline trust and a last frame that feels heard.",
        recommendedShotCount: n,
        visualStrategy: "Locked wide for the room, MCU on the talk, a reverse or listen, a detail, a still hero.",
        gearSummary: guide.useMyEquipment
          ? "Catalog body, 35 and 50, sticks. Boom or lav from inventory."
          : "Cinema body, 35, 50, sticks, soft key, bounce.",
      },
      setup: {
        locationNotes: "Clean background. Seat them off the wall. Hide logos.",
        lightingNotes: "Soft key 45°, bounce opposite, window as motivated if it exists.",
        cameraSettings: "24p or 30p, 180° shutter, locked WB.",
        equipmentList: "Body, two primes, tripod, key, bounce, mic.",
        cameraPlacement: "A-cam just off eyeline. Wide further back on the same side.",
      },
      visualAnalysis: {
        lightingDirection: "Soft key camera-left, bounce camera-right",
        contrast: "Gentle; eyes open",
        colorTemperature: "Match the window or 5600K",
        composition: "Talking-room rule: looking space toward interviewer",
        depth: "Background soft on the MCU",
        lensCharacter: "35 geography, 50 hero",
        cameraAngle: "Eye level, never looking down on them",
        palette: "Neutral, skin protected",
        energy: "Locked. No handheld.",
      },
      lightingPlan: {
        cameraWb: "5600K",
        summary: "Soft key and bounce. Do not let overheads flatten the face.",
        fixtures: [
          {
            id: "fx_01",
            fixture: "Soft key",
            role: "key",
            placement: "45° off eyeline, just above",
            kelvin: "5600K",
          },
        ],
      },
    };
  }
  if (isProduct(guide)) {
    return {
      overview: {
        sceneSummary: "The object is the talent. Form, material, use, then a still packshot.",
        toneStyle: guide.creativeIntent || "commercial",
        visualObjective: "Desire from light on material, not from camera gymnastics.",
        recommendedShotCount: n,
        visualStrategy: "Hero still, texture/detail, in-use or hand-in, lifestyle context, packshot hold.",
        gearSummary: guide.useMyEquipment
          ? "Catalog body, macro or 50, sticks. One key, bounce, black card."
          : "Cinema body, 50/macro, sticks, key, bounce, flag.",
      },
      setup: {
        locationNotes: "Seamless or simple nook. Kill specular junk in the background.",
        lightingNotes: "One key that shows material; bounce for fill; flag for edge of the product.",
        cameraSettings: "24p, 180° shutter, locked WB, stop down for texture if needed.",
        equipmentList: "Body, 50 or macro, tripod, key, bounce, flag.",
        cameraPlacement: "Lock the packshot. Move only for the in-use beat.",
      },
      visualAnalysis: {
        lightingDirection: "Raking key to show texture",
        contrast: "Medium-high on the object, background darker",
        colorTemperature: "5600K or match the brand still",
        composition: "Product dominant; negative space for a packshot crop",
        depth: "Falloff behind the object",
        lensCharacter: "Normal for hero, longer or macro for material",
        cameraAngle: "Slightly above for form; eye-level for in-use",
        palette: "Object color is the brightest thing",
        energy: "Still except one motivated in-use move",
      },
      lightingPlan: {
        cameraWb: "5600K",
        summary: "Raking key, bounce, flag. Sell the material, then hold the packshot.",
        fixtures: [
          {
            id: "fx_01",
            fixture: "Soft key",
            role: "key",
            placement: "Raking across the face of the product",
            kelvin: "5600K",
          },
        ],
      },
    };
  }
  return {
    overview: {
      sceneSummary: guide.prompt?.trim() || guide.title || "A short scene with a clear last image.",
      toneStyle: guide.creativeIntent || "cinematic",
      visualObjective: "Cover geography, the work, and a payoff closer.",
      recommendedShotCount: n,
      visualStrategy:
        "Open wide enough to read the space, then step in through action into a still hero finish.",
      gearSummary: guide.useMyEquipment
        ? "Prefer catalog cameras, lenses, and supports."
        : "Small-crew cinema body, two primes, sticks, one key.",
    },
    setup: {
      locationNotes: "Clear sightlines and hide clutter in the wide.",
      lightingNotes: "Soft motivated key, practicals under the key, optional edge.",
      cameraSettings: "24p, 180° shutter, locked WB.",
      equipmentList: "Body, two primes, tripod, key, bounce.",
      cameraPlacement: "Start further than feels natural for the wide, then commit closer for the finish.",
    },
    visualAnalysis: {
      lightingDirection: "Key 45° off camera",
      contrast: "Medium",
      colorTemperature: "4300K",
      composition: "Subject dominant, room as context",
      depth: "Falloff behind the subject on the closer",
      lensCharacter: "Normal for work, longer for finish",
      cameraAngle: "Eye level unless the beat asks otherwise",
      palette: "Neutral, skin protected",
      energy: "Locked unless the move is motivated",
    },
    lightingPlan: {
      cameraWb: "4300K",
      summary: "Soft key, dimmed practicals, optional edge.",
      fixtures: [],
    },
  };
}

function packGold(
  gold: Record<string, string>[],
  count: number,
  guide: Pick<ShootGuide, "sourceSceneLabel">,
  extras: { cameraSettings: string; audioRequirements: string }
) {
  const picked = gold.slice(0, Math.min(count, gold.length));
  while (picked.length < count) {
    const last = gold[gold.length - 1];
    picked.push({ ...last, title: `${last.title} (alt ${picked.length + 1})` });
  }
  return {
    shots: picked.map((s, i) => ({
      camera: "FX3",
      aperture: "T2.8",
      focusStrategy: "Eyes or the hero plane",
      lightingChanges: "Same setup unless noted",
      blocking: "Play the beat",
      performanceDirection: "Do not look at camera",
      continuityRequirements: s.continuityRequirements || "Do not reset dressing or sweat.",
      ...s,
      shotNumber: i + 1,
      setupLabel: `Setup ${String(i + 1).padStart(2, "0")}`,
      sceneLabel: guide.sourceSceneLabel || undefined,
      cameraSettings: extras.cameraSettings,
      audioRequirements: extras.audioRequirements,
      status: "planned",
    })),
  };
}

export function mockShotsJson(
  guide: Pick<ShootGuide, "prompt" | "title" | "desiredShotCount" | "sourceSceneLabel">
) {
  const count = Math.max(1, Math.min(guide.desiredShotCount || 5, 12));
  if (isTreadmill(guide)) {
    const gold = [
      {
        title: "Establish the machine",
        purpose: "Show Stormi, the treadmill, and the room so later tights have geography.",
        framing: "Wide",
        cameraAngle: "3/4 front",
        cameraHeight: "Chest height",
        cameraPosition: "Front-left of the treadmill, far enough to see belt and wall",
        camera: "FX3",
        lens: "35mm prime",
        focalLength: "35mm",
        aperture: "T2.8",
        support: "Tripod",
        movement: "Locked",
        focusStrategy: "Hyperfocal on her and the deck",
        lightingChanges: "Key on, practicals dimmed, room still readable",
        blocking: "She is already walking as we roll",
        performanceDirection: "Even pace, eyes forward, no glance at camera",
        reason: "A locked 35mm wide is the cheapest way to sell the space before you go in.",
      },
      {
        title: "Start the work",
        purpose: "The walk becomes a run — effort begins without losing her face.",
        framing: "Medium",
        cameraAngle: "Slightly front",
        cameraHeight: "Eye level",
        cameraPosition: "Beside the rail, looking across the belt",
        camera: "FX3",
        lens: "50mm prime",
        focalLength: "50mm",
        aperture: "T2.2",
        support: "Tripod",
        movement: "Locked",
        focusStrategy: "Eyes, pull if she leans",
        lightingChanges: "Same key; let the background fall a half stop",
        blocking: "Increase speed on action",
        performanceDirection: "Breath starts to show; jaw set, not grimacing",
        reason: "50mm medium keeps sweat and stride without the room taking over.",
      },
      {
        title: "Effort in the body",
        purpose: "Sell work in the legs and arms so the sequence has physical proof.",
        framing: "MCU / detail",
        cameraAngle: "Low 3/4",
        cameraHeight: "Belt height",
        cameraPosition: "Low beside the deck, looking up the stride",
        camera: "FX3",
        lens: "35mm prime",
        focalLength: "35mm",
        aperture: "T2.8",
        support: "Handheld or sticks",
        movement: "Tiny handheld energy or a short slide with the stride",
        focusStrategy: "Nearest knee, let face soften if it enters",
        lightingChanges: "Edge for sweat on the shoulder if you have it",
        blocking: "Full stride, arms pumping",
        performanceDirection: "Commit to the pace; do not pose",
        reason: "A lower angle on the stride is the movement priority without a gimbal.",
      },
      {
        title: "The cost on her face",
        purpose: "Emotion: confidence under load. This is the cutaway you land on between strides.",
        framing: "Close-up",
        cameraAngle: "Eye level, slight front",
        cameraHeight: "Face height",
        cameraPosition: "Just off the front rail, tight on face and collarbone",
        camera: "FX3",
        lens: "85mm or 50mm",
        focalLength: "85mm",
        aperture: "T2.0",
        support: "Tripod",
        movement: "Locked",
        focusStrategy: "Near eye, shallow",
        lightingChanges: "Protect skin; keep the key wrap, drop the room",
        blocking: "Keep running; a half-smile is allowed if it is real",
        performanceDirection: "Do not act toughness. Let breath and eyes do it.",
        reason: "Longer lens, still camera — emotion without the machine shaking the frame.",
      },
      {
        title: "Hero finish",
        purpose: "Last image: she owns the room. Hold after she slows so the cut can live here.",
        framing: "Medium close",
        cameraAngle: "Slightly low",
        cameraHeight: "Chest to chin",
        cameraPosition: "Centered on her, treadmill rails as a frame",
        camera: "FX3",
        lens: "50mm prime",
        focalLength: "50mm",
        aperture: "T2.2",
        support: "Tripod",
        movement: "Locked, extra two seconds of pad",
        focusStrategy: "Eyes through the settle",
        lightingChanges: "Same as closer; do not relight",
        blocking: "Slow to a walk, then still, looking past camera",
        performanceDirection: "Let the last look land. No victory pose.",
        reason: "A still hero is the cinematic finish; movement here would cheapen it.",
      },
    ];
    const picked = gold.slice(0, Math.min(count, gold.length));
    while (picked.length < count) {
      const last = gold[gold.length - 1];
      picked.push({ ...last, title: `${last.title} (alt ${picked.length + 1})` });
    }
    return {
      shots: picked.map((s, i) => ({
        ...s,
        shotNumber: i + 1,
        setupLabel: `Setup ${String(i + 1).padStart(2, "0")}`,
        sceneLabel: guide.sourceSceneLabel || undefined,
        cameraSettings: "24p · 1/48 · WB 4300K",
        audioRequirements: "MOS or room tone; treadmill motor is MOS unless you want it",
        continuityRequirements: "Same shoes, same hair, sweat must increase not reset",
        status: "planned",
      })),
    };
  }
  if (isHorror(guide)) {
    const gold = [
      {
        title: "Clean plate kitchen",
        purpose: "Locked empty kitchen so the reveal can match this frame.",
        framing: "Wide",
        cameraAngle: "Eye level",
        movement: "Locked — controlled",
        lens: "35mm prime",
        focalLength: "35mm",
        support: "Tripod",
        continuityRequirements: "Practicals, chairs, and counter dressing cannot move after this plate.",
        reason: "A clean plate is the horror match; do not handheld this.",
      },
      {
        title: "Uneasy approach",
        purpose: "Someone enters; movement is uneasy only here.",
        framing: "Medium",
        cameraAngle: "Doorway 3/4",
        movement: "Slow push or creep — uneasy",
        lens: "35mm prime",
        focalLength: "35mm",
        support: "Slider or sticks creep",
        reason: "One uneasy move earns the stills around it.",
      },
      {
        title: "Matched reveal",
        purpose: "Same mark as the plate, now with the intrusion in frame.",
        framing: "Wide",
        cameraAngle: "Eye level — same as plate",
        movement: "Locked — controlled",
        lens: "35mm prime",
        focalLength: "35mm",
        support: "Tripod",
        continuityRequirements: "Match the plate: same sticks, same stop, same practicals.",
        reason: "The cut only works if this is the plate with one new element.",
      },
      {
        title: "Dread closer",
        purpose: "Face or hands under load; withhold the full figure.",
        framing: "Close-up",
        cameraAngle: "Eye level",
        movement: "Locked",
        lens: "50mm prime",
        focalLength: "50mm",
        support: "Tripod",
        reason: "Longer still closer after the reveal; do not chase.",
      },
      {
        title: "Hold the room",
        purpose: "Last image: the kitchen after, still, so the cut can live here.",
        framing: "Wide",
        cameraAngle: "Eye level",
        movement: "Locked, extra pad",
        lens: "35mm prime",
        focalLength: "35mm",
        support: "Tripod",
        reason: "A still hold is the horror finish.",
      },
    ];
    return packGold(gold, count, guide, {
      cameraSettings: "24p · 1/48 · underexpose a stop",
      audioRequirements: "Quiet kitchen; protect the sound of the reveal.",
    });
  }
  if (isInterview(guide)) {
    const gold = [
      {
        title: "Room and seat",
        purpose: "Geography and eyeline so later MCUs have a home.",
        framing: "Wide",
        cameraAngle: "Same side as A-cam",
        movement: "Locked",
        lens: "35mm prime",
        focalLength: "35mm",
        support: "Tripod",
        reason: "Locked wide protects eyeline and the room.",
      },
      {
        title: "Talking MCU",
        purpose: "The thought on their face; this is the cut you live in.",
        framing: "MCU",
        cameraAngle: "Just off eyeline",
        movement: "Locked",
        lens: "50mm prime",
        focalLength: "50mm",
        support: "Tripod",
        reason: "50mm off eyeline is the interview hero, not handheld.",
      },
      {
        title: "Listen / reverse",
        purpose: "A still listen so you can cut away without breaking eyeline.",
        framing: "Medium",
        cameraAngle: "Opposite shoulder if two-person; same-side noddy if solo",
        movement: "Locked",
        lens: "50mm prime",
        focalLength: "50mm",
        support: "Tripod",
        reason: "A lock-off listen saves the edit.",
      },
      {
        title: "Hands or detail",
        purpose: "A cutaway that is true to the talk, not a random insert.",
        framing: "Close-up",
        cameraAngle: "From the A-cam side",
        movement: "Locked",
        lens: "50mm or 85mm",
        focalLength: "50mm",
        support: "Tripod",
        reason: "Detail from the same side keeps eyeline honest.",
      },
      {
        title: "Hero listen",
        purpose: "Last image: they finish, we hold.",
        framing: "MCU",
        cameraAngle: "Just off eyeline",
        movement: "Locked, extra pad",
        lens: "50mm prime",
        focalLength: "50mm",
        support: "Tripod",
        reason: "A still hero MCU is the interview finish.",
      },
    ];
    return packGold(gold, count, guide, {
      cameraSettings: "24p · 1/48 · WB 5600K",
      audioRequirements: "Lav plus boom if you have it; room tone.",
    });
  }
  if (isProduct(guide)) {
    const gold = [
      {
        title: "Hero form",
        purpose: "Show the object’s shape so later details have a home.",
        framing: "Medium",
        cameraAngle: "Slightly above",
        movement: "Locked",
        lens: "50mm prime",
        focalLength: "50mm",
        support: "Tripod",
        reason: "A still hero sells form before texture.",
      },
      {
        title: "Material detail",
        purpose: "Texture and finish — light raking the surface.",
        framing: "Close-up",
        cameraAngle: "Raking",
        movement: "Locked",
        lens: "50mm or macro",
        focalLength: "50mm",
        support: "Tripod",
        reason: "Detail is the commercial proof of material.",
      },
      {
        title: "In use",
        purpose: "A hand or body uses it once, motivated.",
        framing: "Medium",
        cameraAngle: "Eye level",
        movement: "Short motivated move or locked",
        lens: "35mm prime",
        focalLength: "35mm",
        support: "Tripod",
        reason: "One in-use beat; do not turn it into a gimbal ad.",
      },
      {
        title: "Lifestyle nook",
        purpose: "The object in a simple life context.",
        framing: "Wide-medium",
        cameraAngle: "Eye level",
        movement: "Locked",
        lens: "35mm prime",
        focalLength: "35mm",
        support: "Tripod",
        reason: "Context without stealing the packshot.",
      },
      {
        title: "Packshot hold",
        purpose: "Last image: still product, crop-safe, extra pad.",
        framing: "Hero still",
        cameraAngle: "Slightly above",
        movement: "Locked, extra two seconds",
        lens: "50mm prime",
        focalLength: "50mm",
        support: "Tripod",
        reason: "The packshot is the commercial finish.",
      },
    ];
    return packGold(gold, count, guide, {
      cameraSettings: "24p · 1/48 · WB 5600K",
      audioRequirements: "MOS unless the use makes a useful sound.",
    });
  }
  const titles = ["Establish", "The work", "Detail", "Reaction", "Hero finish"];
  return {
    shots: Array.from({ length: count }, (_, i) => ({
      shotNumber: i + 1,
      setupLabel: `Setup ${String(i + 1).padStart(2, "0")}`,
      title: titles[i] || `Shot ${String(i + 1).padStart(2, "0")}`,
      purpose: `Coverage beat ${i + 1} for this scene.`,
      framing: i === 0 ? "Wide" : i === count - 1 ? "Medium close" : "Medium",
      camera: "FX3",
      lens: i === 0 ? "35mm" : "50mm",
      focalLength: i === 0 ? "35mm" : "50mm",
      support: "Tripod",
      movement: "Locked",
      reason: "Simple coverage that still has a last image.",
      status: "planned",
    })),
  };
}

export function mockSingleShotJson(
  guide: Pick<ShootGuide, "prompt" | "title" | "desiredShotCount" | "sourceSceneLabel">,
  shotNumber: number,
  instruction?: string
) {
  const all = mockShotsJson(guide).shots;
  const base = all[Math.max(0, shotNumber - 1)] ?? all[0];
  const extra = instruction?.toLowerCase().includes("less gear")
    ? { support: "Tripod", movement: "Locked", lightingChanges: "One key, no edge", reason: "Sticks and one key — drop the gimbal and the second light." }
    : instruction?.toLowerCase().includes("cinematic")
      ? { cameraAngle: "Slightly low", lens: "50mm prime", focalLength: "50mm", movement: "Locked with extra pad", reason: "Lower, longer, still — cinematic without a rental package." }
      : instruction?.toLowerCase().includes("lens")
        ? { lens: "85mm prime", focalLength: "85mm", reason: "Swap to 85mm to isolate the subject." }
        : instruction?.toLowerCase().includes("angle")
          ? { cameraAngle: "Low front", cameraHeight: "Lower than the working height", reason: "A lower angle sells power without new gear." }
          : instruction?.toLowerCase().includes("simpl")
            ? { support: "Tripod", movement: "Locked", lightingChanges: "Key only", reason: "Locked sticks and one key — fastest version of this beat." }
            : {};
  return { shot: { ...base, ...extra, shotNumber } };
}

export function mockVisualIntelligenceJson(
  guide: Pick<ShootGuide, "prompt" | "title" | "references">
) {
  const locationRef = (guide.references ?? []).find((r) => r.kind === "location");
  const treadmill = isTreadmill(guide);
  const topDown = treadmill
    ? [
        { id: "mk_set_01", kind: "set", label: "Treadmill", x: 0.5, y: 0.46 },
        { id: "mk_subject_01", kind: "subject", label: "Stormi", x: 0.5, y: 0.52 },
        { id: "mk_camera_01", kind: "camera", label: "Cam A", x: 0.34, y: 0.84 },
        { id: "mk_camera_02", kind: "camera", label: "Cam B", x: 0.82, y: 0.52 },
        { id: "mk_key_01", kind: "key", label: "Key", x: 0.2, y: 0.28 },
        { id: "mk_negative_01", kind: "negative", label: "Neg", x: 0.82, y: 0.4 },
      ]
    : [
        { id: "mk_subject_01", kind: "subject", label: "Subject", x: 0.5, y: 0.52 },
        { id: "mk_camera_01", kind: "camera", label: "Cam A", x: 0.34, y: 0.84 },
        { id: "mk_key_01", kind: "key", label: "Key", x: 0.2, y: 0.28 },
      ];
  const photo = treadmill
    ? [
        { id: "mkp_set_01", kind: "set", label: "Treadmill", x: 0.52, y: 0.5 },
        { id: "mkp_subject_01", kind: "subject", label: "Stormi", x: 0.55, y: 0.58, note: "On the belt, facing the console" },
        { id: "mkp_key_01", kind: "key", label: "Key", x: 0.82, y: 0.32, note: "Camera-right of the frame" },
        { id: "mkp_negative_01", kind: "negative", label: "Neg", x: 0.16, y: 0.4 },
      ]
    : [
        { id: "mkp_subject_01", kind: "subject", label: "Subject", x: 0.5, y: 0.5 },
        { id: "mkp_key_01", kind: "key", label: "Key", x: 0.22, y: 0.3 },
      ];
  return {
    locationAnalysis: treadmill
      ? {
          layout: "Narrow cardio bay: treadmill as the hero prop, wall behind, console at the far end.",
          subjectPlacement: "Stormi on the belt, facing the console, body readable from 3/4 front.",
          practicals: "Console LEDs and any overheads — dim them under the key.",
          windows: "If a window is in the wide, treat it as the motivated source or kill it.",
          obstacles: "Handrails and the deck; do not hide the belt in the wide.",
          backgrounds: "Clean wall or window behind her; hide clutter and extra machines.",
          clutter: "Move water bottles, extra plates, and logos out of the wide.",
          cameraZones: "Front-left of the machine for geography; rail for working; low beside the deck for stride.",
          lightZones: "Key camera-left of the 3/4; edge from behind the far shoulder; avoid flattening overhead.",
          cameraDirection: "Most coverage looks toward the console so the room falls off behind her.",
          geometry: "Rectangle room, treadmill parallel to the long wall.",
        }
      : {
          layout: "The space implied by the prompt.",
          subjectPlacement: "Put the subject where the wide can still read the room.",
          cameraZones: "Start further than feels natural, then commit closer.",
          lightZones: "Key 45° off camera, optional edge.",
        },
    visualAnalysis: treadmill
      ? {
          lightingDirection: "Soft key camera-left, slight wrap, edge for sweat",
          contrast: "Medium ratio so muscle and sweat still cut",
          colorTemperature: "Warm skin against a cooler or neutral gym",
          composition: "Belt as a leading line into her",
          depth: "Room falls off on the closers",
          palette: "Neutral gym, skin as the brightest thing",
          energy: "Still frames except one motivated working move",
        }
      : {
          lightingDirection: "Motivated key from the brightest practical or window",
          contrast: "Medium",
          energy: "Locked unless the move is motivated",
        },
    placementPlan: {
      summary: treadmill
        ? "Cam A 3/4 front of the treadmill, Cam B on the rail, key camera-left, edge on the far shoulder."
        : "Subject center, camera further than the working shot, key 45° off.",
      photoView: locationRef
        ? { referenceId: locationRef.id, markers: photo }
        : { referenceId: null, markers: [] },
      topDown: { referenceId: null, markers: topDown },
    },
    setup: {
      locationNotes: treadmill
        ? "Clear the treadmill sightlines. Hide clutter behind her; leave a clean wall or window in the wide."
        : "Clear sightlines and hide clutter in the wide.",
      cameraPlacement: treadmill
        ? "Wide: 3/4 front of the machine so the belt and room both read. Working: beside the rail. Hero: just off eyeline."
        : "Start further than feels natural for the wide, then commit closer for the finish.",
    },
  };
}

