import { Project, ProjectStatus } from "@/lib/types";

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
