/** Granular access areas for a production project. */
export type ProjectAccessArea = "scripts" | "scout" | "production" | "shots";

export interface ProjectAccessPermissions {
  scripts: boolean;
  scout: boolean;
  production: boolean;
  shots: boolean;
}

export const EMPTY_PROJECT_ACCESS: ProjectAccessPermissions = {
  scripts: false,
  scout: false,
  production: false,
  shots: false,
};

export const FULL_PROJECT_ACCESS: ProjectAccessPermissions = {
  scripts: true,
  scout: true,
  production: true,
  shots: true,
};

export interface ProjectMember {
  userId: string;
  email: string;
  displayName?: string;
  permissions: ProjectAccessPermissions;
  addedByUserId: string;
  addedAt: string;
}

/** Direct share on a script or scout session (before / without project link). */
export interface ResourceMember {
  userId: string;
  email: string;
  displayName?: string;
  permissions: Pick<ProjectAccessPermissions, "scripts" | "scout">;
  addedByUserId: string;
  addedAt: string;
}

export const PROJECT_ACCESS_LABELS: Record<ProjectAccessArea, string> = {
  scripts: "Scripts",
  scout: "Legacy scout (unused)",
  production: "Prep board",
  shots: "Coverage & day shots",
};
