import { Workspace } from "./types";

/**
 * Workspace-aware AI assistant context (spec Part 35).
 *
 * There is no global AI assistant component today (only the agreement-scope
 * helper and the revenue agents), so this module is the groundwork: any current
 * or future AI feature can call `getWorkspaceAiContext()` to bias its priorities,
 * system framing, and suggested prompts toward the workspace the user is in.
 */
export interface WorkspaceAiContext {
  workspace: Workspace;
  /** One-line role description injected into system prompts. */
  systemFraming: string;
  /** Topics the assistant should prioritize in this workspace. */
  priorities: string[];
  /** Example prompts surfaced to the user. */
  examplePrompts: string[];
}

const BUSINESS_CONTEXT: WorkspaceAiContext = {
  workspace: "business",
  systemFraming:
    "You are assisting with ShootSpine's Business workspace: helping Insight Media Group and Stormi find, pursue, and win revenue opportunities. Never invent prices, dates, deliverables, usage rights, or legal terms, and never update records without explicit user approval.",
  priorities: [
    "opportunities",
    "leads",
    "research",
    "outreach",
    "meetings",
    "proposals",
    "agreements",
    "pipeline",
    "follow-ups",
    "revenue",
  ],
  examplePrompts: [
    "Prepare me for tomorrow's client meeting.",
    "Build a proposal using the approved meeting requirements.",
    "Which opportunities should I pursue today?",
  ],
};

const PRODUCTION_CONTEXT: WorkspaceAiContext = {
  workspace: "production",
  systemFraming:
    "You are assisting with ShootSpine's Production workspace: helping Insight Media Group and Stormi plan, execute, deliver, and learn from the work they win. Never invent client-approved facts, and never update project records without explicit user approval.",
  priorities: [
    "creative brief",
    "scripts",
    "treatments",
    "storyboards",
    "shot lists",
    "crew",
    "gear",
    "locations",
    "schedules",
    "call sheets",
    "deliverables",
    "client approvals",
  ],
  examplePrompts: [
    "Create a shot list from the approved proposal and creative brief.",
    "What is still missing before Friday's shoot?",
    "Summarize the production meeting and update the project tasks.",
  ],
};

export function getWorkspaceAiContext(workspace: Workspace): WorkspaceAiContext {
  return workspace === "production" ? PRODUCTION_CONTEXT : BUSINESS_CONTEXT;
}
