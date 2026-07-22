export type Workspace = "business" | "production";

export const WORKSPACES: Workspace[] = ["business", "production"];

export const WORKSPACE_LABELS: Record<Workspace, string> = {
  business: "Business",
  production: "Production",
};

export const WORKSPACE_TAGLINES: Record<Workspace, string> = {
  business: "Find, pursue, and win revenue",
  production: "Plan, shoot, and deliver the work",
};

/** localStorage key used to remember the user's most recently selected workspace. */
export const WORKSPACE_STORAGE_KEY = "shootspine:workspace";

export function isWorkspace(value: unknown): value is Workspace {
  return value === "business" || value === "production";
}
