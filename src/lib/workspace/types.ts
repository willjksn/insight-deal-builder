export type Workspace = "business" | "production" | "scene-builder";

export const WORKSPACES: Workspace[] = ["business", "production", "scene-builder"];

export const WORKSPACE_LABELS: Record<Workspace, string> = {
  business: "Business",
  production: "Production",
  "scene-builder": "Scene Builder",
};

export const WORKSPACE_TAGLINES: Record<Workspace, string> = {
  business: "Find, pursue, and win revenue",
  production: "Plan, shoot, and deliver the work",
  "scene-builder": "Build a scene, plan the shots, then send it to production",
};

export const WORKSPACE_HOME: Record<Workspace, string> = {
  business: "/dashboard",
  production: "/dashboard",
  "scene-builder": "/scene-builder",
};

/** localStorage key used to remember the user's most recently selected workspace. */
export const WORKSPACE_STORAGE_KEY = "shootspine:workspace";

/** Older builds stored the third workspace as "shoot-guide". */
export function readStoredWorkspace(value: unknown): Workspace | null {
  if (value === "shoot-guide" || value === "scene-builder") return "scene-builder";
  if (value === "business" || value === "production") return value;
  return null;
}

export function isWorkspace(value: unknown): value is Workspace {
  return value === "business" || value === "production" || value === "scene-builder";
}
