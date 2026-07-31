import { ReferenceSection } from "@/lib/reference/types";

const KW =
  "coverage scene checklist master wide establishing over-the-shoulder OTS insert cutaway reaction POV continuity room tone clean plate five-shot safety eyeline 180";

/** Complete Scene Shooting Checklist — on-set coverage reference for ShootSpine crews. */
export const SCENE_COVERAGE_SECTIONS: ReferenceSection[] = [
  {
    id: "scene-coverage-home",
    category: "movement",
    title: "Scene coverage checklist",
    summary:
      "Complete scene shooting checklist — story, continuity, and technical checks before you roll.",
    keywords: KW.split(" "),
    body: `Complete Scene Shooting Checklist — use this before and during every scene so the editor has enough material for rhythm, tension, emotion, and clarity.

## 1. Before Recording Anything

### Story Check

* What is the main purpose of the scene?
* Who has control at the beginning?
* Who has control at the end?
* What is the most important emotional moment?
* What information must the audience see?
* What object, action, or reaction matters most?
* Where should the scene feel fast, slow, tense, funny, romantic, or uncomfortable?

### Continuity Check

* Actor positions are marked.
* Props are placed correctly.
* Wardrobe and hair match previous scenes.
* Drinks, food, phones, bags, and other objects are in the correct hands.
* Doors begin open or closed consistently.
* Actors repeat actions at approximately the same time during each take.
* Take continuity photos before changing the setup.

### Technical Check

* Camera format, frame rate, shutter, ISO, aperture, and white balance are set.
* Timecode is synced.
* Audio channels are labeled and recording.
* Focus is checked.
* Exposure is checked on faces and highlights.
* Lighting does not change between matching angles.
* Memory cards and batteries have enough capacity.
* The slate or verbal scene-and-take identification is recorded.`,
    tips: [
      "Most important rule: capture the person acting, the person watching, the object/event, the environment, and the emotional result",
      "When time is short, use the Five-Shot Safety Method (see that section)",
    ],
  },
  {
    id: "scene-coverage-shot-order",
    category: "movement",
    title: "Shoot the scene in this order",
    summary: "Sixteen coverage steps from establishing through action — shoot in order when possible.",
    keywords: [
      "master",
      "establishing",
      "OTS",
      "close-up",
      "insert",
      "cutaway",
      "POV",
      "entrance",
      "exit",
    ],
    body: `## Shot 1: Establishing Shot

Purpose: Shows the location and helps the audience understand where the scene takes place.

Examples: Exterior of the house · Empty hallway before the actor enters · Wide restaurant · Street, office, bedroom, theater, parking lot.

Checklist: Location clearly visible? Enough time at beginning and end? Steady? Mood match? Distracting objects removed? Clean room tone or environmental sound?

## Shot 2: Master Wide Shot

Purpose: Records the entire scene from beginning to end and protects the edit. This is the most important safety shot.

Checklist: All important actors visible? Entrances, exits, major movement? Important props? Everyone inside frame? Scene clear without cutting? Complete scene? At least two usable takes?

Rule: Do not stop the master because one actor is temporarily off-camera unless the entire shot is unusable.

## Shot 3: Medium Wide or Full-Body Shot

Purpose: Shows body language, blocking, and movement more clearly than the master.

Checklist: Feet, hands, and important actions visible? Room to move? Avoid awkward cuts at ankles, knees, or joints? Relationship to environment? Capture walking, sitting, standing, or turning completely?

## Shot 4: Two-Shot or Group Shot

Purpose: Shows two or more actors together and captures their relationship.

Checklist: Both actors framed intentionally? One meant to dominate? Physical distance meaningful? Both in focus when needed? Eyelines match? Separation from background? Entire conversation or most important section?

## Shot 5: Over-the-Shoulder on Actor A

Purpose: Shows Actor B speaking while keeping part of Actor A in the foreground.

Checklist: Correct side of the 180° line? Shoulder helps composition (not blocking)? Actor B eyeline correct? Focus on Actor B? Full dialogue covered? Listening and reactions? Clean look-space in Actor B’s look direction?

## Shot 6: Over-the-Shoulder on Actor B

Repeat the same checks in the opposite direction.

Checklist: Camera on correct side of the line · Eyeline matches · Foreground shoulder size similar unless intentional · Actor A complete dialogue · Silent reactions · Lighting and background continuity match.

## Shot 7: Medium Shot on Each Main Actor

Purpose: Balances performance, body language, and facial expression (usually waist or chest).

Checklist: Consistent framing? Hands visible when they matter? Performance readable? Background clean? Look room? All dialogue? Actor listening? Safety take with slightly different performance?

## Shot 8: Close-Up on Each Main Actor

Purpose: Captures emotion and gives the editor control over intensity.

Checklist: Focus on the eyes? Saved for an important emotional moment? Eyeline correct? Intentional headroom? Top of head cut intentionally not accidentally? Facial lighting consistent? Full dialogue section? Silent reactions? Hold after the actor finishes speaking?

Important: Do not only record the actor while speaking. Their reaction while listening may be more valuable.

## Shot 9: Extreme Close-Up

Purpose: Emphasizes a very specific emotional or visual detail (eyes, mouth, tear, finger on trigger, hand shaking, phone notification, door lock).

Checklist: Detail important enough? Focus precise? Movement repeatable? Long enough to edit? Capture several times?

## Shot 10: Insert Shots

Purpose: Shows an important object or action in detail (phone screen, hand on door, keys, drink pour, weapon/tool, text, photo, clock, envelope, food, pedal, button).

Checklist: Object position consistent? Same hand as wider shot? Same action direction? Screen/object readable? Focus sharp? Before, during, and after the action? Multiple speeds? Extra handles before and after?

## Shot 11: Cutaway Shots

Purpose: Moves away from main action — pacing, atmosphere, or hiding continuity problems (clock, doorway, hallway, audience, empty chair, weather, hands under table, someone watching).

Checklist: Connected to the scene? Adds info, tension, humor, or atmosphere? Can hide an edit? Held long enough? Static and moving versions when useful?

## Shot 12: Reaction Shots

Purpose: Shows how characters emotionally respond (surprise, fear, anger, suspicion, confusion, relief, disappointment, attraction, discomfort, silent listening, looks).

Checklist: Every major character? With and without dialogue? Held long enough? Subtle and stronger versions? Before and after the reveal?

## Shot 13: Point-of-View Shot

Purpose: Shows what a character sees.

Basic edit pattern: (1) Character looks → (2) POV shows what they see → (3) Cut back to reaction.

Checklist: Near eye level? Preceding shot establishes who looks? Eyeline direction correct? Subject visible long enough? Feels natural? Character reaction also recorded?

## Shot 14: Moving Shot

Purpose: Follows, leads, circles, reveals, or pushes (push-in, pull-out, track, dolly, slider, pan, tilt, arc, reveal, follow, lead).

Checklist: Story reason? Strong start and end frames? Smooth? Focus throughout? Actor pace repeatable? Marks for camera and actor? Static safety version? Time before and after the move?

## Shot 15: Entrance and Exit Coverage

Purpose: Makes editing characters in/out easier.

Checklist: Wide complete entrance/exit · Medium · Hand on door · Feet crossing doorway · Reaction from person already inside · Reverse inside/outside · Clean empty doorway · Door closing completely · Actor clears frame before stop.

## Shot 16: Action Coverage

For any important action, record three basic angles: Wide (where) · Medium (actor performing) · Close/insert (detail).

Example — actor picks up a phone: wide crossing room · medium reaching · insert hand · CU phone screen · CU reaction · OTS of screen · putting phone down.

Checklist: Same start position · Same hand · Prop orientation · Matching speed · Complete movement · Record before start · Continue after end.`,
    tips: [
      "Master wide first after establishing — never leave a scene without a complete master",
      "Always record listening and reactions, not only speaking takes",
    ],
  },
  {
    id: "scene-coverage-by-type",
    category: "movement",
    title: "Coverage by scene type",
    summary: "Quick lists for dialogue, single-actor, suspense/horror, product/brand, and walking scenes.",
    keywords: ["dialogue", "horror", "product", "walking", "single actor"],
    tables: [
      {
        headers: ["Scene type", "Capture"],
        rows: [
          [
            "Dialogue",
            "Establishing · Master wide · Two-shot · OTS each · Medium each · CU each · Listening reactions · Inserts · Cutaways · Entrance/exit · Room tone",
          ],
          [
            "Single-actor",
            "Establishing · Master wide · Medium full-body · MCU · CU · Profile · OTS toward what they see · POV · Hands/object inserts · Reactions · Movement · Clean empty room plate",
          ],
          [
            "Suspense / horror",
            "Establishing · Wide empty space · Slow push-in · Character CU · POV · Empty doorway/hallway · Insert (handle, phone, clock, light) · Reaction · Behind actor · Low/high angle · Shadow/silhouette · Negative space · Clean plate · Room tone · Wild SFX",
          ],
          [
            "Product / brand",
            "Wide lifestyle · Medium using product · Hero · Logo CU · Hands · Details · Enjoyment/reaction · OTS use · Slow-mo option · Clean BG · Vertical · Horizontal · Room for text",
          ],
          [
            "Walking",
            "Wide profile/front/rear · Medium side/front · Face CU · Feet · Hands/clothing · Follow · Lead · Destination reveal · Start and stop of walk",
          ],
        ],
      },
    ],
  },
  {
    id: "scene-coverage-five-shot",
    category: "movement",
    title: "Five-shot safety method",
    summary: "Minimum coverage when time is limited — does not replace full coverage.",
    keywords: ["five-shot", "safety", "minimum coverage", "time limited"],
    body: `When time is limited, capture these five shots for every important action:

1. Wide shot — Shows the full action.
2. Medium shot — Shows the actor performing it.
3. Close-up — Shows the emotion or important detail.
4. Over-the-shoulder or point of view — Shows what the actor sees.
5. Insert or reaction — Gives the editor a useful cut.

This method does not replace full coverage, but it gives you a strong minimum.`,
    tips: ["Use five-shot as emergency floor — still prefer the full ordered list when schedule allows"],
  },
  {
    id: "scene-coverage-edit-rules",
    category: "movement",
    title: "Coverage rules that prevent editing problems",
    summary: "Handles, listening, complete actions, screen direction, clean plates, and room tone.",
    keywords: ["handles", "listening", "screen direction", "clean plate", "room tone", "180"],
    body: `## Hold Every Shot

Record at least 5 seconds before the action and 5 seconds after. Longer for slow, dramatic, or suspenseful scenes. Do not cut immediately after the actor finishes speaking.

## Record Listening

After covering an actor’s dialogue: silently listening · neutral reactions · emotional reactions · looks toward important objects · clean reaction without overlapping dialogue.

## Complete Every Action

Do not stop halfway through sitting, standing, opening a door, picking up an object, walking out, turning around, or taking a drink. Let the actor finish and settle.

## Protect the Edit

For important moments capture: wide · medium · close · reaction · insert or cutaway.

## Match Screen Direction

If an actor moves left to right in the wide, maintain that direction unless you intentionally cross the line.

## Get Clean Plates

Record the location without actors for 10–20 seconds — same framing, same lighting, no crew movement. Helps editing, sound, transitions, VFX, and removing unwanted elements.

## Record Room Tone

At the end of each location: everyone silent · no crew movement · 30–60 seconds · same mic setup as the scene.`,
  },
  {
    id: "scene-coverage-final-checks",
    category: "movement",
    title: "Final checks before moving or wrapping",
    summary: "Questions before leaving a camera setup, and before wrapping the scene.",
    keywords: ["playback", "wrap", "setup check", "safety take"],
    body: `## Before Leaving a Camera Setup

* Do I have the complete action?
* Do I have the beginning and ending?
* Do I have a usable performance?
* Do I have a wide version?
* Do I have a close version?
* Do I have the important reaction?
* Do I have the important object or insert?
* Do I have listening coverage?
* Do I have enough time before and after the action?
* Is focus sharp?
* Is audio clean?
* Does continuity match?
* Does the shot cross the 180° line unintentionally?
* Are crew, stands, mics, or reflections visible?
* Do I need a vertical version?
* Do I need a clean plate?
* Do I need slow motion?
* Do I need another take for safety?

## Before Wrapping the Scene

Performance: Master complete · Each main actor has a strong take · Emotional turning point covered · Reactions captured · Dialogue understandable.

Visual: Establishing · Master wide · Mediums · Close-ups · OTSs · Inserts · Cutaways · POVs · Entrance/exit · Clean plates.

Technical: Focus on playback · Exposure · White balance consistent · No unwanted flicker · No clipped audio · Timecode synced · Files readable · Camera reports match · Media backed up when possible.

Sound: Primary dialogue · Backup audio · Room tone · Footsteps · Doors · Props · Clothing · Environment · Important wild lines.`,
  },
  {
    id: "scene-coverage-tracking-sheet",
    category: "movement",
    title: "On-set shot tracking sheet",
    summary: "Printable-style checklist for required coverage and best-take notes.",
    keywords: ["tracking sheet", "slate", "take notes", "checklist"],
    tables: [
      {
        headers: ["Field", "Fill in"],
        rows: [
          ["Scene", "__________"],
          ["Setup", "__________"],
        ],
      },
      {
        headers: ["Required coverage", "Done"],
        rows: [
          ["Establishing shot", "[ ]"],
          ["Master wide", "[ ]"],
          ["Medium wide", "[ ]"],
          ["Two-shot", "[ ]"],
          ["Over-the-shoulder Actor A", "[ ]"],
          ["Over-the-shoulder Actor B", "[ ]"],
          ["Medium Actor A", "[ ]"],
          ["Medium Actor B", "[ ]"],
          ["Close-up Actor A", "[ ]"],
          ["Close-up Actor B", "[ ]"],
          ["Reaction Actor A", "[ ]"],
          ["Reaction Actor B", "[ ]"],
          ["Point-of-view shot", "[ ]"],
          ["Insert 1 / Insert 2", "[ ] / [ ]"],
          ["Cutaway 1", "[ ]"],
          ["Entrance / Exit", "[ ] / [ ]"],
          ["Moving shot", "[ ]"],
          ["Clean plate", "[ ]"],
          ["Room tone", "[ ]"],
          ["Wild lines", "[ ]"],
          ["Slow-motion option", "[ ]"],
          ["Vertical version", "[ ]"],
          ["Safety take", "[ ]"],
        ],
      },
      {
        headers: ["Take notes", "Value"],
        rows: [
          ["Best wide take", "__________"],
          ["Best Actor A take", "__________"],
          ["Best Actor B take", "__________"],
          ["Best reaction", "__________"],
          ["Best insert", "__________"],
          ["Audio issue", "__________"],
          ["Focus issue", "__________"],
          ["Continuity issue", "__________"],
          ["Additional shot needed", "__________"],
        ],
      },
    ],
    body: `## The Most Important Rule

Do not think only about recording the person who is speaking.

For every important moment, capture:

* The person performing the action
* The person watching the action
* The object or event causing the reaction
* The environment around them
* The emotional result

That combination gives the editor enough material to create rhythm, tension, emotion, and clarity.`,
  },
];
