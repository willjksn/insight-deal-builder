/**
 * When the ShootSpine project is renamed, optionally rename the on-disk project folder
 * so Resolve / Explorer paths stay aligned with the name.
 */

import { sanitizePathSegment } from "@/lib/aiEditor/mediaPathBuilder";
import { isManagedShootSpinePath } from "@/lib/aiEditor/guidedWorkspace";

export type ProjectFolderRenamePlan =
  | { action: "none"; reason: "no_root" | "same_path" | "empty_name" }
  | {
      action: "rename";
      from: string;
      to: string;
      /** Parent looked like a ShootSpine-managed or recognizable project folder. */
      managed: boolean;
    }
  | { action: "name_only"; reason: "not_safe"; from: string };

function normalizeAbs(p: string): string {
  return p.trim().replace(/\//g, "\\").replace(/[\\]+$/, "");
}

function parentAndLeaf(abs: string): { parent: string; leaf: string } | null {
  const n = normalizeAbs(abs);
  const i = n.lastIndexOf("\\");
  if (i <= 0) return null;
  return { parent: n.slice(0, i), leaf: n.slice(i + 1) };
}

/** Folder looks like a ShootSpine project root (safe to rename the leaf). */
export function looksLikeShootSpineProjectRoot(projectRoot: string): boolean {
  if (isManagedShootSpinePath(projectRoot)) return true;
  const n = projectRoot.replace(/\//g, "\\").toLowerCase();
  // Common smoke / guided leftovers
  if (n.includes("shootspine")) return true;
  return false;
}

/**
 * Plan renaming `{parent}/{oldLeaf}` → `{parent}/{New_Project_Slug}`.
 * Never changes drive letter here — same-parent rename only (safe on one volume).
 */
export function planManagedProjectFolderRename(input: {
  currentProjectRoot?: string | null;
  newProjectName: string;
}): ProjectFolderRenamePlan {
  const name = input.newProjectName.trim();
  if (!name) return { action: "none", reason: "empty_name" };

  const fromRaw = input.currentProjectRoot?.trim();
  if (!fromRaw) return { action: "none", reason: "no_root" };

  const from = normalizeAbs(fromRaw);
  const parts = parentAndLeaf(from);
  if (!parts) return { action: "name_only", reason: "not_safe", from };

  if (!looksLikeShootSpineProjectRoot(from) && !isManagedShootSpinePath(from)) {
    return { action: "name_only", reason: "not_safe", from };
  }

  const newLeaf = sanitizePathSegment(name, 48);
  const sep = from.includes("/") && !from.includes("\\") ? "/" : "\\";
  const to = `${parts.parent}${sep}${newLeaf}`;

  if (normalizeAbs(to).toLowerCase() === from.toLowerCase()) {
    return { action: "none", reason: "same_path" };
  }

  return {
    action: "rename",
    from,
    to: normalizeAbs(to),
    managed: isManagedShootSpinePath(from),
  };
}
