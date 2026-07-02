import { Project, ProjectStatus } from "@/lib/types";
import { ScoutProject } from "@/lib/scout/types";
import { ProductionBoard } from "@/lib/production/types";
import { scoutWorkflowSteps } from "@/lib/scout/scoutWorkflow";
import {
  DEFAULT_SCOUT_SESSION_FORM,
  ScoutSessionFormValues,
  scoutProjectToFormValues,
} from "@/lib/scout/sessionForm";

const SCOUT_LINK_STATUS_ORDER: Record<ProjectStatus, number> = {
  signed: 0,
  completed: 1,
  ready_for_signature: 2,
  draft: 3,
  archived: 4,
};

/** Seeded package rows use the package name as projectName and often have no client. */
export function isLikelyTemplateOrDemoProject(p: Project): boolean {
  return !p.clientId && !p.clientName?.trim();
}

export function sortProjectsForScoutLink(projects: Project[]): Project[] {
  return [...projects].sort((a, b) => {
    const statusDiff =
      (SCOUT_LINK_STATUS_ORDER[a.status] ?? 99) - (SCOUT_LINK_STATUS_ORDER[b.status] ?? 99);
    if (statusDiff !== 0) return statusDiff;
    return a.projectName.localeCompare(b.projectName);
  });
}

export function formatProjectLinkLabel(p: Project): string {
  const client = p.clientName?.trim();
  const status = p.status.replace(/_/g, " ");
  if (client) return `${p.projectName} — ${client} (${status})`;
  return `${p.projectName} (${status})`;
}

/** Prefer real bookings; hide package-template seed rows when real projects exist. */
export function projectsForScoutLinkDisplay(projects: Project[]): Project[] {
  const sorted = sortProjectsForScoutLink(projects);
  const real = sorted.filter((p) => !isLikelyTemplateOrDemoProject(p));
  return real.length > 0 ? real : sorted;
}

export function suggestScoutSessionName(project: Project): string {
  return `${project.projectName} — location scout`;
}

export function projectLocationHint(project: Project): string | undefined {
  const loc = project.location?.trim();
  if (!loc) return undefined;
  return `Location from project: ${loc}. Describe the scene, subject, and mood for this scout.`;
}

function scoutCreatedAtMs(project: ScoutProject): number {
  const raw = project.createdAt as { toMillis?: () => number; seconds?: number } | string | undefined;
  if (raw && typeof raw === "object") {
    if (typeof raw.toMillis === "function") return raw.toMillis();
    if (typeof raw.seconds === "number") return raw.seconds * 1000;
  }
  if (typeof raw === "string") {
    const ms = Date.parse(raw);
    return Number.isNaN(ms) ? 0 : ms;
  }
  return 0;
}

export function sortScoutSessionsNewestFirst(sessions: ScoutProject[]): ScoutProject[] {
  return [...sessions].sort((a, b) => scoutCreatedAtMs(b) - scoutCreatedAtMs(a));
}

/** Whether a scout session belongs to this production project (by link id or name). */
export function scoutSessionMatchesProject(
  session: ScoutProject,
  projectId: string,
  projectName?: string
): boolean {
  if (session.linkedProjectId === projectId) return true;

  const linkedOther = session.linkedProjectId?.trim();
  if (linkedOther && linkedOther !== projectId) return false;

  if (!projectName?.trim()) return false;
  const pn = projectName.trim().toLowerCase();
  const linkedName = session.linkedProjectName?.trim().toLowerCase();
  if (linkedName === pn) return true;

  const sessionName = session.projectName.trim().toLowerCase();
  if (sessionName === pn) return true;
  if (sessionName === `${pn} — location scout`.toLowerCase()) return true;
  return false;
}

/** All scout sessions for a project from a loaded session list plus explicit ids. */
export function pickScoutSessionsForProject(
  sessions: ScoutProject[],
  projectId: string,
  options?: {
    boardLinkedScoutIds?: string[];
    scriptScoutIds?: string[];
    projectName?: string;
  }
): ScoutProject[] {
  const extraIds = new Set(
    [...(options?.boardLinkedScoutIds ?? []), ...(options?.scriptScoutIds ?? [])].filter(Boolean)
  );

  const map = new Map<string, ScoutProject>();
  for (const session of sessions) {
    if (
      extraIds.has(session.id) ||
      scoutSessionMatchesProject(session, projectId, options?.projectName)
    ) {
      map.set(session.id, session);
    }
  }
  return sortScoutSessionsNewestFirst([...map.values()]);
}

export function primaryScoutSessionForProject(
  sessions: ScoutProject[],
  projectId: string,
  options?: {
    boardLinkedScoutIds?: string[];
    scriptScoutIds?: string[];
    projectName?: string;
  }
): ScoutProject | undefined {
  return pickScoutSessionsForProject(sessions, projectId, options)[0];
}

/** Resume an in-progress scout at the next incomplete workflow step. */
export function scoutResumeHref(scoutId: string, session: ScoutProject, imageCount = 0): string {
  const steps = scoutWorkflowSteps(scoutId, session, imageCount);
  const next = steps.find((step) => !step.done);
  if (next?.href) return next.href;
  return `/scout/${scoutId}`;
}

/** Open the linked scout session when one exists; otherwise start the new-session flow. */
export function scoutHrefForProject(
  projectId: string,
  sessions: ScoutProject[],
  options?: {
    projectName?: string;
    boardLinkedScoutIds?: string[];
    scriptScoutIds?: string[];
  }
): string {
  const match = primaryScoutSessionForProject(sessions, projectId, options);
  if (match) return scoutResumeHref(match.id, match);
  return `/scout/new?projectId=${encodeURIComponent(projectId)}`;
}

export function scoutNewHrefForProject(projectId: string, forceNew = false): string {
  const q = new URLSearchParams({ projectId });
  if (forceNew) q.set("forceNew", "1");
  return `/scout/new?${q.toString()}`;
}

/** Pre-fill new-session form from an existing scout and/or production board script fields. */
export function prefillScoutSessionForm(
  project: Project,
  options?: {
    existingScout?: ScoutProject | null;
    board?: ProductionBoard | null;
    current?: ScoutSessionFormValues;
  }
): ScoutSessionFormValues {
  const base = options?.current ?? DEFAULT_SCOUT_SESSION_FORM;
  const fromScout = options?.existingScout
    ? scoutProjectToFormValues(options.existingScout)
    : null;

  const sceneIdea =
    fromScout?.sceneIdea?.trim() ||
    options?.existingScout?.sceneIdea?.trim() ||
    options?.board?.logline?.trim() ||
    base.sceneIdea;

  return {
    ...base,
    ...(fromScout ?? {}),
    projectName: base.projectName.trim() || suggestScoutSessionName(project),
    sceneIdea,
    theme:
      fromScout?.theme?.trim() ||
      options?.existingScout?.theme?.trim() ||
      options?.board?.lookAndFeel?.trim() ||
      base.theme,
  };
}
