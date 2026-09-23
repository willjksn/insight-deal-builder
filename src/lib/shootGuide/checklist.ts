import {
  CHECKLIST_GROUPS,
  type ShootGuide,
  type ShootGuideChecklistGroup,
  type ShootGuideChecklistItem,
} from "./types";

function clip(s: string, max = 110): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

function item(
  group: ShootGuideChecklistGroup,
  label: string,
  seed: string
): ShootGuideChecklistItem {
  return {
    id: `chk_${group}_${seed}`,
    group,
    label: clip(label),
    done: false,
  };
}

function unique(labels: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of labels) {
    const t = raw.replace(/\s+/g, " ").trim();
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

export function buildChecklistFromGuide(guide: ShootGuide): ShootGuideChecklistItem[] {
  const analysis = guide.sceneAnalysis;
  const setup = guide.setup;
  const shots = guide.shots ?? [];
  const env = analysis?.environment || setup?.locationNotes || "";
  const subject = analysis?.subject || "the subject";
  const prompt = `${guide.prompt} ${guide.title} ${analysis?.action || ""}`.toLowerCase();
  const workout = /treadmill|workout|run|sweat|gym/.test(prompt);
  const mos = shots.some((s) => /mos/i.test(`${s.audioRequirements || ""} ${s.specialRequirements || ""}`));

  const room: ShootGuideChecklistItem[] = [];
  room.push(
    item("room", env ? `Clear clutter in ${clip(env, 70)} so the wide is clean.` : "Clear clutter from the frame.", "clutter")
  );
  room.push(item("room", "Dim practicals under the key so they don’t fight the look.", "practicals"));
  if (setup?.locationNotes) {
    room.push(item("room", `Location: ${setup.locationNotes}`, "location"));
  }
  if (setup?.cameraPlacement) {
    room.push(item("room", `Marks / placement: ${setup.cameraPlacement}`, "marks"));
  }

  const camera: ShootGuideChecklistItem[] = [];
  const bodies = unique(shots.map((s) => s.camera || "").filter(Boolean));
  const lenses = unique(shots.map((s) => s.lens || s.focalLength || "").filter(Boolean));
  const supports = unique(shots.map((s) => s.support || "").filter(Boolean));
  if (bodies.length) camera.push(item("camera", `Bodies on the cart: ${bodies.join(", ")}.`, "bodies"));
  if (lenses.length) camera.push(item("camera", `Lenses pulled: ${lenses.join(", ")}.`, "lenses"));
  if (supports.length) camera.push(item("camera", `Support: ${supports.join(", ")}.`, "support"));
  if (setup?.cameraSettings) {
    camera.push(item("camera", `Set ${setup.cameraSettings}`, "settings"));
  }
  if (guide.lightingPlan?.cameraWb) {
    camera.push(item("camera", `Lock WB at ${guide.lightingPlan.cameraWb}.`, "wb"));
  }
  camera.push(item("camera", "Fresh media, charged batteries, and a formatted spare.", "media"));

  const lighting: ShootGuideChecklistItem[] = [];
  const fixtures = guide.lightingPlan?.fixtures ?? [];
  if (fixtures.length) {
    for (const fx of fixtures.slice(0, 6)) {
      lighting.push(
        item(
          "lighting",
          [fx.role && fx.role.toUpperCase(), fx.fixture, fx.placement, fx.kelvin]
            .filter(Boolean)
            .join(" · ") || "Set fixture",
          fx.id
        )
      );
    }
  } else if (setup?.lightingNotes) {
    lighting.push(item("lighting", setup.lightingNotes, "notes"));
  } else {
    lighting.push(item("lighting", "Set the scene key before you change it per shot.", "key"));
  }

  const audio: ShootGuideChecklistItem[] = [];
  if (mos) {
    audio.push(item("audio", "Treat the scene MOS unless you specifically want machine/room noise.", "mos"));
  } else {
    audio.push(item("audio", "Confirm recorder, lav or boom, and slate/sync.", "rec"));
  }
  audio.push(item("audio", "Grab 30 seconds of room tone in this space.", "tone"));

  const continuity: ShootGuideChecklistItem[] = [];
  continuity.push(item("continuity", `Wardrobe and hair consistent on ${subject}.`, "wardrobe"));
  if (workout) {
    continuity.push(
      item("continuity", "Sweat and effort increase shot to shot — do not reset a dry look after a closer.", "sweat")
    );
  }
  const contNotes = unique(shots.map((s) => s.continuityRequirements || "").filter(Boolean));
  for (const note of contNotes.slice(0, 4)) {
    continuity.push(item("continuity", note, `n_${normId(note)}`));
  }

  const shotItems: ShootGuideChecklistItem[] = shots.map((s) =>
    item(
      "shot",
      `Shot ${String(s.shotNumber).padStart(2, "0")} · ${s.title}: slate, frame, focus, roll, tail.`,
      s.id
    )
  );

  const wrap: ShootGuideChecklistItem[] = [
    item("wrap", "Clean plates of the room/machine without talent.", "plates"),
    item("wrap", "Continuity stills (wardrobe, marks, lighting) before you strike.", "stills"),
    item("wrap", "Notes on circled takes and anything the edit must know.", "notes"),
  ];

  const all = [...room, ...camera, ...lighting, ...audio, ...continuity, ...shotItems, ...wrap];
  return all.filter((row) => Boolean(row.label));
}

function normId(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 24);
}

export function mergeChecklist(
  existing: ShootGuideChecklistItem[] | undefined,
  next: ShootGuideChecklistItem[]
): ShootGuideChecklistItem[] {
  const done = new Map(
    (existing ?? [])
      .filter((i) => i.done)
      .map((i) => [`${i.group}:${i.label.toLowerCase()}`, true] as const)
  );
  return next.map((i) => ({
    ...i,
    done: Boolean(done.get(`${i.group}:${i.label.toLowerCase()}`)),
  }));
}

export function checklistNeedsBuild(guide: Pick<ShootGuide, "shots" | "checklist">): boolean {
  if (!(guide.shots ?? []).length) return false;
  const groups = new Set((guide.checklist ?? []).map((i) => i.group));
  return (guide.checklist ?? []).length < 4 || CHECKLIST_GROUPS.some((g) => !groups.has(g));
}
