import { ReferenceGuideDocument } from "@/lib/reference/types";

/** Baseline on-set reference — seeded from Master Filmmaking Reference Guide + FX6 + lens expansion. */
export const DEFAULT_REFERENCE_GUIDE: ReferenceGuideDocument = {
  version: 1,
  title: "Master Filmmaking Reference Guide",
  subtitle:
    "Lighting ratios · IRE · LIT DUO · Sony FX6 / FX3 / FX30 / a7IV · Lenses · On-set workflow",
  sections: [
    {
      id: "how-to-use",
      category: "start",
      title: "How to use this guide",
      summary: "Seven-step workflow for any look on set.",
      body: `Pick the mood, choose the ratio, set the camera, meter with the LIT DUO, confirm IRE on the waveform, record a test clip, then shoot.

Camera settings do not create the look by themselves. Lighting ratio, white balance, lens choice, art direction, and sound design finish the look.`,
      tables: [
        {
          headers: ["Step", "Action", "What to check"],
          rows: [
            ["1", "Choose the look", "Clean, warm, moody, horror, podcast, documentary, interview, etc."],
            ["2", "Set camera first", "Frame rate, shutter, profile, ISO/EI, aperture, white balance"],
            ["3", "Build lighting ratio", "Use LIT DUO to measure key side vs shadow side"],
            ["4", "Check color and flicker", "Measure CCT and flicker on LEDs, practicals, projectors, screens"],
            ["5", "Confirm IRE", "Waveform / false color / zebras — skin, shadows, background, highlights"],
            ["6", "Record a test", "10 seconds — focus, exposure, color, audio"],
            ["7", "Log the setup", "Camera settings, LIT DUO readings, IRE, light power/distance, notes"],
          ],
        },
      ],
      tips: [
        "Fast memory: Clean = 1:1–2:1 · Drama = 4:1 · Horror = 8:1+ · Silhouette = 16:1+",
        "Best default: S-Cinetone, 4K 24p, 1/50, manual WB, waveform on, face around 45–60 IRE",
      ],
    },
    {
      id: "lighting-ratios",
      category: "lighting",
      title: "Lighting ratios and stops",
      summary: "Contrast by counting stops — 0 stops = 1:1, each stop doubles the ratio.",
      body: `A lighting ratio tells you how much brighter the lit side is than the shadow side. A stop is a doubling or halving of light.`,
      tables: [
        {
          headers: ["Ratio", "Stop diff", "Shadow side", "Look"],
          rows: [
            ["1:1", "0 stops", "100% of key", "Flat / clean / no shadow"],
            ["2:1", "1 stop", "50% of key", "Natural cinematic"],
            ["4:1", "2 stops", "25% of key", "Dramatic / moody"],
            ["8:1", "3 stops", "12.5% of key", "Horror / thriller"],
            ["16:1", "4 stops", "6.25% of key", "Extreme / silhouette risk"],
          ],
        },
        {
          headers: ["Aperture scale (full stops)"],
          rows: [["f/1.0 → f/1.4 → f/2 → f/2.8 → f/4 → f/5.6 → f/8 → f/11 → f/16"]],
        },
      ],
      tips: [
        "Example: key f/2.8, shadow f/1.4 = 2 stops = 4:1 ratio",
        "Clean = 1 stop or less · Cinematic = 2 stops · Horror = 3 stops · Silhouette = 4+ stops",
      ],
    },
    {
      id: "ire-basics",
      category: "lighting",
      title: "IRE and waveform basics",
      summary: "LIT DUO measures light in the room. IRE measures what the camera records.",
      body: `Use both: meter the scene, then confirm on waveform.`,
      tables: [
        {
          headers: ["IRE range", "Meaning", "Use on set"],
          rows: [
            ["0–5", "Near black / crushed", "Only where detail is not important"],
            ["10–25", "Deep shadows", "Moody backgrounds, shadow side"],
            ["35–55", "Moody skin", "Drama, horror, low-key"],
            ["55–70", "Normal/bright skin", "Clean, beauty, YouTube, interviews"],
            ["75–95", "Highlights, practicals", "Lamps/screens if not clipping detail"],
            ["100+", "Possible clipping", "Avoid on skin and key details"],
          ],
        },
        {
          headers: ["S-Cinetone face", "IRE target"],
          rows: [
            ["Face clean", "50–65"],
            ["Face moody", "40–55"],
            ["Face horror/dark", "30–45"],
            ["Shadow side", "10–25"],
            ["Practical/screen", "70–95"],
          ],
        },
        {
          headers: ["S-Log3 face", "IRE target"],
          rows: [
            ["Face safe", "50–60"],
            ["Face moody", "45–55"],
            ["Shadow detail", "15–30"],
            ["Highlights", "70–90"],
          ],
        },
      ],
      tips: [
        "Log warning: create darkness with ratios and background control — do not starve Log by underexposing everything",
      ],
    },
    {
      id: "litduo-workflow",
      category: "lighting",
      title: "LIT DUO workflow",
      summary: "Lock camera first, then meter key, shadow, background, CCT, flicker, IRE.",
      tables: [
        {
          headers: ["Step", "Action", "Goal"],
          rows: [
            ["1", "Lock camera settings", "fps, shutter, ISO/EI, aperture, profile, WB"],
            ["2", "Meter key side", "Dome toward camera or toward key to isolate"],
            ["3", "Meter shadow side", "Compare stops to key — calculate ratio"],
            ["4", "Meter background", "Walls, curtains, screens, windows, practicals"],
            ["5", "Meter color", "CCT on key, fill, practicals, windows, mixed sources"],
            ["6", "Check flicker", "LEDs, dimmed practicals, projectors, TVs, overheads"],
            ["7", "Confirm IRE", "Waveform, false color, or zebras on camera image"],
          ],
        },
      ],
      body: "For faces, start with key and shadow side, then background. Write readings down so you can recreate the look.",
    },
    {
      id: "look-matrix-1",
      category: "looks",
      title: "Look recipe matrix (part 1)",
      tables: [
        {
          headers: ["Look", "Ratio", "Face IRE (SC / Log)", "WB", "Lighting notes"],
          rows: [
            ["Clean / Natural", "1:1–2:1", "50–65 / 50–60", "4300K–5600K", "Soft key, gentle fill, BG 0–1 stop under"],
            ["Warm Cozy", "2:1–3:1", "45–60 / 48–58", "3200K–4300K", "Warm practicals, soft bounce, amber BG"],
            ["Moody Drama", "4:1", "40–55 / 45–55", "3800K–5000K", "One soft key, negative fill, BG 1–2 stops under"],
            ["Cool / Night", "4:1–8:1", "35–50 / 45–55", "4300K–5600K", "Cool key/moonlight, dark BG, controlled rim"],
          ],
        },
      ],
      body: "SC = S-Cinetone. Starting points — adjust for skin tone, LUT, lens, monitor, and grade.",
    },
    {
      id: "look-matrix-2",
      category: "looks",
      title: "Look recipe matrix (part 2)",
      tables: [
        {
          headers: ["Look", "Ratio", "Face IRE (SC / Log)", "WB", "Lighting notes"],
          rows: [
            ["Horror / Scary", "8:1–16:1", "30–45 / 45–52", "4300K–6500K", "Hard shadows, low fill, practical/screen glow"],
            ["Beauty / Glam", "1:1–2:1", "55–70 / 55–62", "4300K–5600K", "Large soft key, bright eyes, minimal under-eye shadow"],
            ["Silhouette", "16:1+", "Subject 0–15 / BG 50–80", "Varies", "Backlight or bright BG; subject intentionally dark"],
            ["Interview / Corporate", "2:1–4:1", "50–65 / 50–60", "4300K–5600K", "Key, fill, hair light, BG 1 stop under"],
          ],
        },
      ],
      body: "Do not chase darkness by underexposing everything. Keep important skin/detail readable.",
    },
    {
      id: "universal-camera",
      category: "cameras",
      title: "Universal camera rules",
      tables: [
        {
          headers: ["Setting", "Starting point", "Why"],
          rows: [
            ["Frame rate", "24p cinematic · 30p social · 60p slow-mo", "Controls motion feel"],
            ["Shutter", "24p = 1/48 or 1/50 · 30p = 1/60 · 60p = 1/120", "Natural motion blur; test if lights flicker"],
            ["Aperture", "f/1.4–f/2 dreamy · f/2.8–f/4 controlled · f/5.6+ deep", "DoF and exposure; avoid wide open if focus is unreliable"],
            ["White balance", "Manual — avoid AWB on planned scenes", "Consistent color; intentional warm/cool looks"],
            ["ND", "Use outdoors / bright windows", "Keep natural shutter and desired aperture"],
            ["Monitoring", "Waveform + zebras + monitor LUT", "Where skin and highlights really sit"],
          ],
        },
      ],
      tips: ["Best default when unsure: S-Cinetone, 4K 24p, 1/50, manual WB, f/2.8, light face first, check waveform"],
    },
    {
      id: "picture-profiles",
      category: "cameras",
      title: "Picture profile choice",
      tables: [
        {
          headers: ["Profile", "Use when", "Avoid when"],
          rows: [
            ["S-Cinetone", "Good color fast, light grading — YouTube, podcast, interviews", "Maximum grading flexibility or extreme highlight recovery"],
            ["S-Log3 / S-Gamut3.Cine", "Most flexible cinematic grade, proper expose/grade", "Fast turnaround or uncomfortable grading; underexposed Log = noisy"],
            ["Cine EI / Cine EI Quick", "Disciplined exposure, base ISO, LUT monitoring", "Run-and-gun auto-ish shooting or constant ISO changes"],
          ],
        },
      ],
      body: "S-Cinetone for speed. S-Log3/Cine EI when you have time to light, expose, and grade.",
    },
    {
      id: "sony-fx6",
      category: "cameras",
      title: "Sony FX6 — best starting settings",
      summary: "Full-frame cinema cam — internal ND, dual base ISO, XLR audio.",
      body: `The FX6 is your primary A-cam for documentary, interview, and cinematic work. Built-in ND lets you hold shutter and aperture outdoors. Match WB and profile with FX3/FX30 on multi-cam shoots.`,
      tables: [
        {
          headers: ["Use case", "Recommended setup", "Notes"],
          rows: [
            [
              "Interview / corporate",
              "S-Cinetone, 4K 24p/30p, 1/50/1/60, f/2.8–f/4, WB custom to key, internal ND as needed",
              "Soft key 30–45°; face 50–65 IRE; use XLR for lav/boom",
            ],
            [
              "Documentary / run-gun",
              "S-Cinetone, 24/30p, WB preset/custom, Auto ISO only when needed",
              "Prioritize the moment; zebras protect highlights; variable ND for windows",
            ],
            [
              "Cinematic / graded",
              "Cine EI or S-Log3, 4K 24p, 1/48, base ISO 800 (12800 in dark rooms), monitor LUT",
              "Light for ISO 800 when possible; protect shadows in Log",
            ],
            [
              "Low light / night",
              "S-Log3/Cine EI ISO 12800 or S-Cinetone with motivated light",
              "Do not crush face — use ratio + background control, not global underexposure",
            ],
            [
              "Slow motion",
              "4K 60p/120p, shutter 1/120 or 1/240, add light",
              "Faster shutter needs more light",
            ],
            [
              "Multi-cam with FX3/FX30",
              "Same profile, same Kelvin WB, same shutter/FPS, similar exposure",
              "Skin test with gray card before rolling",
            ],
          ],
        },
      ],
      tips: [
        "FX6 quick cheat: S-Cinetone + locked WB for repeatable interview/podcast days",
        "Use internal ND before closing aperture — keeps cinematic shutter at 1/50 on 24p",
      ],
    },
    {
      id: "sony-fx3",
      category: "cameras",
      title: "Sony FX3 — best starting settings",
      tables: [
        {
          headers: ["Use case", "Setup", "Notes"],
          rows: [
            ["Fast cinematic", "S-Cinetone, 4K 24p, 1/48/1/50, 10-bit, WB locked, f/1.8–f/2.8", "Low-light strength; waveform for skin"],
            ["Cinematic grade", "Cine EI or S-Log3, base ISO 800 or 12800, monitor LUT", "800 when you can light; 12800 for dark with control"],
            ["Podcast/interview A-cam", "S-Cinetone, 24p/30p, f/2–f/2.8, WB custom", "Verify focus even with eye AF"],
            ["Slow motion", "4K 60/120p, 1/120/1/240, more light", "—"],
          ],
        },
      ],
    },
    {
      id: "sony-fx30",
      category: "cameras",
      title: "Sony FX30 — best starting settings",
      tables: [
        {
          headers: ["Use case", "Setup", "Notes"],
          rows: [
            ["B-cam to FX3/FX6", "Match profile, WB, shutter, FPS, LUT", "Same Kelvin; APS-C = tighter FOV at same focal length"],
            ["Gimbal / movement", "4K 24/60p, S-Cinetone or S-Log3, f/2.8–f/4", "Easier focus; hallways, kitchens"],
            ["Dark rooms", "Cine EI / S-Log3 base ISO 2500", "Add light for cleaner shadows vs FX3"],
          ],
        },
      ],
      tips: ["APS-C focal length ≈ 1.5× full-frame equivalent (35mm FF ≈ 24mm on FX30)"],
    },
    {
      id: "sony-a7iv",
      category: "cameras",
      title: "Sony a7IV — best starting settings",
      tables: [
        {
          headers: ["Use case", "Setup", "Notes"],
          rows: [
            ["YouTube / interview", "S-Cinetone, 4K 24/30p, 1/50/1/60, WB locked", "Strong third angle; watch heat on long takes"],
            ["Cinematic FF", "S-Log3 or S-Cinetone, 4K 24p, f/1.8–f/2.8", "Expose Log carefully"],
            ["Documentary", "S-Cinetone, WB preset, Auto ISO if needed", "Capture the moment; zebras for highlights"],
          ],
        },
      ],
    },
    {
      id: "matching-cameras",
      category: "cameras",
      title: "Matching FX6 + FX3 + FX30 + a7IV",
      tables: [
        {
          headers: ["Step", "Action", "Why"],
          rows: [
            ["1", "Lock WB — same Kelvin on all bodies", "AWB drifts between cameras"],
            ["2", "Match profile — all S-Cinetone or all S-Log3", "Different contrast and skin rendering"],
            ["3", "Match exposure — LIT DUO then waveform on each", "Lens T-stop and sensor differences"],
            ["4", "Match shutter/FPS", "Mismatched motion blur looks amateur"],
            ["5", "Match lens feel + filtration", "Contrast and highlight bloom differ"],
            ["6", "Shoot a test — skin, chart, background", "Matching reference in post"],
          ],
        },
      ],
    },
    {
      id: "lenses-by-focal-length",
      category: "lenses",
      title: "Lens choice by focal length",
      summary: "What each focal length does — and why you pick it.",
      tables: [
        {
          headers: ["Focal length (FF)", "FX30 APS-C equiv.", "Use for", "Why"],
          rows: [
            [
              "16–24mm",
              "11–16mm",
              "Establishing, small rooms, gimbal, POV tension",
              "Shows environment; distorts faces up close — great for horror hallways",
            ],
            [
              "35mm",
              "23–24mm",
              "Natural cinematic medium shots, home interiors",
              "Versatile ‘human’ perspective; dialogue and walk-and-talk",
            ],
            [
              "50mm",
              "33–35mm",
              "Close-ups, creator shots, emotional beats",
              "Intimate compression without needing huge space",
            ],
            [
              "85mm+",
              "56mm+",
              "Beauty, reactions, subject isolation",
              "Flattens background; needs distance and focus discipline",
            ],
          ],
        },
        {
          headers: ["Aperture", "Look", "Caution"],
          rows: [
            ["f/1.4–f/2", "Dreamy separation, low light", "Focus on eyes; depth is thin"],
            ["f/2.8–f/4", "Controlled narrative, interviews, multi-cam", "Safer focus; still cinematic with good light"],
            ["f/5.6+", "Deep focus, two-shots, run-gun", "Less separation; more forgiving"],
          ],
        },
      ],
    },
    {
      id: "lenses-by-look",
      category: "lenses",
      title: "Lens choice by look and job",
      summary: "Which lens to grab for interview, cinematic, horror, etc.",
      tables: [
        {
          headers: ["Look / job", "Lens", "Aperture", "Why"],
          rows: [
            [
              "Interview / corporate",
              "35–50mm",
              "f/2.8–f/4",
              "Flattering face shape, stable focus, professional separation at desk distance",
            ],
            [
              "Podcast / talking head",
              "35mm or 50mm",
              "f/2–f/2.8",
              "Natural framing at 4–6 ft; shallow enough for BG falloff",
            ],
            [
              "Cinematic drama",
              "35mm masters, 50–85mm CU",
              "f/1.8–f/2.8",
              "Layer coverage: environment vs emotion",
            ],
            [
              "Horror / thriller",
              "24mm wide, 50mm uneasy CU",
              "f/2–f/2.8",
              "Wide = vulnerability; longer CU = claustrophobia",
            ],
            [
              "Beauty / glam",
              "85mm or tight 50mm",
              "f/2–f/2.8",
              "Soft features, creamy BG; watch focus on eyes",
            ],
            [
              "Documentary",
              "24–35mm zoom or prime",
              "f/2.8–f/4",
              "Flexible in tight spaces; safer focus following action",
            ],
            [
              "Establishing / B-roll",
              "16–24mm",
              "f/4–f/5.6",
              "Location and scale; keep faces out of frame edges",
            ],
          ],
        },
      ],
      body: "Pair lens choice with the look recipe ratio and IRE targets in the Looks section.",
    },
    {
      id: "movement-shots",
      category: "movement",
      title: "Camera movement and shot size",
      tables: [
        {
          headers: ["Choice", "Use for", "Why"],
          rows: [
            ["Static tripod", "Interviews, suspense, controlled scenes", "Performance and lighting carry the moment"],
            ["Slow push-in", "Fear, realization, emotional reveal", "Tension increases"],
            ["Handheld", "Panic, documentary, unstable emotion", "Keep intentional"],
            ["Gimbal", "Exploration, stalking, clean b-roll", "Polished — do not overuse"],
            ["Wide + negative space", "Isolation", "Empty space = threat or loneliness"],
            ["Insert shots", "Hands, props, lights, clocks", "Editorial rhythm and detail"],
          ],
        },
      ],
      tips: ["Wide = location · Medium = body language · Close-up = emotion · Insert = story detail"],
    },
    {
      id: "audio-checklist",
      category: "audio",
      title: "Audio and sound design checklist",
      tables: [
        {
          headers: ["Area", "Do this", "Why"],
          rows: [
            ["Dialogue", "Boom or lav; monitor headphones", "Bad audio ruins good footage"],
            ["Room tone", "30 sec per location", "Smooth edits and ambience"],
            ["Noise control", "Kill AC, fridge, fans when possible", "Less hum and hiss"],
            ["Horror sound", "Record thumps, scrapes, footsteps, doors", "Scares often lead in audio"],
            ["Levels", "Clean peaks with headroom", "Distortion is hard to fix"],
          ],
        },
      ],
    },
    {
      id: "continuity-habits",
      category: "audio",
      title: "Continuity and on-set habits",
      tables: [
        {
          headers: ["Area", "Do this", "Why"],
          rows: [
            ["Continuity", "Phone photo of props, wardrobe, lights, camera settings", "Prevents mismatched takes"],
            ["Media", "Two backups before formatting cards", "Protects footage"],
            ["Lighting notes", "Log ratio, IRE, WB, ISO, aperture, power, distance", "Recreate the look later"],
            ["Test clip", "10 sec review before real takes", "Catch problems early"],
            ["3-2-1 backup", "3 copies, 2 media types, 1 off-site", "Risk reduction"],
          ],
        },
      ],
    },
    {
      id: "monitoring-tools",
      category: "lighting",
      title: "Monitoring tools",
      tables: [
        {
          headers: ["Tool", "Tells you", "Best use"],
          rows: [
            ["LIT DUO", "Light level, CCT, flicker, ratios", "Build lighting before record"],
            ["Waveform / IRE", "Brightness in the recorded image", "Place skin, shadows, highlights"],
            ["Zebras", "Clip warning at set level", "Protect skin and highlights"],
            ["False color", "Exposure map on monitor", "Fast skin/shadow read"],
          ],
        },
      ],
      tips: ["Order: LIT DUO → waveform → zebras → your eyes for mood"],
    },
    {
      id: "on-set-camera-card",
      category: "templates",
      title: "On-set camera card (fill per look)",
      body: "Copy into your stage planner note boxes or lighting log.",
      tables: [
        {
          headers: ["Field", "Value"],
          rows: [
            ["Camera", "FX6 / FX3 / FX30 / a7IV"],
            ["Look", "Clean / Warm / Moody / Horror / Interview"],
            ["Profile", "S-Cinetone / S-Log3 / Cine EI"],
            ["Frame / Shutter", "24p 1/50 · 30p 1/60 · 60p 1/120"],
            ["WB / ISO / Aperture", "Custom K · EI/ISO · f/"],
            ["Key / Shadow / Ratio", "LIT DUO readings"],
            ["Face / Shadow / BG IRE", "From waveform"],
            ["Audio / Continuity", "Notes"],
          ],
        },
      ],
    },
    {
      id: "quick-matrix",
      category: "templates",
      title: "One-page quick settings matrix",
      tables: [
        {
          headers: ["Look", "Frame/Shutter", "Profile", "WB", "Aperture", "Note"],
          rows: [
            ["YouTube clean", "24p 1/50", "S-Cinetone", "4300–5600K", "f/2.8–f/4", "Face 50–65 IRE"],
            ["Podcast", "24p 1/50", "S-Cinetone", "Custom", "f/2–f/2.8", "Hair + practicals"],
            ["Interview", "24/30p", "S-Cinetone or Log", "Custom", "f/2.8–f/4", "BG 1–2 stops under"],
            ["Documentary", "24/30p", "S-Cinetone", "Preset", "As needed", "Protect highlights"],
            ["Cinematic", "24p 1/48", "S-Log3 or SC", "Manual", "f/1.8–f/2.8", "4:1 ratio"],
            ["Horror", "24p 1/48", "S-Log3/Cine EI", "Cool/warm", "f/1.4–f/2.8", "8:1–16:1, readable face"],
            ["Warm cozy", "24p", "S-Cinetone", "3200–4300K", "f/2–f/2.8", "Warm practicals"],
          ],
        },
      ],
    },
  ],
};

export function mergeReferenceSections(
  base: ReferenceGuideDocument,
  overrides: ReferenceGuideDocument
): ReferenceGuideDocument {
  const byId = new Map(base.sections.map((s) => [s.id, s]));
  for (const section of overrides.sections) {
    byId.set(section.id, section);
  }
  return {
    ...base,
    ...overrides,
    sections: Array.from(byId.values()),
  };
}
