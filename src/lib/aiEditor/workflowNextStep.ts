/**
 * V18 — “Continue where you left off”: next incomplete AI Editor step.
 */

export type WorkflowStepId =
  | "connect"
  | "workspace"
  | "footage"
  | "prepare"
  | "analyze"
  | "match"
  | "rough_cut"
  | "chat"
  | "look"
  | "resolve"
  | "archive"
  | "wrap_up";

export type WorkflowNextStep = {
  id: WorkflowStepId;
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

const STEPS: Array<{
  id: WorkflowStepId;
  n: number;
  title: string;
  detail: string;
  done: (f: WorkflowStepFlags) => boolean;
}> = [
  {
    id: "connect",
    n: 1,
    title: "Connect this computer",
    detail: "Start the Desktop Agent so AI Editor can read your drives.",
    done: (f) => f.connected,
  },
  {
    id: "workspace",
    n: 2,
    title: "Choose where this edit lives",
    detail: "Set your edit folder (SSD) and optional backup (HDD).",
    done: (f) => f.hasProjectRoot,
  },
  {
    id: "footage",
    n: 3,
    title: "Add your footage",
    detail: "Point at clips on disk — nothing uploads to the cloud.",
    done: (f) => f.hasMedia,
  },
  {
    id: "prepare",
    n: 4,
    title: "Prepare clips for smooth editing",
    detail: "Make light preview copies for tough camera formats.",
    done: (f) => f.prepareDone,
  },
  {
    id: "analyze",
    n: 5,
    title: "Understand your footage",
    detail: "Run local analysis so matching and search have something to work with.",
    done: (f) => f.analyzeDone,
  },
  {
    id: "match",
    n: 6,
    title: "Match to the plan",
    detail: "Score clips against planned shots and coverage.",
    done: (f) => f.matchDone,
  },
  {
    id: "rough_cut",
    n: 7,
    title: "Build a rough cut",
    detail: "Assemble a first timeline from coverage or selects.",
    done: (f) => f.roughCutDone,
  },
  {
    id: "chat",
    n: 8,
    title: "Edit by chat",
    detail: "Tighten the cut with plain-language edits (optional).",
    done: (f) => f.chatDone,
  },
  {
    id: "look",
    n: 9,
    title: "Set the look",
    detail: "Mood and transition tips for Resolve finishing.",
    done: (f) => f.lookDone,
  },
  {
    id: "resolve",
    n: 10,
    title: "Finish in Resolve",
    detail: "Write the handoff package or bring the cut into Resolve.",
    done: (f) => f.resolveDone,
  },
  {
    id: "archive",
    n: 11,
    title: "Backup & free space",
    detail: "Copy footage to your backup drive when you’re ready.",
    done: (f) => f.archiveDone,
  },
  {
    id: "wrap_up",
    n: 12,
    title: "How did finishing go?",
    detail: "Quick wrap-up so the next edit starts with a better look default.",
    done: (f) => f.wrapUpDone,
  },
];

/** First incomplete step, or null when the workflow looks complete. */
export function getWorkflowNextStep(flags: WorkflowStepFlags): WorkflowNextStep | null {
  for (const step of STEPS) {
    if (!step.done(flags)) {
      return {
        id: step.id,
        n: step.n,
        title: step.title,
        detail: step.detail,
        anchor: `ai-step-${step.n}`,
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
