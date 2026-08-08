/**
 * V1.6 — finishing suggestions (transitions + mood/look notes for Resolve).
 * ShootSpine suggests; Resolve does the real color and effects.
 */

import { secondsToFrames } from "@/lib/aiEditor/frames";
import { newId } from "@/lib/aiEditor/timeline";
import type {
  FinishingMoodId,
  FinishingPlan,
  Timeline,
  TimelineClip,
  TransitionStyleId,
  TransitionType,
} from "@/lib/aiEditor/types";

export type MoodPreset = {
  id: FinishingMoodId;
  label: string;
  blurb: string;
  lookNotes: string[];
  resolveHint: string;
};

export type TransitionPreset = {
  id: TransitionStyleId;
  label: string;
  blurb: string;
  type: TransitionType;
  /** Soft blend / fade length; ignored for hard cuts. */
  durationSeconds: number;
};

export const MOOD_PRESETS: MoodPreset[] = [
  {
    id: "natural",
    label: "Natural",
    blurb: "Clean and true-to-life — little grade needed.",
    lookNotes: [
      "Keep skin tones natural",
      "Gentle contrast, avoid heavy stylization",
      "Match cameras lightly if needed",
    ],
    resolveHint: "Neutral grade, light balance only",
  },
  {
    id: "warm",
    label: "Warm",
    blurb: "Soft golden feel — friendly and inviting.",
    lookNotes: [
      "Slight warm white balance bias",
      "Soft contrast; lift shadows a touch",
      "Protect skin from going orange",
    ],
    resolveHint: "Warm balance + soft contrast",
  },
  {
    id: "cool",
    label: "Cool",
    blurb: "Crisp and modern — a little blue in the shadows.",
    lookNotes: [
      "Cool shadows, keep midtones readable",
      "Skin: pull back cyan if faces go pale",
      "Clean highlights",
    ],
    resolveHint: "Cool teal-leaning shadows, clean mids",
  },
  {
    id: "cinematic",
    label: "Cinematic",
    blurb: "Richer contrast and a film-like presence.",
    lookNotes: [
      "Deeper blacks, controlled highlights",
      "Slight teal/orange separation if it fits the story",
      "Avoid crushing faces in shadow",
    ],
    resolveHint: "Film-like contrast; mild teal/orange if appropriate",
  },
  {
    id: "high_energy",
    label: "High energy",
    blurb: "Punchy and vivid — social / promo energy.",
    lookNotes: [
      "Stronger contrast and saturation",
      "Keep motion readable — don’t crush detail",
      "Watch skin saturation on close-ups",
    ],
    resolveHint: "Punchy contrast + sat; guard skin",
  },
];

export const TRANSITION_PRESETS: TransitionPreset[] = [
  {
    id: "cuts",
    label: "Hard cuts",
    blurb: "Straight cuts — fast and clean.",
    type: "cut",
    durationSeconds: 0,
  },
  {
    id: "soft_dissolves",
    label: "Soft blends",
    blurb: "Gentle dissolves between clips.",
    type: "dissolve",
    durationSeconds: 0.5,
  },
  {
    id: "fade_between",
    label: "Fade through black",
    blurb: "Short fades for chapter-like beats.",
    type: "fade",
    durationSeconds: 0.4,
  },
];

export function getMoodPreset(id: FinishingMoodId): MoodPreset {
  return MOOD_PRESETS.find((m) => m.id === id) || MOOD_PRESETS[0];
}

export function getTransitionPreset(id: TransitionStyleId): TransitionPreset {
  return TRANSITION_PRESETS.find((t) => t.id === id) || TRANSITION_PRESETS[0];
}

function videoClips(timeline: Timeline): TimelineClip[] {
  return timeline.tracks.find((t) => t.kind === "video")?.clips.slice() ?? [];
}

/** Apply mood + transition style onto the timeline (metadata + per-clip transitionOut). */
export function applyFinishingPlan(
  timeline: Timeline,
  input: { moodId: FinishingMoodId; transitionStyle: TransitionStyleId }
): { timeline: Timeline; plan: FinishingPlan } {
  const mood = getMoodPreset(input.moodId);
  const transition = getTransitionPreset(input.transitionStyle);
  const fps = timeline.frameRate || 24;
  const durationFrames =
    transition.type === "cut" ? 0 : Math.max(1, secondsToFrames(transition.durationSeconds, fps));

  const now = new Date().toISOString();
  const plan: FinishingPlan = {
    moodId: mood.id,
    moodLabel: mood.label,
    lookNotes: mood.lookNotes,
    resolveHint: mood.resolveHint,
    transitionStyle: transition.id,
    transitionLabel: transition.label,
    transitionType: transition.type,
    transitionDurationFrames: durationFrames,
    updatedAt: now,
  };

  const tracks = timeline.tracks.map((track) => {
    if (track.kind !== "video") return track;
    const clips = [...track.clips].sort((a, b) => a.timelineStartFrame - b.timelineStartFrame);
    return {
      ...track,
      clips: clips.map((clip, i) => {
        const isLast = i === clips.length - 1;
        if (isLast || transition.type === "cut") {
          return {
            ...clip,
            transitionOut: undefined,
          };
        }
        return {
          ...clip,
          transitionOut: {
            type: transition.type,
            durationFrames,
          },
        };
      }),
    };
  });

  return {
    plan,
    timeline: {
      ...timeline,
      tracks,
      finishing: plan,
      updatedAt: now,
    },
  };
}

/** Plain-language guide for the colorist / editor in Resolve. */
export function buildFinishingGuide(input: {
  plan: FinishingPlan;
  timelineName: string;
  clipCount: number;
}): string {
  const { plan, timelineName, clipCount } = input;
  const lines = [
    "ShootSpine look notes for Resolve",
    "================================",
    "",
    "These are suggestions — apply them in Resolve’s Color page.",
    "ShootSpine does not bake a grade into your footage.",
    "",
    `Timeline: ${timelineName}`,
    `Clips: ${clipCount}`,
    `Feel: ${plan.moodLabel}`,
    `Between clips: ${plan.transitionLabel}`,
    "",
    "Look",
    "----",
    plan.resolveHint,
    ...plan.lookNotes.map((n) => `• ${n}`),
    "",
    "Transitions",
    "-----------",
  ];

  if (plan.transitionType === "cut") {
    lines.push("Keep hard cuts between clips.");
  } else if (plan.transitionType === "dissolve") {
    lines.push(
      `Add short dissolves (~${plan.transitionDurationFrames} frames) between clips where it feels natural.`
    );
  } else {
    lines.push(
      `Use short fades through black (~${plan.transitionDurationFrames} frames) at bigger story beats.`
    );
  }

  lines.push(
    "",
    "Tip: After you import the rough cut, add transitions on the Edit page, then grade on Color."
  );
  return lines.join("\n");
}

export function summarizeFinishing(plan?: FinishingPlan | null): string | null {
  if (!plan) return null;
  return `${plan.moodLabel} · ${plan.transitionLabel}`;
}

/** Test helper — ensure apply is pure-ish (new ids not required). */
export function finishingPlanId(): string {
  return newId("finish");
}
