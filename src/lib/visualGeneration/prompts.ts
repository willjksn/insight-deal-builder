import { SCENE_OUTPUT_LABELS, type ShootGuide, type ShootGuideShot, type ShotVisualAsset } from "@/lib/shootGuide/types";
import type { VisualReferenceImage } from "./types";

const REFERENCE_TAGS: Record<string, string> = {
  subject: "actor",
  location: "location",
  wardrobe: "wardrobe",
};

export function selectReferenceImages(
  guide: Pick<ShootGuide, "references">
): VisualReferenceImage[] {
  const picked: VisualReferenceImage[] = [];
  for (const kind of ["subject", "wardrobe", "location"]) {
    const ref = (guide.references ?? []).find(
      (item) => item.kind === kind && item.storageUrl?.startsWith("https://")
    );
    const tag = REFERENCE_TAGS[kind];
    if (!ref?.storageUrl || !tag) continue;
    picked.push({ uri: ref.storageUrl, tag });
    if (picked.length >= 3) break;
  }
  return picked;
}

export function motionDurationSeconds(shot: Pick<ShootGuideShot, "duration">): number {
  const match = String(shot.duration || "").match(/(\d+(\.\d+)?)/);
  const value = match ? Number(match[1]) : 4;
  if (!Number.isFinite(value)) return 4;
  return Math.min(10, Math.max(2, Math.round(value)));
}

type ScenePrompt = Partial<Pick<ShootGuide, "prompt" | "creativeIntent" | "outputType" | "sceneAnalysis" | "visualAnalysis">>;
type ShotPrompt = Partial<
  Pick<
    ShootGuideShot,
    | "title"
    | "purpose"
    | "framing"
    | "lens"
    | "focalLength"
    | "cameraAngle"
    | "movement"
    | "lightingChanges"
    | "duration"
    | "blocking"
    | "performanceDirection"
    | "specialRequirements"
  >
>;

type PromptSection = { priority: number; text: string };

function text(value: string | null | undefined): string {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

function tagsOf(references: VisualReferenceImage[]): Set<string> {
  return new Set(references.map((ref) => ref.tag));
}

function joinSections(sections: PromptSection[]): string {
  return sections
    .map((section) => section.text.trim())
    .filter(Boolean)
    .join(" ");
}

function shortenSection(value: string, max: number): string {
  if (value.length <= max) return value;
  if (max <= 0) return "";
  const slice = value.slice(0, max);
  const space = slice.lastIndexOf(" ");
  return (space > 12 ? slice.slice(0, space) : slice).trim();
}

/** Drops or shortens the lowest-priority section first. Never slices the joined prompt. */
export function assemblePrompt(sections: PromptSection[], maxCharacters: number): string {
  let kept = sections
    .map((section) => ({ priority: section.priority, text: text(section.text) }))
    .filter((section) => section.text);
  const over = () => joinSections(kept).length > maxCharacters;
  while (over()) {
    const lowest = [...kept].sort((a, b) => b.priority - a.priority)[0];
    if (!lowest) break;
    const others = kept.filter((section) => section !== lowest);
    const budget = maxCharacters - joinSections(others).length - (others.length ? 1 : 0);
    const shortened = shortenSection(lowest.text, budget);
    if (lowest.priority === 1) {
      kept = [{ priority: 1, text: shortenSection(lowest.text, maxCharacters) }];
      break;
    }
    if (shortened && shortened.length < lowest.text.length && budget > 0) {
      kept = kept.map((section) => (section === lowest ? { ...section, text: shortened } : section));
      break;
    }
    kept = others;
  }
  return [...kept].sort((a, b) => a.priority - b.priority).reduce((prompt, section) => {
    return prompt ? `${prompt} ${section.text}` : section.text;
  }, "");
}

function subjectAction(shot: ShotPrompt): string {
  return text(shot.purpose) || text(shot.blocking) || text(shot.performanceDirection) || text(shot.title);
}

export function buildStillPrompt(
  scene: ScenePrompt,
  shot: ShotPrompt,
  references: VisualReferenceImage[],
  maxCharacters: number
): string {
  const tags = tagsOf(references);
  const description = [text(shot.title), text(shot.purpose)].filter(Boolean).join(". ");
  const action = text(shot.blocking) || text(shot.performanceDirection);
  const framing = [text(shot.framing) ? `Framing: ${text(shot.framing)}` : "", text(shot.cameraAngle) ? `Camera angle: ${text(shot.cameraAngle)}` : ""]
    .filter(Boolean)
    .join(" ");
  const lens = [text(shot.lens), text(shot.focalLength)].filter(Boolean).join(", ");
  const look = [text(scene.creativeIntent), text(scene.visualAnalysis?.palette), text(scene.visualAnalysis?.energy)]
    .filter(Boolean)
    .join(", ");
  const sceneContext = [
    text(scene.prompt) ? `Scene description: ${text(scene.prompt)}` : "",
    text(scene.sceneAnalysis?.subject) ? `Subject: ${text(scene.sceneAnalysis?.subject)}` : "",
    text(scene.sceneAnalysis?.environment) ? `Location: ${text(scene.sceneAnalysis?.environment)}` : "",
    scene.outputType ? `Mode: ${SCENE_OUTPUT_LABELS[scene.outputType]}` : "",
  ]
    .filter(Boolean)
    .join(" ");
  const notes = [lens ? `Lens/look: ${lens}` : "", text(shot.specialRequirements) ? `Notes: ${text(shot.specialRequirements)}` : ""]
    .filter(Boolean)
    .join(" ");
  return assemblePrompt(
    [
      {
        priority: 1,
        text: ["Create a cinematic still.", description ? `Shot description: ${description}` : "", action ? `Subject action: ${action}` : ""]
          .filter(Boolean)
          .join(" "),
      },
      { priority: 2, text: framing },
      {
        priority: 3,
        text: tags.has("actor")
          ? "SUBJECT @actor: Preserve the referenced actor exactly: face, skin tone, hairstyle, proportions, age, and likeness."
          : "",
      },
      {
        priority: 4,
        text: tags.has("location")
          ? "ENVIRONMENT @location: Match the location reference: layout, furniture, architecture, equipment, and placement."
          : "",
      },
      {
        priority: 5,
        text: tags.has("wardrobe")
          ? "WARDROBE @wardrobe: Preserve the referenced wardrobe, colors, fit, and styling unless the shot says otherwise."
          : "",
      },
      { priority: 6, text: text(shot.movement) ? `Camera movement intent: ${text(shot.movement)}` : "" },
      { priority: 7, text: text(shot.lightingChanges) ? `Lighting intent: ${text(shot.lightingChanges)}` : "" },
      { priority: 8, text: sceneContext },
      { priority: 9, text: look ? `Mood/look: ${look}` : "" },
      { priority: 10, text: notes },
      {
        priority: 11,
        text: "Photorealistic cinematic frame. No extra people, unexplained props, distorted hands, face, or limbs. No text, logos, or watermarks. Only this shot.",
      },
    ],
    maxCharacters
  );
}

export function buildMotionPrompt(
  _scene: ScenePrompt,
  shot: ShotPrompt,
  _sourceAsset: Pick<ShotVisualAsset, "prompt"> | null,
  references: VisualReferenceImage[],
  durationSeconds: number,
  maxCharacters: number
): string {
  const tags = tagsOf(references);
  const action = subjectAction(shot);
  const movement = text(shot.movement);
  return assemblePrompt(
    [
      { priority: 1, text: action ? `SUBJECT ACTION: ${action}` : "SUBJECT ACTION: Continue the action already visible in the source image." },
      {
        priority: 2,
        text: movement
          ? `CAMERA MOVEMENT: ${movement}. One smooth cinematic move. No shake, no sudden zoom, no reframing.`
          : "CAMERA MOVEMENT: Locked and stable. No zoom, no reframing, no perspective change.",
      },
      { priority: 3, text: `Duration: ${durationSeconds} seconds.` },
      {
        priority: 4,
        text: [
          tags.has("actor") ? "Preserve the referenced actor's identity, face, hairstyle, and body proportions." : "",
          tags.has("wardrobe") ? "Preserve the referenced wardrobe." : "",
        ]
          .filter(Boolean)
          .join(" "),
      },
      {
        priority: 5,
        text: [
          "Keep the source image composition, lighting, and color.",
          tags.has("location") ? "Preserve the referenced environment and room layout." : "",
        ]
          .filter(Boolean)
          .join(" "),
      },
      {
        priority: 6,
        text: "Natural, subtle, physically believable motion. Do not add people or props. Do not warp the face, hands, or limbs.",
      },
    ],
    maxCharacters
  );
}

export function latestReadyStill(shot: ShootGuideShot) {
  const stills = (shot.visualAssets ?? []).filter(
    (asset) =>
      asset.status === "ready" &&
      asset.storageUrl &&
      (asset.type === "ai_still" || asset.type === "storyboard")
  );
  return [...stills].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;
}
