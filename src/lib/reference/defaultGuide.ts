import { ReferenceGuideDocument } from "@/lib/reference/types";

/** Baseline on-set reference — seeded from Master Filmmaking Reference Guide + FX6 + lens expansion. */
export const DEFAULT_REFERENCE_GUIDE: ReferenceGuideDocument = {
  version: 1,
  title: "ShootSpine production reference",
  subtitle:
    "Lighting, cameras, lenses, scripts & writing, and on-set workflow — iPad-friendly reference for ShootSpine crews.",
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
    {
      id: "screenplay-overview",
      category: "screenplay",
      title: "Why screenplay format matters",
      summary: "Format is a shared language for story and production — not decoration.",
      body: `A screenplay is not a novel or essay. It is an instruction document for making a motion picture. Your text must read consistently for producers, directors, editors, cinematographers, and actors.

Format serves two goals at once:
• Storytelling — pace, tone, and emotion on the page
• Logistics — scheduling, budgeting, locations, and department handoffs

Industry conventions — spacing, caps, indentation, and element types — communicate time, place, and emphasis efficiently. They are not arbitrary; they keep hundreds of collaborators aligned.

The production document
Every department reads structure differently. ADs build schedules from slug lines. Art identifies locations from headings. Editors estimate pacing from page count. Bad format creates misreads: indoor vs outdoor, continuous vs time jump, off-screen vs voiceover.

The reader’s perspective
Development readers scan hundreds of scripts. Misaligned dialogue, lowercase slug lines, and random transitions signal inexperience. Professional format disappears — the reader focuses on story.

Format and rhythm
White space controls tempo. Short action blocks feel like quick cuts. Long blocks slow the read. Treat the page like a score: layout tells others how to perform the story.

The page-minute rule
Rough guide: one formatted page ≈ one minute of screen time. A 100-page script targets ~100 minutes. ShootSpine Preview and PDF export follow this spacing model.`,
      tables: [
        {
          headers: ["Element", "Left", "Right", "Font", "Spacing"],
          rows: [
            ["Action", "1.5\"", "1.0\"", "Courier 12 pt", "Single"],
            ["Dialogue", "2.5\"", "2.0\"", "Courier 12 pt", "Single"],
            ["Parenthetical", "3.1\"", "2.5\"", "Courier 12 pt", "Single"],
            ["Transition", "5.5\"", "1.0\"", "Courier 12 pt", "Single"],
          ],
        },
        {
          headers: ["Page setup", "Value"],
          rows: [
            ["Paper", "US Letter 8.5 × 11 in"],
            ["Top / bottom margin", "1.0 in"],
            ["Lines per page (approx.)", "~55 including blank lines"],
            ["Page numbers", "Top-right from page 2"],
          ],
        },
      ],
      tips: [
        "Courier (or Courier Prime) stays standard because monospaced characters keep timing predictable",
        "ShootSpine Script Writer uses structured elements — preview before export",
      ],
    },
    {
      id: "screenplay-page-anatomy",
      category: "screenplay",
      title: "Anatomy of a screenplay page",
      summary: "How elements stack so the eye knows where it is in a scene.",
      body: `Core components on every page:

1. Scene heading (slug line) — where and when
2. Action lines — visible and audible events, present tense
3. Character cue — who speaks
4. Parenthetical — brief delivery note (optional)
5. Dialogue — spoken lines
6. Transition — editorial scene change (use sparingly)

Visual hierarchy:
• Scene headings — ALL CAPS, flush left
• Action — flush left, full width between margins
• Character — centered over the dialogue column
• Dialogue — narrow column under the character
• Transitions — ALL CAPS, flush right

White space and eye flow
A professional page breathes. Alternate short and long action blocks. Scatter dialogue. Avoid unbroken walls of text — the script should feel like it moves.

Common technical errors:
• Wrong font (use Courier 12 pt only)
• Justified text (left-align only)
• Slug line buried mid-paragraph (always its own line)
• Lowercase slug lines, character names, or transitions
• Widows/orphans — lone words stranded at page breaks

Professional consistency
Even spacing between dialogue blocks, uniform indentation, and stable slug naming signal competence before anyone reads a single line of story.`,
      tips: [
        "Print one page and view it from arm’s length — it should resemble a produced script",
        "Script Writer Preview shows the same hierarchy as PDF export",
      ],
    },
    {
      id: "screenplay-elements",
      category: "screenplay",
      title: "Element types at a glance",
      summary: "What each block means and when to use it.",
      tables: [
        {
          headers: ["Element", "Purpose", "Format"],
          rows: [
            ["Scene heading", "Location and time", "ALL CAPS — INT./EXT. PLACE - TIME"],
            ["Action", "What we see and hear", "Present tense, visual, left-aligned"],
            ["Character", "Speaker", "ALL CAPS, centered over dialogue"],
            ["Parenthetical", "Brief acting direction", "Lowercase in (parentheses)"],
            ["Dialogue", "Spoken lines", "Narrow column — no quotation marks"],
            ["Transition", "Scene change", "ALL CAPS, right-aligned"],
            ["Shot", "Key visual beat", "ALL CAPS — CLOSE ON:, INSERT:, POV:"],
            ["Note", "Production note", "Hidden from export unless enabled"],
          ],
        },
        {
          headers: ["Element", "Left margin", "Right margin", "Notes"],
          rows: [
            ["Scene heading", "1.5\"", "1.0\"", "ALL CAPS, flush left"],
            ["Action", "1.5\"", "1.0\"", "Single-spaced"],
            ["Character cue", "Centered", "—", "Over dialogue column (~3.7\" from left)"],
            ["Dialogue", "2.5\"", "2.0\"", "Indented block"],
            ["Parenthetical", "3.1\"", "2.5\"", "Optional, brief"],
            ["Transition", "5.5\"", "1.0\"", "Flush right"],
          ],
        },
      ],
      body: "In Script Writer Edit mode, pick the element type from the dropdown or use Tab / Cmd+Ctrl+1–7 shortcuts.",
    },
    {
      id: "screenplay-scene-headings",
      category: "screenplay",
      title: "Scene headings and locations",
      summary: "Slug lines tell the crew where to be and when to light.",
      body: `Standard slug format:

INT./EXT. LOCATION - TIME

Examples (ShootSpine sample locations):
INT. WAREHOUSE STUDIO - DAY
EXT. LOADING DOCK - NIGHT
INT./EXT. PRODUCTION VAN - MOVING - DAY

Interior / exterior cues:
• INT. — interior
• EXT. — exterior
• INT./EXT. — action crosses inside and outside (car, doorway, porch)

Time of day — use one standard label:
DAY · NIGHT · DAWN · DUSK · LATER · CONTINUOUS · SAME

Avoid clock labels like AFTERNOON or MID-MORNING. Crews schedule by daylight buckets, not exact hours.

Secondary headings (mini-slugs)
Within one location, mark small moves without a full slug:

AT THE MONITOR - Marcus checks exposure.
BACK TO SET - Elena resets tape marks.

Each new slug line means a location or time change. Too many fragment flow; too few confuse the reader.

Flashbacks and dream sequences

FLASHBACK
INT. CLASSROOM - DAY
...
END FLASHBACK

Or: FLASHBACK - INT. CLASSROOM - DAY

DREAM SEQUENCE - EXT. COASTLINE - NIGHT
...
END DREAM SEQUENCE

Continuity
Name locations consistently. If scene one is EXT. BEACON WAREHOUSE - DAY, do not later call the same place EXT. PARKING LOT without reason.

Production scene numbers
Spec scripts omit scene numbers. Production drafts add sequential numbers in the margin — writers leave numbering to production.`,
      tips: [
        "Checklist: ALL CAPS slugs · logical time words · consistent place names · hyphens only (no extra punctuation)",
        "Lines starting with INT., EXT., or EST. auto-detect as scene headings in Script Writer",
      ],
    },
    {
      id: "screenplay-action",
      category: "screenplay",
      title: "Action and scene description",
      summary: "Show what the camera can see and the audience can hear — nothing else.",
      body: `Action lines are the narrative backbone. They are not prose fiction: no internal thoughts, backstory dumps, or abstract commentary unless spoken or shown.

Four principles of visual writing:
1. Show, don’t tell — not “She feels betrayed,” but “Her jaw tightens; she looks away.”
2. Present tense — “He walks,” not “He was walking.”
3. Economy — every sentence earns its place
4. Clarity before poetry — vivid but precise

Mechanics
Keep blocks to one–five lines. Each block = one visual moment or shift.

INT. HOTEL ROOM - NIGHT

Curtains billow from an open balcony door. A half-empty water glass sweats on the table.

NORA lies awake, staring at the ceiling fan.

Pacing through paragraphs
Paragraph breaks act like edits.

Fast:
DEV bolts for the loading dock. The door slams. Silence.

Slow:
DEV pauses at the door, hand on the knob. He listens. Nothing. Then he turns it.

Avoid camera directions in spec scripts
Terms like “close-up,” “pan,” and “angle on” belong in shooting scripts. Imply the shot through pacing instead.

Instead of: CLOSE ON THE CLOCK as it strikes midnight.
Write: The clock strikes midnight.

Visual emphasis
Isolate a line for impact — sparingly:

The slate clacks shut.

Sound in action
Minor effects in CAPS inside action:

The WALKIE CRACKLES — sharp, insistent.

Montages
Single-location:

MONTAGE - REESE PREPS GEAR
- Reese checks batteries
- Reese labels cards
- Reese tests lav mics
END MONTAGE

Multi-location:

MONTAGE - CITY WAKES FOR SHOOT DAY
EXT. STUDIO LOT - DAWN - Trucks roll in.
INT. CRAFT SERVICES - Coffee brews.
EXT. LOADING DOCK - Crew unloads cases.
END MONTAGE

Alternate labels: SERIES OF SHOTS or SEQUENCE when appropriate.

Voice consistency
Keep a neutral but evocative tone throughout. Do not swing between literary flourish and telegraphic fragments page to page.`,
      tips: [
        "Press Enter after a scene heading → new action block in Script Writer",
        "Action tightening exercise: cut interior monologue — replace with a gesture or prop beat",
      ],
    },
    {
      id: "screenplay-characters-dialogue",
      category: "screenplay",
      title: "Characters and dialogue",
      summary: "Names, speech, extensions, and rhythm on the page.",
      body: `Introducing characters
First appearance: name in ALL CAPS plus a short active description.

REESE, early 30s, sound mixer, methodical, swaps a dead battery without looking up.

Two lines max. Save biography for story, not the intro block.

Name consistency
Spell names identically every time. Similar names (Sam / Simon) confuse readers — rename one.

Dialogue layout
Character centered over a narrow dialogue column (~2.5\" left, ~2.0\" right). Standard capitalization — not ALL CAPS in dialogue itself.

                    NORA
    I said I'd call, didn't I?

Parentheticals
Optional cue under the character name, before dialogue:

                    NORA
        (quietly)
    I said I'd call, didn't I?

Use sparingly — overuse suggests you do not trust the actor or director.

Extensions
Clarify off-screen, voiceover, or continued speech:

MARCUS (V.O.)
Never thought I'd say this on a corporate shoot.

ELENA (O.S.)
Say what?

MARCUS (CONT'D)
That I missed the quiet days.

O.S. vs V.O.
• O.S. — speaker is in the scene but not on screen (another room, behind camera)
• V.O. — narration or voice not physically present (memory, phone message, omniscient narrator)

Subtext and brevity
Cut filler: “Well,” “You know,” “I mean.” One parenthetical when tone shifts — not after every line.

Dual dialogue (simultaneous speech):

PRIYA          SAM
Don't!           You first!

Interruption — em dash:

DEV
I just think we should—

NORA
Don't start again.

Dialogue rhythm
Most speeches under four lines. Heavy dialogue blocks slow the read. White space = pace.

Reappearance after many pages
Subtle re-intro:

REESE, the mixer from the warehouse shoot, now wears a studio lanyard.

Accent and dialect
Note accent once in description. Do not phonetic-spell dialect — write natural cadence instead.`,
      tables: [
        {
          headers: ["Extension", "Meaning", "Example use"],
          rows: [
            ["(V.O.)", "Voiceover / non-present voice", "Narration, phone message"],
            ["(O.S.)", "Off-screen in scene", "Character in next room"],
            ["(CONT'D)", "Same speaker after action", "Dialogue resumes after beat"],
          ],
        },
      ],
      tips: [
        "Exercise: write one line per character expressing the same idea — voices should sound distinct",
        "Cmd/Ctrl+3 character · Cmd/Ctrl+4 dialogue · Cmd/Ctrl+5 parenthetical in Script Writer",
      ],
    },
    {
      id: "screenplay-transitions-flow",
      category: "screenplay",
      title: "Transitions and scene flow",
      summary: "Editorial cues — use when the cut itself carries meaning.",
      body: `Transitions are production/editorial instructions. In modern spec scripts they are sparse — white space between scenes often implies CUT TO:.

Placement: ALL CAPS, flush right.

                                                        CUT TO:

Common transitions:

                                                        DISSOLVE TO:
                                                        SMASH CUT TO:
                                                        MATCH CUT TO:
                                                        FADE IN:
                                                        FADE OUT.
                                                        FADE TO BLACK.

When to use:
• Major act breaks or tone shifts
• Deliberate time passage (dissolve)
• Shock contrast (smash cut)
• Opening (FADE IN:) and closing (FADE OUT.)

FADE IN: typically top-left on page one. FADE OUT. ends the script.

Time jumps without a full slug:

LATER

Nora stares at the same monitor. The coffee is cold.

Rhythm without transitions
Skilled writers cut with slug cadence alone:

INT. WAREHOUSE STUDIO - DAY

Elena opens a equipment case.

EXT. LOADING DOCK - DAY

Marcus checks lens cases alone.

No CUT TO: required — the reader feels the edit.

Scene endings
End on an image, sound, or question that pulls the next scene forward.

Wrong vs right:
❌ CUT TO: after every scene — redundant noise
✅ Transitions only when rhythm or impact needs a label`,
      tables: [
        {
          headers: ["Transition", "Typical purpose"],
          rows: [
            ["CUT TO:", "Standard scene change"],
            ["DISSOLVE TO:", "Time passage or soft link"],
            ["SMASH CUT TO:", "Abrupt contrast or shock"],
            ["MATCH CUT TO:", "Visual echo between scenes"],
            ["FADE IN: / FADE OUT.", "Open and close the script"],
            ["FADE TO BLACK.", "Emotional closure"],
          ],
        },
      ],
      tips: [
        "Press Enter after a transition → new scene heading in Script Writer",
        "Think like an editor: what image connects these two moments?",
      ],
    },
    {
      id: "screenplay-shots",
      category: "screenplay",
      title: "Shots and visual beats",
      summary: "Optional emphasis lines — use when the visual is story-critical.",
      body: `Shot lines mark important visual moments. ALL CAPS, left-aligned (ShootSpine supports these as a distinct element):

CLOSE ON: Clapperboard slate
INSERT - RECORDER LEVEL METERS
POV: Through camera monitor
ANGLE ON: Tape mark on floor
WIDE SHOT: Empty warehouse set

In spec scripts, prefer strong action over camera vocabulary. Use shot elements when the exact visual is essential to story or production handoff — product insert, evidence detail, POV gag.

Lines starting with CLOSE ON:, INSERT, POV:, or ANGLE ON: auto-detect as shots in Script Writer.`,
      tips: [
        "Generated scripts can map suggested shots to shot lists and storyboards in ShootSpine",
        "Cmd/Ctrl+7 inserts a shot element",
      ],
    },
    {
      id: "screenplay-television",
      category: "screenplay",
      title: "Television and streaming format",
      summary: "Act structure, teasers, tags, and multi-cam differences.",
      body: `Television divides story into acts — commercial breaks or streaming beats with the same rhythm.

Common script types:

Half-hour single-cam — film-style, one column, ~28–35 pages
Half-hour multi-cam — stage-style, double-spaced dialogue, ~45–52 pages
One-hour drama — numbered acts, ~52–60 pages
Limited / streaming — hybrid; flexible page count

TV-specific elements:
• Teaser / cold open — hook before titles
• Acts — usually four to six labeled blocks
• Tag — closing beat after the final act

Act formatting — centered, caps, often new page per act:

ACT ONE

INT. PRECINCT - NIGHT
...

END OF ACT ONE

Multi-cam note: action may appear as stage directions above dialogue, caps, double-spaced speeches. Example:

INT. LIVING ROOM - DAY

(PRIYA ENTERS WITH GEAR CASES)

PRIYA
Did anyone charge the wireless kit?

Scene numbers appear in production drafts only — omit in specs.

Streaming platforms dropped fixed ad breaks, but act rhythm remains: aim for a strong turn every 10–15 pages even when acts are unlabeled.`,
      tables: [
        {
          headers: ["Medium", "Approx. pages", "Runtime", "Notes"],
          rows: [
            ["Feature film", "90–120", "90–120 min", "Standard feature"],
            ["Half-hour TV", "28–35", "22–25 min", "Single-cam"],
            ["Hour drama", "52–60", "44–48 min", "Five-act common"],
            ["Short film", "1–40", "1–40 min", "Flexible"],
            ["Web series", "5–20", "5–20 min", "Hybrid format"],
          ],
        },
      ],
      tips: [
        "Checklist: acts labeled · slugs consistent · teaser/tag purposeful · no scene numbers in spec drafts",
      ],
    },
    {
      id: "screenplay-polish",
      category: "screenplay",
      title: "Polish, title page, and submission",
      summary: "Presentation signals professionalism before page one of story.",
      body: `Title page — centered, Courier 12 pt:

BEACON AUDIO LAUNCH
by
Your Name
email · phone (optional)

No page number, header, or watermark on the title page.

Proofing pass:
1. Grammar and punctuation
2. Read aloud for rhythm
3. Spacing and indentation
4. Consistent character names and slug lines

Page numbers start on page 2, upper-right. No running header required.

Revision colors (production only): blue, pink, yellow, green, etc. Spec submissions use white pages only.

PDF submission:
• PDF only · Courier embedded · under ~2 MB when possible
• Filename: Title_Author_Year.pdf
• No passwords or tracking links

Email etiquette — brief and respectful:

Attached is my screenplay [Title] for your consideration. Thank you for your time.

Register copyright with your national office; WGA registration adds a dated record where applicable.

Before sending, export from Script Writer Preview and open on phone or tablet — layout should hold without horizontal scroll.`,
      tips: [
        "Common mistakes: mixed fonts · lowercase slugs · camera directions · long unbroken action · overused ellipses",
        "Presentation builds trust in the first three seconds of reading",
      ],
    },
    {
      id: "screenplay-workflow",
      category: "screenplay",
      title: "Modern writing workflow",
      summary: "Tools, versions, collaboration, and ShootSpine Script Writer.",
      body: `Industry tools: Final Draft (FDX), Fade In, WriterDuet, Highland (Fountain). Each preserves standard margins on export.

File hygiene:

/Projects
  /BeaconAudioLaunch
    Draft_01
    Draft_02
    Notes

Date-stamp exports: Title_v06_2026-06-30.pdf

Collaboration: track notes in comments or side documents — not inline in the script body. Label drafts by purpose: v03_submission, v04_network_notes.

ShootSpine Script Writer:
• Structured elements with live preview and PDF export
• AI draft → editable blocks → production handoff
• Scene headings feed locations; characters feed cast; action feeds props and shot suggestions

Script security: share only with trusted contacts or under NDA. Do not post unreleased scripts on public forums.

AI assistance: use for proofing, layout checks, and outline expansion — creative authorship stays human. Review every generated line before client or studio delivery.

When notes arrive, separate craft issues from taste. If multiple readers flag the same problem, fix it; otherwise protect your voice.`,
      tips: [
        "Workflow checklist: recognized export · version control · clean PDF · IP protected · notes handled professionally",
        "Tab cycles element types · Shift+Tab cycles backward in the editor",
      ],
    },
    {
      id: "screenplay-glossary-checklists",
      category: "screenplay",
      title: "Glossary, mistakes, and checklists",
      summary: "Quick reference for terms, fixes, and pre-export QA.",
      tables: [
        {
          headers: ["Term", "Definition"],
          rows: [
            ["ACT", "Major story division, especially in TV"],
            ["ACTION", "Present-tense description of visible events"],
            ["BEAT", "Smallest rhythm unit — pause or shift"],
            ["COLD OPEN", "Scene before title sequence"],
            ["CONT'D", "Same character continues after interruption"],
            ["CUT TO:", "Standard scene-change transition"],
            ["DUAL DIALOGUE", "Two speakers simultaneous, side by side"],
            ["FADE IN: / FADE OUT.", "Script open and close"],
            ["FLASHBACK", "Scene in an earlier time"],
            ["INTERCUT", "Alternating between simultaneous locations"],
            ["MONTAGE", "Compressed series of related shots"],
            ["O.S.", "Off-screen dialogue"],
            ["PARENTHETICAL", "Brief delivery note under character"],
            ["SPEC SCRIPT", "Uncommissioned script written on spec"],
            ["SUPER:", "On-screen text (title cards, locations)"],
            ["V.O.", "Voiceover"],
          ],
        },
        {
          headers: ["Mistake", "Why it hurts", "Fix"],
          rows: [
            ["Over-describing action", "Slows pace", "Filmable visuals only"],
            ["Long dialogue blocks", "Feels stagey", "Trim or break into beats"],
            ["Bad slug lines", "Location confusion", "INT./EXT. + PLACE + TIME"],
            ["Transition spam", "Distracting", "Omit unless necessary"],
            ["Non-Courier font", "Timing skew", "Courier 12 pt throughout"],
            ["Camera directions", "Director’s domain", "Imply through action"],
            ["Passive voice", "Weak read", "Present active verbs"],
          ],
        },
        {
          headers: ["Formatting checklist", "Pre-submission checklist"],
          rows: [
            ["☑ Courier 12 pt", "☑ Spelling and grammar"],
            ["☑ 1.5\" / 1\" margins", "☑ Consistent names and slugs"],
            ["☑ Slugs ALL CAPS", "☑ Logical scene order"],
            ["☑ Dialogue centered column", "☑ Clean title page"],
            ["☑ Transitions flush right", "☑ Page numbers from page 2"],
            ["☑ Brief parentheticals", "☑ PDF under ~2 MB"],
            ["☑ No camera directions", "☑ Polite cover email"],
          ],
        },
      ],
      body: `Evolving standards: streaming blurs film and TV — stay format-bilingual. Stylization (bold SUPER text, stacked staccato lines) is fine when readability stays intact.

Global notes: UK BBC scripts sometimes use underlined slugs and scene numbers; US layout is the ShootSpine default. Fountain and Markdown-based open formats remain useful for version control.

Read one produced script weekly — spacing and dialogue density vary by genre. Format is discipline and respect for collaborators, not a substitute for story.`,
      tips: [
        "Self-check: purpose of Courier? ~55 lines per page? O.S. vs V.O.? When to transition?",
        "Strong story with weak format gets rejected; weak story with perfect format still fails — aim for both",
      ],
    },
    {
      id: "screenplay-examples",
      category: "screenplay",
      title: "Additional sample pages",
      summary: "Feature opening, TV act break, and montage — original ShootSpine examples.",
      body: `Feature opening:

FADE IN:

EXT. STUDIO LOT - DAY

Heat shimmers off asphalt. A production van idles. MARCUS steps out, call sheet in hand.

                    MARCUS
    Not today.

He crosses toward the warehouse — five missed calls from "NORA" on his phone. He silences it.

                                                        CUT TO:

Television act break:

ACT TWO

INT. PRECINCT - NIGHT

Detectives argue over a whiteboard. Red string crosses photos.

                    CAPTAIN
    We're out of time.

                    DETECTIVE
    Then we change the rules.

END OF ACT TWO

Montage:

MONTAGE - CREW PREP FOR SHOOT DAY
- Elena marks floor tape
- Marcus white-balances under LED panels
- Reese routes lav cables
- The director nods once — enough
END MONTAGE`,
      tips: [
        "All sample names and locations are original ShootSpine reference copy",
        "Copy structure, not these story beats, into your own projects",
      ],
    },
    {
      id: "screenplay-example",
      category: "screenplay",
      title: "ShootSpine sample page",
      summary: "Original example showing how a formatted page should look in Script Writer.",
      body: `FADE IN:

INT. WAREHOUSE STUDIO - DAY

Haze catches the morning light. A small crew builds a simple interview set.

ELENA, 40s, producer, lays tape on the floor. MARCUS, 30s, DP, checks framing on a monitor.

                    ELENA
    Talk me through the first setup.

                    MARCUS
        (into coms)
    Mark is set. Give me ten seconds for focus.

INSERT - CLAPPERBOARD: BEACON AUDIO / SCENE 3

                    ELENA
    Rolling.

                                                        CUT TO:`,
      tips: [
        "Sample scene is original ShootSpine reference copy — use your own project names in real scripts",
        "This layout is what Script Writer Preview and PDF export target",
      ],
    },
    {
      id: "screenplay-script-writer",
      category: "screenplay",
      title: "Script Writer shortcuts",
      summary: "Keyboard flow in the ShootSpine screenplay editor.",
      tables: [
        {
          headers: ["From", "Enter creates", "Shortcut"],
          rows: [
            ["Scene heading", "Action", "Cmd/Ctrl+1"],
            ["Action", "Action", "Cmd/Ctrl+2"],
            ["Character", "Dialogue", "Cmd/Ctrl+3"],
            ["Dialogue", "Action", "Cmd/Ctrl+4"],
            ["Parenthetical", "Dialogue", "Cmd/Ctrl+5"],
            ["Transition", "Scene heading", "Cmd/Ctrl+6"],
            ["Shot", "Action", "Cmd/Ctrl+7"],
          ],
        },
      ],
      body: `Tab cycles element type forward · Shift+Tab cycles backward.

Generated scripts feed production: scene headings → locations, characters → cast, action → props, suggested shots → shot list and storyboard.

Practice exercises (on your own draft):
• Action tightening — replace internal thought with a gesture (two lines max)
• Dialogue compression — cut filler from a speech
• Slug practice — three headings for one location at different times
• Rhythm — break a monologue with line breaks and watch page pace change`,
    },
  ],
};

export function mergeReferenceSections(
  base: ReferenceGuideDocument,
  overrides: ReferenceGuideDocument
): ReferenceGuideDocument {
  const overrideById = new Map(overrides.sections.map((s) => [s.id, s]));
  const sections: ReferenceGuideDocument["sections"] = [];

  for (const section of base.sections) {
    sections.push(overrideById.get(section.id) ?? section);
    overrideById.delete(section.id);
  }

  for (const section of overrides.sections) {
    if (overrideById.has(section.id)) {
      sections.push(section);
    }
  }

  return {
    ...base,
    ...overrides,
    title: overrides.title?.trim() || base.title,
    subtitle: base.subtitle,
    sections,
  };
}
