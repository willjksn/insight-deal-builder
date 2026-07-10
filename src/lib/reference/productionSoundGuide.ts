import { ReferenceSection } from "@/lib/reference/types";

const KW =
  "audio sound Zoom F8n Pro F8n Deity THEOS Deity TC-1 Sony FX3 Sony FX30 timecode boom MKE600 DJI Mic lav wireless sound bag gain staging Resolve sync room tone sound report";

/** Production Sound — Master Reference Guide sections for ShootSpine (Insight Media Group kit). */
export const PRODUCTION_SOUND_SECTIONS: ReferenceSection[] = [
  {
    id: "production-sound-home",
    category: "audio",
    title: "Production Sound — Home",
    summary: "Insight Media Group master audio system — F8n Pro center, boom primary, lavs backup, TC sync.",
    keywords: KW.split(" "),
    body: `PRODUCTION SOUND — MASTER REFERENCE GUIDE

Equipment: Sony FX3 (main camera) · Sony FX30 (DJI RS4 Pro/gimbal) · Zoom F8n Pro (master recorder) · Deity THEOS two-person wireless · Three Deity TC-1 timecode generators · Sennheiser MKE600 boom · Sennheiser MKE400 camera scratch · DJI Mic 2 / Mic 3 · Production sound bag · Closed-back headphones.

## Production Sound Priority

1. MKE600 boom — primary dialogue
2. Deity THEOS lavaliers — isolated backup and support
3. DJI lavs — when more than two actors need coverage
4. Camera scratch audio — reference and emergency sync
5. Internal transmitter recordings — emergency backup when available

The Zoom F8n Pro is the central production recorder. Cameras record video, scratch audio, and synchronized timecode.

Menu wording on FX3, FX30, F8n Pro, THEOS, TC-1, and DJI gear may vary by firmware — verify against current official manuals before relying on exact menu paths.`,
    tips: [
      "Final dialogue lives on the F8n Pro — sync in post with timecode, not camera mics",
      "Never format a production card until audio exists in two verified backup locations",
      "23 sections in this guide — use sidebar when Audio category is selected",
    ],
  },
  {
    id: "production-sound-signal-flow",
    category: "audio",
    title: "Master signal flow",
    summary: "Picture + TC on FX3/FX30; master ISO tracks on F8n Pro Inputs 1–5.",
    keywords: ["signal flow", "F8n", "timecode", "THEOS", "MKE600", "DJI"],
    body: "See diagram below. Permanent routing: boom Input 1, THEOS A/B Inputs 2–3, DJI split Inputs 4–5, plant/spare 6–8.",
  },
  {
    id: "production-sound-bag-layout",
    category: "audio",
    title: "Sound bag layout",
    summary: "F8n center, THEOS upper-left, power opposite, TC-1 rear exterior, pockets labeled.",
    keywords: ["sound bag", "layout", "F8n", "THEOS"],
    body: `Center: Zoom F8n Pro — screen, transport, inputs, SD door, headphone and TC ports accessible.

Upper-left / front: Deity THEOS receiver — display visible, antennas upright and uncrossed, outputs toward recorder, short cables.

Upper-right / rear: Primary external battery — separated from RF where practical, secured pouch, labeled outputs.

Rear exterior: TC-1 labeled TC — F8N — screen visible, cable secured, cannot press recorder controls.

Front pocket: lav mounts, Rycote/Bubblebee, tape, moleskin, topstick, pins, wind protection, sharpies, sound reports.

Side pocket: spare AA/NP-F, USB-C bank, backup XLR, TC cables, DJI cable, spare media.`,
  },
  {
    id: "production-sound-cables",
    category: "audio",
    title: "Complete cable list",
    summary: "Boom, THEOS, DJI breakout, TC (F8N/FX3/FX30), USB-C — verify connectors before purchase.",
    keywords: ["cable", "XLR", "timecode", "DJI breakout"],
    tables: [
      {
        headers: ["Qty", "From", "To", "Connector", "Length", "RA?", "Purpose", "Notes"],
        rows: [
          ["1 + 1 backup", "MKE600", "F8n Input 1", "XLR F → XLR M balanced", "Full boom + 12–18 in jumper", "At bag end", "Primary boom", "Flexible cable, strain relief"],
          ["2", "THEOS Out A/B", "F8n In 2/3", "Receiver out → XLR or 1/4 TRS", "12–18 in", "At receiver", "Principal lavs", "Verify THEOS output type; label A/B"],
          ["1 + 1 backup", "DJI receiver", "F8n In 4/5", "3.5 mm TRS → dual mono", "12–18 in", "Preferred", "DJI A/B split", "NOT stereo-to-mono — true L/R split"],
          ["1 + 1 backup", "TC-1 F8N", "F8n TC IN", "Deity-compatible TC cable", "12–18 in", "Yes", "Recorder TC", "Label TC — F8N"],
          ["1", "TC-1 FX3", "FX3 TC in", "Sony-compatible adapter", "~12 in", "Yes", "Camera TC", "Label TC — FX3; adapter required"],
          ["1", "TC-1 FX30", "FX30 TC in", "Sony-compatible adapter", "~12 in", "Yes", "Gimbal cam TC", "Verify FX30 firmware + connection"],
          ["4+", "USB-C", "TC-1, THEOS, DJI, bank", "USB-C", "12 in bag / 3 ft charge", "In bag", "Charging", "Right-angle in bag"],
        ],
      },
    ],
  },
  {
    id: "production-sound-power",
    category: "audio",
    title: "Power and battery routing",
    summary: "F8n external primary; THEOS/TC-1 daily charge; FRESH vs USED bins.",
    keywords: ["power", "battery", "F8n"],
    body: `F8n Pro: Primary external bag battery → DC input. Keep AAs as emergency backup only — not all-day primary.

THEOS: Fresh batteries start of day; complete spare sets; separate FRESH and USED physically; replace before long scenes.

TC-1: Charge all three before shoot. Permanent labels: TC-1 FX3 · TC-1 FX30 · TC-1 F8N. Do not swap without updating labels.

Battery log: Device · Battery installed · Time in/out · Remaining · Notes`,
    tables: [
      {
        headers: ["Device", "Check before take"],
        rows: [
          ["F8n Pro", "Primary full · backup ready · connectors secure"],
          ["THEOS TX/RX", "Fresh marked · monitor from receiver/app"],
          ["TC-1 (×3)", "Charged · correct label · TC displaying"],
        ],
      },
    ],
  },
  {
    id: "production-sound-f8n-setup",
    category: "audio",
    title: "Zoom F8n Pro master setup",
    summary: "Recommended narrative film preset — 48 kHz poly WAV, external TC, boom phantom, wireless line.",
    keywords: ["F8n", "Zoom", "48kHz", "32-bit", "phantom"],
    body: `Recording: WAV · Poly WAV multitrack · 48 kHz · 24-bit or 32-bit float per workflow · isolated ISO per input · optional LR mix for editorial reference.

32-bit float adds headroom but does NOT prevent capsule distortion, wireless clipping, bad placement, or RF hits.

Frame rate: F8n TC must exactly match camera project (23.976 vs 24.00 are different — never mix).

Timecode: External from TC-1 · Free Run · verify valid TC before first take · recheck after lunch and battery changes.

Input 1 (MKE600): Mic level · 48V ON · HPF ~70–80 Hz start · adjust for wind/HVAC.

Inputs 2–5 (wireless): Line or mic per receiver output · Phantom OFF · moderate recorder trim · avoid double limiting.

Gain philosophy (24-bit): dialogue avg -24 to -18 dBFS · peaks -12 to -6 dBFS. 32-bit: still sane wireless and mic staging.

Pre-record buffer when useful. Approved SD cards. Test record + headphone playback every morning.

File naming: PROJECT_SCENE_SHOT_TAKE or metadata Resolve can read.`,
    tips: [
      "Limiters on 24-bit — they do not fix clipped transmitters or overloaded capsules",
      "Never format production media until two verified backups exist",
    ],
  },
  {
    id: "production-sound-f8n-inputs",
    category: "audio",
    title: "F8n Pro input assignments",
    summary: "Permanent channel layout — physical inputs stay fixed; actor names in sound report.",
    keywords: ["input", "BOOM", "LAV-A", "track names"],
    tables: [
      {
        headers: ["Input", "Source", "Track name", "Purpose"],
        rows: [
          ["1", "MKE600 boom", "BOOM", "Primary dialogue"],
          ["2", "THEOS Receiver A", "LAV-A", "Principal actor 1 (name in report)"],
          ["3", "THEOS Receiver B", "LAV-B", "Principal actor 2"],
          ["4", "DJI Receiver L", "DJI-A", "Actor 3 or utility"],
          ["5", "DJI Receiver R", "DJI-B", "Actor 4 or utility"],
          ["6", "Plant / utility", "PLANT", "Hidden mic or actor 5 support"],
          ["7", "Spare", "SPARE-1", "Expansion"],
          ["8", "Spare", "SPARE-2", "Expansion"],
        ],
      },
    ],
    body: "Input 2 is always THEOS A even when a different actor wears transmitter A — record actor name in metadata and sound report. Never combine two actors on one channel when isolated routing is available.",
  },
  {
    id: "production-sound-monitoring",
    category: "audio",
    title: "Headphone and monitoring setup",
    summary: "Closed-back headphones; boom-first preset; solo/PFL for rustle and RF.",
    keywords: ["headphones", "monitoring", "PFL"],
    body: `Route headphones from operator side — do not cross antennas, input knobs, screen, or transport.

Recommended preset: stereo mix for overview · quick solo/PFL per ISO · boom-first default · individual lav checks for rustle · fast RF hit identification.

Before every take: confirm recording LED · armed tracks · listen for hum, handling, clothing noise.`,
  },
  {
    id: "production-sound-theos",
    category: "audio",
    title: "Deity THEOS setup",
    summary: "Two-channel wireless — RF scan, gain staging, receiver output to F8n 2–3.",
    keywords: ["THEOS", "wireless", "RF", "lav"],
    body: `Before shoot: charge batteries · firmware compatible · label TX A/B and matching lavs · RF scan at location · pair both · confirm audio to F8n Inputs 2–3.

RF scan: receiver on at location · scan range · avoid occupied freqs · space channels · rescan after location change or hits · antennas upright · keep away from USB noise, Wi-Fi, camera TX, metal.

Gain chain: voice → lav → TX input → RF → RX out → F8n → ISO. Set TX gain on loudest expected delivery — not quiet rehearsal if scene has shouting.

Receiver output: strong clean level so F8n trim stays moderate. Avoid TX too hot + RX limit + recorder limit.

Internal TX recording: enable as emergency backup when your purchased THEOS version supports it — still monitor live.`,
    tables: [
      {
        headers: ["Transmitter", "Actor", "Wardrobe", "Lav position", "Frequency", "Battery", "Notes"],
        rows: [["A", "", "", "", "", "", ""], ["B", "", "", "", "", "", ""]],
      },
    ],
  },
  {
    id: "production-sound-dji",
    category: "audio",
    title: "DJI Mic 2 & 3 integration",
    summary: "Utility when >2 actors — stereo breakout to F8n 4–5, not primary over THEOS.",
    keywords: ["DJI Mic", "DJI", "breakout"],
    body: `Use when: 3+ actors need lavs · plant/utility · BTS guide track. Not preferred primary when THEOS is available.

Connection: DJI receiver 3.5 mm TRS → stereo breakout → F8n Inputs 4 & 5. Receiver in split/stereo mode — TX A on one channel, TX B on the other.

Settings: manual gain · NR OFF unless needed · AGC OFF · internal recording ON as backup · 32-bit internal when supported · low-cut only when needed.

Warning: DJI output can overload or underfeed F8n — loud-dialogue rehearsal on full chain.`,
  },
  {
    id: "production-sound-tc1-workflow",
    category: "audio",
    title: "Deity TC-1 timecode workflow",
    summary: "TC-1 #1 FX3 · #2 FX30 · #3 F8N — same frame rate everywhere, Free Run.",
    keywords: ["TC-1", "timecode", "Sidus", "23.976", "24"],
    body: `Assignment: TC-1 #1 → Sony FX3 · #2 → Sony FX30 · #3 → Zoom F8n Pro. Permanent labels.

23.976 and 24.00 are DIFFERENT — every device must use the exact same project frame rate.

Mode: Free Run for narrative.

Daily procedure:
1. Power all three TC-1 units
2. Sidus Audio app — confirm units visible
3. Set project frame rate on all
4. Sync units
5. Confirm matching displays
6. Connect each to assigned device
7. Confirm FX3, FX30, F8n reading external TC
8. Record short camera + audio test · compare TC values · slate

Recheck TC: start of day · after lunch · battery change · disconnect · camera frame-rate change · slow-motion / S&Q · before one-time performances.

Slow motion: record dialogue at normal speed; treat HFR inserts separately; verify camera TC behavior before relying on it.`,
    tips: ["Slate every sync test — visual + audio backup to timecode"],
  },
  {
    id: "production-sound-fx3-tc",
    category: "audio",
    title: "Sony FX3 timecode setup",
    summary: "Match project fps · Preset · Free Run · TC-1 via Sony adapter · MKE400 scratch.",
    keywords: ["FX3", "Sony", "timecode", "MKE400"],
    body: `Set project frame rate first. Timecode: Preset mode · Free Run · match drop/non-drop to project. Connect TC-1 with Sony-compatible timecode cable/adapter — confirm incoming TC on display and during record. Do not change frame rate after sync without resetting entire TC system.

Scratch audio (MKE400): reference, emergency sync, editorial playback, ambience — NOT main dialogue. Set levels conservatively to avoid clipping.

TC-1 mount: cage rear/side · screen visible · cable strain relief · clear of monitor and controls.

Verify exact menu paths in current FX3 help guide — firmware may differ.`,
  },
  {
    id: "production-sound-fx30-tc",
    category: "audio",
    title: "Sony FX30 timecode setup",
    summary: "Same TC discipline as FX3 · RS4 Pro balance · lightweight TC mount.",
    keywords: ["FX30", "RS4", "gimbal", "timecode"],
    body: `Match project fps · Preset · Free Run · Sony-compatible TC connection · verify incoming TC · recheck after recording mode changes and after mounting on DJI RS4 Pro.

Gimbal: mount TC-1 lightweight side · short flexible cable · strain relief · rebalance gimbal after install — avoid motor interference, balance shift, cable tension.

Scratch: compact on-camera mic if practical — minimize weight and cable pull on gimbal.

Verify FX30 connection method against current Sony documentation for your firmware.`,
  },
  {
    id: "production-sound-mke600",
    category: "audio",
    title: "MKE600 boom setup",
    summary: "Input 1 · 48V · HPF ~70–80 Hz · wind protection levels · aim upper chest/mouth.",
    keywords: ["MKE600", "boom", "phantom", "wind"],
    body: `Signal: MKE600 → balanced XLR → F8n Input 1 · Mic · 48V ON · HPF ~70–80 Hz · track name BOOM.

Wind: (1) indoor foam (2) outdoor soft windscreen (3) blimp + furry for real wind — foam alone is not enough outdoors.

Position: above actors, just outside frame, toward upper chest/mouth, as close as framing allows, angle to reject noise. Aim depends on pattern, head turns, ceiling reflections, and BG noise — not always chest-only.`,
  },
  {
    id: "production-sound-boom-techniques",
    category: "audio",
    title: "Boom operating techniques",
    summary: "One/two/multi actor, wide, walk, car, low ceiling, shadow rehearsal.",
    keywords: ["boom", "operator", "cueing"],
    tables: [
      {
        headers: ["Scenario", "Approach"],
        rows: [
          ["One actor", "Above frame · aim ahead of mouth on turns · smooth follow"],
          ["Two facing", "Between when possible · cue between lines · lav backup on overlap"],
          ["Three+", "Prioritize active speaker · rehearse order · lavs on principals · plant if needed"],
          ["Wide shot", "Boom below if safe · plant mic · lav support · don't force distant boom"],
          ["Walking", "Walk backward with spotter · constant distance · lav backup · watch cable noise"],
          ["Car", "Lav actors · plant visor/console/headliner · reduce fan · separate engine ambience"],
          ["Low ceiling", "Shorter pole · boom below · plant mic · avoid ceiling reflections"],
          ["Boom shadow", "Rehearse vs key light, pole, actor, frame edge before rolling"],
        ],
      },
    ],
  },
  {
    id: "production-sound-lav-placement",
    category: "audio",
    title: "Lavalier placement",
    summary: "Consent first · strain relief · rustle/wind checks · wardrobe-specific mounts.",
    keywords: ["lav", "placement", "rustle", "wardrobe"],
    body: `Rules: actor consent before touching wardrobe · wardrobe pro when appropriate · privacy · no skin contact without approved materials · strain-relief loop · no cable tension at capsule · secure jewelry · full movement test before rolling.

For each garment type plan: preferred position · backup · mount (vampire, tape, moleskin) · rustle/wind risks · cable route · transmitter pocket · what to monitor.

Covers: T-shirt · button-up · suit · tie · dress · hoodie · sweater · athletic wear · coat · undergarment (consent only) · hair · hat · seatbelt · jewelry · sweat · running · wind.`,
    tips: [
      "Rustle check: have actor perform full blocking while you solo the lav",
      "Seatbelt and jewelry are common failure points in car scenes",
    ],
  },
  {
    id: "production-sound-scene-setups",
    category: "audio",
    title: "Scene-based audio setups",
    summary: "Two-person, four/five actor, interview, horror, exterior cards.",
    keywords: ["scene", "interview", "horror", "exterior"],
    tables: [
      {
        headers: ["Scene", "Setup"],
        rows: [
          ["Two-person dialogue", "Boom In1 · THEOS A/B In2-3 · TC on FX3/FX30/F8n · room tone · slate"],
          ["Four actors", "Boom In1 · THEOS on 2 principals · DJI A/B In4-5 · metadata assignments"],
          ["Five actors", "Boom In1 · THEOS on 2 hardest · DJI on 3-4 · actor 5 via boom/plant/rotation · plan blocking"],
          ["Interview", "Boom close · THEOS on subject · optional 2nd on interviewer · kill HVAC noise · room tone"],
          ["Horror", "Quiet room tone · wild tracks (breath, fabric, doors) · boom for whispers · lavs for movement"],
          ["Exterior", "Full boom wind · lav wind · monitor traffic/aircraft · isolated ambience · receiver not buried in metal"],
        ],
      },
    ],
  },
  {
    id: "production-sound-on-set-workflow",
    category: "audio",
    title: "On-set master workflow",
    summary: "Night before through wrap — chronological checklists.",
    keywords: ["workflow", "checklist", "wrap", "room tone"],
    tables: [
      {
        headers: ["Phase", "Steps"],
        rows: [
          ["Night before", "Charge all batteries · TC-1 ×3 · THEOS · DJI · format media after backup confirmed · label · pack lav kit · sound report ready"],
          ["At call", "Mount F8n · power · THEOS · cables · TC-1 F8N · format/names/arm · sync TC · FX3/FX30 TC · RF scan · mic actors · boom rehearsal · test + playback"],
          ["Before take", "Recording · armed tracks · batteries · media · TC running · no rustle · RF OK · boom position · no boom shadow · cameras rolling · slate"],
          ["After take", "Cut after director · listen for problems · mark false takes · note RF/rustle/traffic · best track · update metadata"],
          ["After scene", "30–60 sec room tone · wild lines · prop sounds · confirm files · battery/media check"],
          ["Lunch", "Verify TC · replace batteries · cables · rescan RF if moved · backup audio · do not format"],
          ["Wrap", "Stop record · confirm files · copy to TWO locations · verify playback · save report · power down · mark used batteries · recharge · inspect lav cables"],
        ],
      },
    ],
  },
  {
    id: "production-sound-report",
    category: "audio",
    title: "Sound reports and metadata",
    summary: "Fields for every take — use F8n metadata + written report.",
    keywords: ["sound report", "metadata", "roll", "take"],
    tables: [
      {
        headers: ["Field", "Notes"],
        rows: [
          ["Project / date / location", "Production identity"],
          ["Sound mixer / boom op", "Crew"],
          ["Recorder / sample rate / bit depth / fps", "F8n Pro · 48 kHz · TC frame rate"],
          ["Roll / scene / shot / take", "Match slate"],
          ["Track assignments", "BOOM · LAV-A · LAV-B · DJI-A/B · actor names"],
          ["Timecode status", "OK / resynced / issue"],
          ["Noise / wild tracks / room tone", "Problems and extras captured"],
          ["Preferred track / filename", "Editor guidance"],
        ],
      },
    ],
  },
  {
    id: "production-sound-resolve-sync",
    category: "audio",
    title: "DaVinci Resolve sync workflow",
    summary: "Folder structure · import · sync by TC · multicam · track priority.",
    keywords: ["Resolve", "sync", "timecode", "multicam"],
    body: `Folder structure:
PROJECT / VIDEO / FX3 · FX30 / AUDIO / F8N · THEOS BACKUP · DJI BACKUP / SOUND REPORTS / PROJECT FILES / EXPORTS

Import: FX3 + FX30 footage · F8n poly WAV · backup TX files only when needed · verify clip fps and 48 kHz audio.

Sync: select matching clips · Resolve timecode sync · keep scratch for verification · check head/tail of long takes · lip sync · correct channels attached.

Multicam: FX3 + FX30 multicam by TC · F8n as production sound · mute scratch after verification.

Audio priority: (1) Boom (2) THEOS lav (3) DJI lav (4) Plant (5) Camera scratch. Support lavs on wide, turns, overlap, movement. Check phase when combining boom + lav.`,
  },
  {
    id: "production-sound-troubleshooting",
    category: "audio",
    title: "Troubleshooting",
    summary: "Searchable problem cards — no signal, mixed DJI, TC mismatch, rustle, RF, distant boom.",
    keywords: ["troubleshooting", "RF", "rustle", "clip"],
    tables: [
      {
        headers: ["Problem", "Check"],
        rows: [
          ["No MKE600 signal", "XLR · armed · mic input · 48V ON · cable · trim · mute · MKE battery mode"],
          ["THEOS at RX but not F8n", "Output routing · cable · correct input · input type · armed · RX level · trim · mute"],
          ["DJI actors on one track", "Split/stereo mode · true L/R breakout · separate F8n inputs"],
          ["TC mismatch", "Project fps · 23.976 vs 24 · Free vs Record Run · drop frame · cable · external TC mode · re-sync"],
          ["Lav rustle", "Fabric on capsule · cable tension · strain relief · jewelry · hair · adhesive · seatbelt"],
          ["RF hits", "Rescan · new freq · RX position · antennas clear of metal · TX battery · nearby RF · TX backup rec"],
          ["Boom distant", "Distance · aim · cueing · reverb · plant/lav support"],
          ["Clip despite 32-bit", "TX clipped · RX out clipped · capsule overloaded · analog stage · bad normalize in post"],
        ],
      },
    ],
  },
  {
    id: "production-sound-quick-ref",
    category: "audio",
    title: "Quick reference checklists",
    summary: "iPad-friendly cards — two actor, four actor, F8n startup, TC startup, end of day.",
    keywords: ["quick reference", "checklist", "startup"],
    tables: [
      {
        headers: ["Card", "Items"],
        rows: [
          ["Two-actor narrative", "In1 Boom · In2-3 THEOS · TC FX3/FX30/F8N · 48 kHz · matching fps · Free Run · room tone · slate"],
          ["Four-actor", "In1 Boom · In2-3 THEOS · In4-5 DJI split · monitor all ISO · record actor names · boom primary"],
          ["F8n startup", "Power · media · 48 kHz · bit depth · fps · TC · track names · input type · phantom on In1 only · arm · phones · test · playback"],
          ["TC startup", "Set fps · sync TC-1s · connect devices · confirm external TC · compare displays · sync test · slate · recheck after lunch"],
          ["End of day", "Verify audio · two backups · save report · charge all · inspect cables · reset FRESH/USED bins"],
        ],
      },
    ],
  },
  {
    id: "production-sound-purchase-list",
    category: "audio",
    title: "Purchase and accessory list",
    summary: "Required · recommended · future expansion — verify connector compatibility before ordering.",
    keywords: ["purchase", "accessories", "cables"],
    tables: [
      {
        headers: ["Category", "Items"],
        rows: [
          ["Required", "TC cables FX3/FX30/F8n (verify adapters) · 2× THEOS short outs · DJI stereo breakout · boom XLR + backup · F8n external power · closed-back headphones · lav concealment · boom wind · labels/ties"],
          ["Strongly recommended", "MKE600 blimp/furry · backup TC + DJI cables · spare media · battery organizer · slate · lav concealers · topstick/moleskin/tape · scissors · wipes · rain covers"],
          ["Future expansion", "More THEOS channels · premium lav capsules · plant mic · TC slate · boom op headphones · RF distro when system grows · larger smart battery"],
        ],
      },
    ],
    body: "Do not order cables until you verify THEOS receiver output connector and Sony FX3/FX30 timecode adapter compatibility with your exact firmware and hardware.",
  },
];
