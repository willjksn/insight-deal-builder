/**
 * V18 — “Continue where you left off”: next incomplete AI Editor step.
 */

import {
  type AiEditorLogicalStep,
  type VisibleStepsOptions,
  buildDisplayStepNumbers,
  listVisibleLogicalSteps,
  LOGICAL_STEP_ANCHOR_N,
} from "@/lib/aiEditor/visibleSteps";

export type WorkflowStepId = AiEditorLogicalStep;

export type WorkflowNextStep = {
  id: WorkflowStepId;
  /** Display number (renumbers when steps are hidden). */
  n: number;
  title: string;
  detail: string;
  /** DOM anchor on the project AI Editor page */
  anchor: string;
};

export type WorkflowStepFlags = {
  connected: boolean;
  hasProjectRoot: boolean;
  hasMedia: boolean;
  prepareDone: boolean;
  analyzeDone: boolean;
  matchDone: boolean;
  roughCutDone: boolean;
  chatDone: boolean;
  lookDone: boolean;
  resolveDone: boolean;
  archiveDone: boolean;
  wrapUpDone: boolean;
};

const STEP_COPY: Record<
  AiEditorLogicalStep,
  { title: string; detail: string; done: (f: WorkflowStepFlags) => boolean }
> = {
  connect: {
    title: "Connect this computer",
    detail: "Start the Desktop Agent so AI Editor can read your drives.",
    done: (f) => f.connected,
  },
  footage: {
    title: "Get footage in",
    detail: "Copy from the camera card onto your SSD — ShootSpine picks the folders.",
    // Guided card covers workspace + media
    done: (f) => f.hasProjectRoot && f.hasMedia,
  },
  prepare: {
    title: "Prepare clips for smooth editing",
    detail: "Make light preview copies for tough camera formats.",
    done: (f) => f.prepareDone,
  },
  analyze: {
    title: "Understand your footage",
    detail: "Run local analysis so matching and search have something to work with.",
    done: (f) => f.analyzeDone,
  },
  match: {
    title: "Match to the plan",
    detail: "Score clips against planned shots and coverage.",
    done: (f) => f.matchDone,
  },
  rough_cut: {
    title: "Build a rough cut",
    detail: "Assemble a first timeline from coverage or selects.",
    done: (f) => f.roughCutDone,
  },
  chat: {
    title: "Edit by chat",
    detail: "Tighten the cut with plain-language edits (optional).",
    done: (f) => f.chatDone,
  },
  look: {
    title: "Set the look",
    detail: "Mood and transition tips for Resolve finishing.",
    done: (f) => f.lookDone,
  },
  resolve: {
    title: "Finish in Resolve",
    detail: "Write the handoff package or bring the cut into Resolve.",
    done: (f) => f.resolveDone,
  },
  archive: {
    title: "Backup & free space",
    detail: "Copy footage to your backup drive when you’re ready.",
    done: (f) => f.archiveDone,
  },
  wrap_up: {
    title: "How did finishing go?",
    detail: "Quick wrap-up so the next edit starts with a better look default.",
    done: (f) => f.wrapUpDone,
  },
};

const DEFAULT_VISIBILITY: VisibleStepsOptions = {
  showPrepare: true,
  showPlanSteps: true,
};

/** First incomplete visible step, or null when the workflow looks complete. */
export function getWorkflowNextStep(
  flags: WorkflowStepFlags,
  visibility: VisibleStepsOptions = DEFAULT_VISIBILITY
): WorkflowNextStep | null {
  const order = listVisibleLogicalSteps(visibility);
  const display = buildDisplayStepNumbers(visibility);
  for (const id of order) {
    const meta = STEP_COPY[id];
    if (!meta.done(flags)) {
      return {
        id,
        n: display[id],
        title: meta.title,
        detail: meta.detail,
        anchor: `ai-step-${LOGICAL_STEP_ANCHOR_N[id]}`,
      };
    }
  }
  return null;
}

export type AiEditorResumeBookmark = {
  projectId: string;
  projectName: string;
  stepN: number;
  stepTitle: string;
  stepDetail: string;
  anchor: string;
  updatedAt: number;
};

export const AI_EDITOR_RESUME_KEY = "shootspine.aiEditor.resume";

export function readResumeBookmark(): AiEditorResumeBookmark | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(AI_EDITOR_RESUME_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AiEditorResumeBookmark;
    if (!parsed?.projectId || !parsed?.projectName) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeResumeBookmark(bookmark: AiEditorResumeBookmark): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(AI_EDITOR_RESUME_KEY, JSON.stringify(bookmark));
  } catch {
    /* private mode / quota */
  }
}
