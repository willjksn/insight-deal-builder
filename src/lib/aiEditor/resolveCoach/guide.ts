import type { ResolveCoachSection } from "@/lib/aiEditor/resolveCoach/types";

/**
 * Local DaVinci Resolve coach — beginner → advanced across every bottom page.
 * Keep steps concrete (menu names, shortcuts). Expand over time; matcher uses keywords.
 */
export const RESOLVE_COACH_SECTIONS: ResolveCoachSection[] = [
  // ── Project / ShootSpine ─────────────────────────────────────────────
  {
    id: "project-create-open",
    page: "project",
    level: "beginner",
    title: "Create or open a Resolve project",
    summary: "Start a project that matches your ShootSpine name so media paths stay clear.",
    keywords: [
      "create project",
      "new project",
      "open project",
      "project manager",
      "start resolve",
    ],
    steps: [
      "Open DaVinci Resolve.",
      "In Project Manager, click New Project (or double‑click an existing one).",
      "Name it exactly like your ShootSpine project (use Copy name in ShootSpine).",
      "Open the project — you should see the bottom page icons (Media, Cut, Edit…).",
    ],
    body: [
      {
        heading: "Why the name matters",
        paragraphs: [
          "ShootSpine can bring your first cut into the project that is currently open. Using the same name as ShootSpine keeps folders and handoffs easy to find later.",
        ],
        tips: [
          "Studio users: Preferences → System → General → External scripting using → Local, then restart Resolve, so ShootSpine can auto-import.",
        ],
      },
    ],
    relatedIds: ["project-shootspine-bring", "media-import-clips"],
  },
  {
    id: "project-shootspine-bring",
    page: "project",
    level: "beginner",
    title: "Bring a ShootSpine first cut into Resolve",
    summary: "How ShootSpine’s edit lands in Resolve (auto-import or manual).",
    keywords: [
      "bring edit",
      "import edl",
      "shootspine",
      "first cut",
      "rough cut",
      "handoff",
      "import timeline",
      "media offline",
    ],
    steps: [
      "In ShootSpine: build a first cut, then Finish in DaVinci Resolve → On this computer.",
      "Open Resolve with your project open (Edit page visible).",
      "Press Bring edit into Resolve (Studio + scripting Local).",
      "Or manually: import clips from 01_ORIGINAL_MEDIA, then File → Import → Timeline → shootspine_rough_cut.edl (or .xml).",
    ],
    body: [
      {
        heading: "If clips are red / Media Offline",
        bullets: [
          "Confirm files exist under your project’s 01_ORIGINAL_MEDIA (often CAMERA_A, not FX3).",
          "Right‑click offline clip → Relink selected clips / Relink clips to folder.",
          "Re-run Bring edit into Resolve after ShootSpine updates the handoff.",
        ],
      },
      {
        heading: "What ShootSpine does not bake",
        paragraphs: [
          "Look notes and moods stay as guidance (LOOKS.txt). Color, sound, and titles are finished in Resolve — that is intentional.",
        ],
      },
    ],
    relatedIds: ["edit-transitions", "color-first-pass", "deliver-youtube"],
  },
  {
    id: "project-settings-timeline",
    page: "project",
    level: "intermediate",
    title: "Project and timeline settings (FPS, resolution)",
    summary: "Match timeline frame rate and resolution to your FX3 / delivery target.",
    keywords: [
      "frame rate",
      "fps",
      "timeline settings",
      "resolution",
      "24fps",
      "project settings",
      "timecode",
    ],
    steps: [
      "File → Project Settings (gear on bottom right, or Ctrl/Cmd+, depending on version).",
      "Master Settings: set Timeline resolution (e.g. 1920×1080 or 3840×2160).",
      "Set Timeline frame rate to match your footage (often 23.976 or 24 for cinema).",
      "Color Management: start with DaVinci YRGB unless you already use ACES.",
    ],
    body: [
      {
        tips: [
          "Changing frame rate after editing can shift sync — set it before a long grade.",
          "Sony FX3 often records with camera Start TC; ShootSpine aligns EDL source TC when possible.",
        ],
      },
    ],
    relatedIds: ["media-proxies", "color-managed"],
  },
  {
    id: "project-backup-archive",
    page: "project",
    level: "advanced",
    title: "Project backups and database awareness",
    summary: "Don’t lose work — local project libraries and export .drp backups.",
    keywords: ["backup", "database", "drp", "project library", "archive project"],
    steps: [
      "Periodically: File → Export Project → save a .drp next to your media.",
      "Know whether you use a local or network project library (Project Manager).",
      "Keep camera originals on your edit drive; don’t rely only on the Resolve cache.",
    ],
    body: [
      {
        paragraphs: [
          "Resolve stores timelines in its database; media stays on disk. Back up both the project (.drp or library) and the media folder ShootSpine created.",
        ],
      },
    ],
  },

  // ── Media ───────────────────────────────────────────────────────────
  {
    id: "media-import-clips",
    page: "media",
    level: "beginner",
    title: "Import video and stills (Media page)",
    summary: "Get camera clips and photos into the Media Pool.",
    keywords: [
      "import media",
      "media pool",
      "import clips",
      "photo",
      "photos",
      "stills",
      "jpeg",
      "raw photo",
      "media page",
    ],
    steps: [
      "Click Media at the bottom of Resolve.",
      "In the library browser, go to your project folder → 01_ORIGINAL_MEDIA.",
      "Select clips (and any stills/photos) → right‑click → Add Folder into Media Pool (or drag in).",
      "Organize into bins (e.g. CAMERA_A, Stills) with the Media Pool folder icons.",
    ],
    body: [
      {
        heading: "Photos / stills",
        paragraphs: [
          "Resolve’s bottom bar doesn’t have a separate Photo page — stills live on the Media page, then you can edit them on the Edit timeline or grade on Color like video.",
        ],
        bullets: [
          "JPEG/PNG/TIFF stills import like clips; set still duration in Project Settings if needed.",
          "Camera RAW photos may need conversion or a supported format depending on your Resolve version.",
        ],
      },
    ],
    relatedIds: ["media-bins", "edit-put-on-timeline"],
  },
  {
    id: "media-bins",
    page: "media",
    level: "beginner",
    title: "Bins, smart bins, and ShootSpine bin",
    summary: "Keep the Media Pool tidy so Edit/Color stay fast.",
    keywords: ["bin", "bins", "smart bin", "folders", "organize media"],
    steps: [
      "Media Pool → right‑click empty area → New Bin.",
      "Drag clips into bins by camera, day, or scene.",
      "After ShootSpine import, look for a bin named ShootSpine with linked clips.",
    ],
    body: [
      {
        tips: ["Use colors/flags on clips (right‑click) for selects before you cut."],
      },
    ],
  },
  {
    id: "media-proxies",
    page: "media",
    level: "intermediate",
    title: "Proxies and optimized media",
    summary: "Smooth playback for heavy FX3 / XAVC files.",
    keywords: [
      "proxy",
      "proxies",
      "optimized media",
      "playback",
      "stutter",
      "generate proxy",
      "cache",
    ],
    steps: [
      "Select heavy clips in Media Pool.",
      "Right‑click → Generate Proxy Media (or use Proxy mode toggle on the viewer).",
      "Playback → Proxy Mode → Half or Quarter Resolution while editing.",
      "Deliver using original/optimized media (uncheck proxy if your workflow requires originals).",
    ],
    body: [
      {
        paragraphs: [
          "ShootSpine may create browser proxies under .shootspine-proxies — those are for the web app preview, not for Resolve. In Resolve, generate Resolve proxies or use Optimized Media.",
        ],
      },
    ],
    relatedIds: ["cut-fast-assembly", "deliver-youtube"],
  },
  {
    id: "media-relink-offline",
    page: "media",
    level: "intermediate",
    title: "Relink offline / Media Offline clips",
    summary: "Fix red clips when drives move or folders rename.",
    keywords: [
      "media offline",
      "relink",
      "offline",
      "red clip",
      "missing media",
      "reconnect",
    ],
    steps: [
      "Right‑click an offline clip in Media Pool or timeline → Relink Selected Clips.",
      "Point to the folder that contains the matching filenames (e.g. CAMERA_A).",
      "Or: File → Relink clips / Change source folder for a whole bin.",
    ],
    body: [
      {
        tips: [
          "After renaming a ShootSpine project folder on disk, update paths or re-bring the edit.",
        ],
      },
    ],
  },
  {
    id: "media-metadata-tc",
    page: "media",
    level: "advanced",
    title: "Timecode, reel names, and metadata",
    summary: "Why FX3 source TC matters for EDL/XML links.",
    keywords: ["timecode", "reel", "metadata", "start tc", "source tc", "camera tc"],
    steps: [
      "Select a clip → check Start TC in the Metadata / Clip Attributes panel.",
      "Prefer keeping camera TC when conforming ShootSpine EDLs.",
      "Only force Start TC to 00:00:00:00 if your entire timeline is file-relative.",
    ],
    body: [
      {
        paragraphs: [
          "Sony clips often store Start TC on a metadata/timecode track. ShootSpine aligns EDL events to that when writing the handoff so Resolve can link correctly.",
        ],
      },
    ],
  },

  // ── Cut ─────────────────────────────────────────────────────────────
  {
    id: "cut-overview",
    page: "cut",
    level: "beginner",
    title: "Cut page overview",
    summary: "Fast assembly page — source tape + timeline for quick selects.",
    keywords: ["cut page", "cut tab", "source tape", "assembly", "fast cut"],
    steps: [
      "Click Cut at the bottom.",
      "Use the upper source viewer to scrub a clip; mark In (I) and Out (O).",
      "Append or insert to the timeline with the edit buttons under the viewers.",
      "Switch to Edit when you need full transitions, titles, and track control.",
    ],
    body: [
      {
        paragraphs: [
          "Cut is ideal for a first assembly. Your ShootSpine first cut often lands on the Edit page — use Cut if you want a quicker second pass.",
        ],
      },
    ],
    relatedIds: ["edit-transitions", "cut-trim"],
  },
  {
    id: "cut-trim",
    page: "cut",
    level: "beginner",
    title: "Trim and ripple on the Cut page",
    summary: "Shorten clips without leaving gaps (ripple).",
    keywords: ["trim", "ripple", "shorten", "cut trim", "blade"],
    steps: [
      "Select a cut point on the Cut timeline.",
      "Drag the trim handles, or use trim mode shortcuts for the active tool.",
      "Use ripple delete to remove a section and close the gap.",
    ],
    body: [
      {
        tips: ["When in doubt, make a timeline duplicate before aggressive trims (right‑click timeline tab)."],
      },
    ],
  },
  {
    id: "cut-fast-assembly",
    page: "cut",
    level: "intermediate",
    title: "Source tape and smart assembly habits",
    summary: "Work through a bin quickly with source tape.",
    keywords: ["source tape", "stringout", "selects", "assembly cut"],
    steps: [
      "Put selects in one bin; open Source Tape (Cut page).",
      "Mark I/O on good moments; append to timeline.",
      "Flag rejects so you don’t re-pick them later.",
    ],
    body: [],
  },
  {
    id: "cut-vs-edit",
    page: "cut",
    level: "advanced",
    title: "When to stay on Cut vs move to Edit",
    summary: "Choose the right page for speed vs precision.",
    keywords: ["cut vs edit", "which page", "precision edit"],
    steps: [
      "Stay on Cut for pacing passes and selects.",
      "Move to Edit for transitions, generators, multi-track audio, Fusion titles.",
      "Don’t fight Cut for complex composites — open Fusion or Edit effects.",
    ],
    body: [],
  },

  // ── Edit ────────────────────────────────────────────────────────────
  {
    id: "edit-overview",
    page: "edit",
    level: "beginner",
    title: "Edit page overview",
    summary: "Main timeline: tracks, viewers, inspector, effects library.",
    keywords: ["edit page", "edit tab", "timeline", "tracks", "inspector"],
    steps: [
      "Click Edit at the bottom.",
      "Timeline tracks: V1 video, A1+ audio (add tracks via right‑click track header).",
      "Viewer tools: In/Out, playhead, snappings (magnet icon).",
      "Inspector (top right) shows transform, opacity, audio levels for the selected clip.",
    ],
    body: [
      {
        tips: [
          "Your ShootSpine first cut usually appears as a timeline after Bring edit into Resolve.",
        ],
      },
    ],
    relatedIds: ["edit-transitions", "edit-titles"],
  },
  {
    id: "edit-put-on-timeline",
    page: "edit",
    level: "beginner",
    title: "Put clips on the timeline",
    summary: "Insert, overwrite, and append from Media Pool.",
    keywords: ["insert", "overwrite", "append", "add to timeline", "edit clip"],
    steps: [
      "Select a clip in Media Pool; set In/Out in the source viewer if needed.",
      "Place the playhead where you want the edit.",
      "Use Insert (F9), Overwrite (F10), or drag to a track.",
      "Alt/Option‑drag to copy a clip on the timeline.",
    ],
    body: [],
  },
  {
    id: "edit-transitions",
    page: "edit",
    level: "beginner",
    title: "Add a transition (dissolve, fade)",
    summary: "Cross dissolve and fades between clips on the Edit page.",
    keywords: [
      "transition",
      "transitions",
      "dissolve",
      "cross dissolve",
      "fade",
      "fade to black",
      "add transition",
      "smooth cut",
    ],
    steps: [
      "Go to the Edit page.",
      "Zoom the timeline so you can see the cut between two clips.",
      "Open Effects → Video Transitions → Dissolve → Cross Dissolve.",
      "Drag Cross Dissolve onto the cut (handles need enough handles/media on both sides).",
      "Select the transition → Inspector to change duration.",
      "Fade to black: Effects → DigiTransition / Dip to Color Dissolve, or opacity keyframes.",
    ],
    body: [
      {
        heading: "If the transition won’t apply",
        bullets: [
          "Clips need unused media (handles) beyond the cut — trim them shorter first.",
          "Or ripple-trim to create overlap, then drop the dissolve.",
          "ShootSpine soft dissolves may already be in the EDL; you can still replace them here.",
        ],
        tips: [
          "Standard shortcut on many installs: Ctrl/Cmd+T applies the standard transition on the selected cut.",
        ],
      },
    ],
    relatedIds: ["edit-overview", "fairlight-basics"],
  },
  {
    id: "edit-titles",
    page: "edit",
    level: "beginner",
    title: "Titles and text",
    summary: "Simple titles from Effects → Titles.",
    keywords: ["title", "titles", "text", "lower third", "caption", "subtitle"],
    steps: [
      "Effects Library → Titles (or Toolbox → Titles).",
      "Drag Text or Lower Third onto a video track above your picture (e.g. V2).",
      "Select the title → Inspector → change text, font, size, position.",
      "For motion graphics / tracking, open the clip in Fusion.",
    ],
    body: [],
    relatedIds: ["fusion-titles"],
  },
  {
    id: "edit-speed-retiming",
    page: "edit",
    level: "intermediate",
    title: "Speed changes and retime",
    summary: "Slow motion, freeze frames, and retime controls.",
    keywords: ["slow motion", "speed", "retime", "freeze frame", "ramp"],
    steps: [
      "Select clip → right‑click → Retime Controls (or Ctrl/Cmd+R).",
      "Drag the speed bar or set % in the retime UI.",
      "For freeze: Retime curve / freeze frame at playhead (version menus vary).",
      "Optical flow / frame blending: Inspector → Retime and Scaling when quality needs it.",
    ],
    body: [],
  },
  {
    id: "edit-multicam",
    page: "edit",
    level: "advanced",
    title: "Multicam (overview)",
    summary: "Sync angles and cut between cameras.",
    keywords: ["multicam", "multi cam", "angles", "sync audio"],
    steps: [
      "Select synced clips in Media Pool → right‑click → Create New Multicam Clip Using → Timecode or Waveform.",
      "Edit the multicam clip on the timeline; switch angles in the multicam viewer.",
      "Flatten when done if you need a standard clip stack.",
    ],
    body: [
      {
        tips: ["For a single FX3 camera show, you usually don’t need multicam."],
      },
    ],
  },

  // ── Fusion ──────────────────────────────────────────────────────────
  {
    id: "fusion-overview",
    page: "fusion",
    level: "beginner",
    title: "Fusion page overview",
    summary: "Node-based compositing for titles, tracking, and VFX.",
    keywords: ["fusion", "fusion page", "nodes", "compositing", "vfx"],
    steps: [
      "Select a clip (or title) on the Edit timeline.",
      "Click Fusion at the bottom — you enter that clip’s Fusion composition.",
      "MediaIn → tools → MediaOut is the basic pipe; add nodes between them.",
      "Return to Edit to see the result in context.",
    ],
    body: [
      {
        paragraphs: [
          "Start simple: Fusion Titles from Effects are often easier than building from an empty comp.",
        ],
      },
    ],
    relatedIds: ["fusion-titles", "fusion-track"],
  },
  {
    id: "fusion-titles",
    page: "fusion",
    level: "beginner",
    title: "Fusion titles and animations",
    summary: "Richer title animation than Text titles.",
    keywords: ["fusion title", "animate text", "motion title", "fusion text"],
    steps: [
      "Effects → Titles → Fusion Titles — drag one above your video.",
      "Open Fusion to tweak Text+ nodes, polish, and animation modifiers.",
      "Keep duration edits on the Edit page; keep look/animation in Fusion.",
    ],
    body: [],
  },
  {
    id: "fusion-track",
    page: "fusion",
    level: "intermediate",
    title: "Tracking and stabilising (Fusion / Color)",
    summary: "Point trackers and planar-style workflows for text-on-move.",
    keywords: ["track", "tracking", "stabilize", "stabilise", "planar", "match move"],
    steps: [
      "For simple stabilize: Color page → Tracker → Stabilizer, or Edit Inspector → Stabilization on some versions.",
      "For text stuck to a moving object: Fusion → Tracker node → connect to Text+ center/offset.",
      "Analyze forward/back; connect tracker data to the transform you need.",
    ],
    body: [],
  },
  {
    id: "fusion-keying",
    page: "fusion",
    level: "advanced",
    title: "Keying and masks (overview)",
    summary: "Green screen and garbage mattes at a high level.",
    keywords: ["key", "keying", "green screen", "chroma", "mask", "garbage matte"],
    steps: [
      "Fusion → add Delta Keyer / Chromakeyer after MediaIn.",
      "Pick screen color; adjust matte controls until edges clean up.",
      "Use masks to kill stands/lights the key can’t remove (garbage matte).",
      "Merge over a background plate before MediaOut.",
    ],
    body: [
      {
        tips: ["Light the green screen evenly on set — Fusion can’t fix a bad key alone."],
      },
    ],
  },

  // ── Color ───────────────────────────────────────────────────────────
  {
    id: "color-overview",
    page: "color",
    level: "beginner",
    title: "Color page overview",
    summary: "Nodes, viewer scopes, and where grading happens.",
    keywords: ["color page", "color tab", "grade", "grading", "nodes", "scopes"],
    steps: [
      "Click Color at the bottom.",
      "Left: node graph (start with one Corrector node). Middle: viewer. Right: tools (Primaries, Curves…).",
      "Open Scopes (waveform/vectorscope) — grade with eyes + scopes.",
      "Shot matching: copy a grade (middle‑click / gallery stills) onto other clips.",
    ],
    body: [
      {
        tips: [
          "ShootSpine LOOKS.txt is mood guidance only — build the real look here.",
          "Stills/photos on the timeline are graded on Color the same way as video.",
        ],
      },
    ],
    relatedIds: ["color-first-pass", "color-nodes"],
  },
  {
    id: "color-first-pass",
    page: "color",
    level: "beginner",
    title: "First color pass (balance exposure)",
    summary: "Normalize each shot before a creative look.",
    keywords: [
      "color correct",
      "exposure",
      "white balance",
      "contrast",
      "first pass",
      "primary",
      "lift gamma gain",
    ],
    steps: [
      "Select the first clip on the Color timeline thumbnails.",
      "Primaries → wheels / bars: fix exposure (Lift/Gamma/Gain) and white balance (Offset temperature/tint or wheels).",
      "Check waveform — keep important highlights from clipping unless intentional.",
      "Move shot to shot; keep skin consistent.",
    ],
    body: [
      {
        paragraphs: [
          "Do a clean technical pass first, then a creative look (LUT or film-style tools) on a separate node.",
        ],
      },
    ],
    relatedIds: ["color-nodes", "color-lut"],
  },
  {
    id: "color-nodes",
    page: "color",
    level: "intermediate",
    title: "Node graphs that stay editable",
    summary: "Serial nodes for balance → look → windows.",
    keywords: ["node", "nodes", "serial node", "parallel", "layer node", "power window"],
    steps: [
      "Alt/Option‑S (common) adds a serial node after the current one.",
      "Node 1: balance. Node 2: look/LUT. Node 3: windows/secondaries.",
      "Label nodes (right‑click) so future-you knows what each does.",
      "Use Outside node / windows for face vs background control.",
    ],
    body: [],
  },
  {
    id: "color-lut",
    page: "color",
    level: "intermediate",
    title: "LUTs and creative looks",
    summary: "Apply a LUT without crushing your ability to revise.",
    keywords: ["lut", "cube", "look", "film look", "creative lut", "ofx"],
    steps: [
      "Add a new serial node dedicated to the LUT.",
      "LUT dropdown on the node / LUT browser — pick a technical or creative LUT you trust.",
      "Mix/opacity or preceding contrast so the LUT doesn’t clip.",
      "Prefer OFX film tools (e.g. third-party) on their own node if you use them.",
    ],
    body: [
      {
        tips: [
          "Keep LUTs after a balanced Rec.709-ish image unless the LUT is built for your log camera.",
        ],
      },
    ],
  },
  {
    id: "color-managed",
    page: "color",
    level: "advanced",
    title: "Color management (YRGB / ACES overview)",
    summary: "When to turn on Resolve color management.",
    keywords: ["aces", "color management", "rcm", "davinci yrgb", "log", "s-log"],
    steps: [
      "Project Settings → Color Management.",
      "Beginners: DaVinci YRGB, grade manually or with camera CST.",
      "RCM / ACES: set input color space per clip (e.g. S-Log3/SGamut3.cine) and output to Rec.709 for web.",
      "Don’t switch modes mid-project without a backup .drp.",
    ],
    body: [],
  },

  // ── Fairlight ───────────────────────────────────────────────────────
  {
    id: "fairlight-basics",
    page: "fairlight",
    level: "beginner",
    title: "Fairlight overview",
    summary: "Audio page for dialogue, music, and mix levels.",
    keywords: [
      "fairlight",
      "audio",
      "sound",
      "mix",
      "dialogue",
      "music",
      "fairlight page",
    ],
    steps: [
      "Click Fairlight at the bottom.",
      "Each timeline audio track appears as a mixer strip.",
      "Select a clip → trim in the Fairlight timeline; use clip gain / track faders.",
      "Solo (S) / Mute (M) on strips while you balance dialogue vs music.",
    ],
    body: [
      {
        tips: ["Edit picture on Edit; do careful sound on Fairlight — same timeline underneath."],
      },
    ],
    relatedIds: ["fairlight-dialogue", "fairlight-music"],
  },
  {
    id: "fairlight-dialogue",
    page: "fairlight",
    level: "beginner",
    title: "Clean up dialogue",
    summary: "Levels, EQ, and light noise control.",
    keywords: ["dialogue", "voice", "eq", "noise reduction", "voice isolation", "loud"],
    steps: [
      "Normalize or raise clip gain so dialogue peaks are healthy (not slamming).",
      "Track EQ: gentle high-pass to reduce rumble; cut harshness around 2–5 kHz if needed.",
      "Studio: try Voice Isolation / Noise Reduction sparingly — less is more.",
      "Ride levels with clip gain keyframes or automatable faders.",
    ],
    body: [],
  },
  {
    id: "fairlight-music",
    page: "fairlight",
    level: "intermediate",
    title: "Music beds and ducking",
    summary: "Lay music under picture and dip under speech.",
    keywords: ["music", "bed", "duck", "ducking", "underscore", "sfx", "sound effects"],
    steps: [
      "Import music/SFX on Media page → place on a new audio track (Edit or Fairlight).",
      "Lower music fader under dialogue; automate dips where someone speaks.",
      "Keep SFX on their own track so you can mute the bed without losing hits.",
      "Third-party tools (e.g. video-to-sound plugins) can drop sync SFX onto Fairlight tracks — still review by ear.",
    ],
    body: [],
  },
  {
    id: "fairlight-bus-loudness",
    page: "fairlight",
    level: "advanced",
    title: "Buses, metering, and loudness",
    summary: "Deliver mixes that aren’t crushingly loud or tiny.",
    keywords: ["loudness", "lufs", "bus", "meter", "limiter", "master"],
    steps: [
      "Watch Fairlight meters while you mix dialogue-led content.",
      "Add a soft limiter on the main bus if peaks spike.",
      "For YouTube/web, aim for a comfortable dialogue level rather than music-video loudness.",
      "Export audio with the video from Deliver unless you need a separate stem.",
    ],
    body: [],
  },

  // ── Deliver ─────────────────────────────────────────────────────────
  {
    id: "deliver-overview",
    page: "deliver",
    level: "beginner",
    title: "Deliver page overview",
    summary: "Choose a preset, queue, and render your movie.",
    keywords: ["deliver", "deliver page", "export", "render", "render queue", "share"],
    steps: [
      "Click Deliver at the bottom.",
      "Pick a preset (YouTube, Vimeo, Custom).",
      "Set filename and location (ideally next to your ShootSpine project).",
      "Add to Render Queue → Render All.",
    ],
    body: [],
    relatedIds: ["deliver-youtube", "deliver-master"],
  },
  {
    id: "deliver-youtube",
    page: "deliver",
    level: "beginner",
    title: "Export for YouTube / social",
    summary: "H.264/H.265 MP4 that uploads cleanly.",
    keywords: [
      "youtube",
      "mp4",
      "h264",
      "h.264",
      "social",
      "export youtube",
      "instagram",
    ],
    steps: [
      "Deliver → YouTube preset (or Custom → Format MP4, Codec H.264).",
      "Resolution: match timeline (1080p or 4K).",
      "Use Entire Timeline (or In/Out range).",
      "Add to queue → Render All → upload the file.",
    ],
    body: [
      {
        tips: ["Turn off proxy mode / use highest quality media for final renders."],
      },
    ],
  },
  {
    id: "deliver-in-out",
    page: "deliver",
    level: "intermediate",
    title: "Render In/Out and versions",
    summary: "Export only a section or alternate cuts.",
    keywords: ["in out", "render range", "section", "export part", "version"],
    steps: [
      "On Edit, set timeline In (I) and Out (O) around the section.",
      "Deliver → choose Render In/Out or Selected range (wording varies).",
      "Duplicate a timeline for alternate cuts before major changes.",
    ],
    body: [],
  },
  {
    id: "deliver-master",
    page: "deliver",
    level: "advanced",
    title: "Master files and archive exports",
    summary: "Mezzanine/master codecs for long-term keeping.",
    keywords: ["master", "prores", "dnxhr", "exr", "archive export", "mezzanine"],
    steps: [
      "Custom preset → QuickTime + ProRes (or DNxHR) for an edit master.",
      "Export a .drp project backup alongside the master.",
      "Keep camera originals; masters are not a substitute for RAW/XAVC archives.",
    ],
    body: [],
  },
];

export function getResolveCoachSection(id: string): ResolveCoachSection | undefined {
  return RESOLVE_COACH_SECTIONS.find((s) => s.id === id);
}

export function sectionsForPage(page: ResolveCoachSection["page"]): ResolveCoachSection[] {
  return RESOLVE_COACH_SECTIONS.filter((s) => s.page === page);
}
