/**
 * V1.5 — Resolve open / Mac companion helpers.
 * Package is written under the managed project tree; camera bytes stay local.
 */

import { joinProjectRelative } from "@/lib/aiEditor/mediaPathResolver";

/** Relative folder under ProjectRoot for Resolve interchange. */
export const RESOLVE_HANDOFF_REL_DIR = "03_PROJECT_FILES/shootspine_resolve";

export const RESOLVE_HANDOFF_FILES = {
  edl: "shootspine_rough_cut.edl",
  manifest: "shootspine_handoff.json",
  editPlan: "shootspine_edit_plan.json",
  readme: "README_RESOLVE.txt",
  looks: "LOOKS.txt",
  companionPy: "import_shootspine_edl.py",
  openMac: "OPEN_ON_MAC.txt",
} as const;

export type ResolveDetectStatus = {
  installed: boolean;
  platform: "win32" | "darwin" | "linux" | "unknown";
  appPath?: string;
  scriptingAvailable: boolean;
  scriptingApiPath?: string;
  scriptingLibPath?: string;
  note: string;
};

export function resolveHandoffAbsoluteDir(projectRoot: string): string {
  return joinProjectRelative(projectRoot.trim(), RESOLVE_HANDOFF_REL_DIR);
}

function normalizeRootPrefix(p: string): string {
  return p.trim().replace(/[/\\]+$/, "").replace(/\//g, "\\").toLowerCase();
}

/** True when handoffDir lives under the current project root (same volume path). */
export function isHandoffUnderProjectRoot(
  handoffDir: string | null | undefined,
  projectRoot: string | null | undefined
): boolean {
  const root = projectRoot?.trim();
  const handoff = handoffDir?.trim();
  if (!root || !handoff) return false;
  const r = normalizeRootPrefix(root);
  const h = normalizeRootPrefix(handoff);
  return h === r || h.startsWith(`${r}\\`);
}

/**
 * Prefer a previously saved handoff path only when it still belongs to this project root.
 * Otherwise return the expected handoff folder under the current root (after migrate/rename).
 */
export function activeHandoffDir(
  projectRoot: string | null | undefined,
  storedHandoffDir?: string | null
): string | null {
  const root = projectRoot?.trim();
  if (!root) return storedHandoffDir?.trim() || null;
  if (isHandoffUnderProjectRoot(storedHandoffDir, root)) {
    return storedHandoffDir!.trim().replace(/[/\\]+$/, "");
  }
  return resolveHandoffAbsoluteDir(root);
}

/** Python companion: Media Pool bin + media link + EDL + markers (V4/V21). */
export function buildResolveCompanionPython(input: {
  edlFilename?: string;
  timelineName?: string;
  binName?: string;
}): string {
  const edl = input.edlFilename || RESOLVE_HANDOFF_FILES.edl;
  const name = (input.timelineName || "ShootSpine Rough Cut").replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const bin = (input.binName || "ShootSpine").replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `#!/usr/bin/env python3
"""
ShootSpine → DaVinci Resolve companion (V4/V21)

1) Creates/finds a Media Pool bin
2) Imports media from shootspine_handoff.json
3) Imports the rough-cut EDL (dissolves when present)
4) Applies timeline markers from shootspine_edit_plan.json

Requires DaVinci Resolve running with External Scripting enabled
(Preferences → System → General → External scripting using).
Studio scripting API preferred; free Resolve may not expose the full API.

Usage (Mac or Windows), from this folder:
  python3 import_shootspine_edl.py
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

EDL_NAME = ${JSON.stringify(edl)}
TIMELINE_NAME = "${name}"
BIN_NAME = "${bin}"
MANIFEST_NAME = "shootspine_handoff.json"
EDIT_PLAN_NAME = "shootspine_edit_plan.json"


def setup_env() -> None:
    if sys.platform == "darwin":
        api = "/Library/Application Support/Blackmagic Design/DaVinci Resolve/Developer/Scripting"
        lib = "/Applications/DaVinci Resolve/DaVinci Resolve.app/Contents/Libraries/Fusion/fusionscript.so"
    elif sys.platform == "win32":
        api = os.path.join(
            os.environ.get("PROGRAMDATA", r"C:\\ProgramData"),
            "Blackmagic Design",
            "DaVinci Resolve",
            "Support",
            "Developer",
            "Scripting",
        )
        lib = os.path.join(
            os.environ.get("PROGRAMFILES", r"C:\\Program Files"),
            "Blackmagic Design",
            "DaVinci Resolve",
            "fusionscript.dll",
        )
    else:
        api = "/opt/resolve/Developer/Scripting"
        lib = "/opt/resolve/libs/Fusion/fusionscript.so"

    os.environ.setdefault("RESOLVE_SCRIPT_API", api)
    os.environ.setdefault("RESOLVE_SCRIPT_LIB", lib)
    modules = os.path.join(os.environ["RESOLVE_SCRIPT_API"], "Modules")
    if modules not in sys.path:
        sys.path.insert(0, modules)


def collect_media_paths(handoff_dir: Path, project_root: Path) -> list[str]:
    manifest = handoff_dir / MANIFEST_NAME
    if not manifest.is_file():
        return []
    try:
        data = json.loads(manifest.read_text(encoding="utf-8"))
    except Exception:
        return []
    paths: list[str] = []
    seen: set[str] = set()
    for item in (data.get("media") or [])[:200]:
        candidate = (item.get("resolvedPath") or "").strip()
        rel = (item.get("relativeProjectPath") or "").strip().replace("\\\\", "/")
        if not candidate and rel:
            candidate = str(project_root.joinpath(*[p for p in rel.split("/") if p]))
        if not candidate:
            continue
        p = Path(candidate)
        if not p.is_file():
            continue
        key = str(p.resolve()).lower()
        if key in seen:
            continue
        seen.add(key)
        paths.append(str(p.resolve()))
    return paths


def ensure_bin(media_pool, name: str):
    root = media_pool.GetRootFolder()
    for sub in root.GetSubFolderList() or []:
        try:
            if sub.GetName() == name:
                media_pool.SetCurrentFolder(sub)
                return sub
        except Exception:
            pass
    folder = media_pool.AddSubFolder(root, name)
    if folder is not None:
        try:
            media_pool.SetCurrentFolder(folder)
        except Exception:
            pass
    return folder


def main() -> int:
    setup_env()
    handoff_dir = Path(__file__).resolve().parent
    edl_path = handoff_dir / EDL_NAME
    if not edl_path.is_file():
        print(f"EDL not found: {edl_path}")
        return 1

    # …/ProjectRoot/03_PROJECT_FILES/shootspine_resolve
    project_root = handoff_dir.parent.parent

    try:
        import DaVinciResolveScript as dvr  # type: ignore
    except Exception as exc:
        print("Could not import DaVinciResolveScript.")
        print("Open Resolve, enable External scripting, then retry.")
        print(f"Detail: {exc}")
        return 2

    resolve = dvr.scriptapp("Resolve")
    if not resolve:
        print("Resolve is not running (or scripting is disabled).")
        return 3

    project = resolve.GetProjectManager().GetCurrentProject()
    if not project:
        print("Open or create a Resolve project first, then re-run this script.")
        return 4

    media_pool = project.GetMediaPool()
    ensure_bin(media_pool, BIN_NAME)
    media_paths = collect_media_paths(handoff_dir, project_root)
    media_count = 0
    clips = []
    if media_paths:
        try:
            clips = media_pool.ImportMedia(media_paths) or []
            media_count = len(clips) if clips else 0
        except Exception as exc:
            print(f"Media import warning: {exc}")
            clips = []

    # Only zero Start TC when EVERY event is file-relative (source-in 00:00:00:00).
    # One unaligned/missing clip at 00:00:00:00 must not wipe camera Start TC on the rest.
    try:
        import re
        edl_text = edl_path.read_text(encoding="utf-8", errors="ignore")
        src_ins = re.findall(
            r"^\\d{3}\\s+\\S+\\s+\\S+\\s+(?:C|D(?:\\s+\\d+)?)\\s+(\\d{2}:\\d{2}:\\d{2}[:;]\\d{2})\\s+",
            edl_text,
            flags=re.M,
        )
        file_relative = bool(src_ins) and all(
            s.replace(";", ":") == "00:00:00:00" for s in src_ins
        )
        if file_relative:
            for clip in clips:
                try:
                    clip.SetClipProperty("Start TC", "00:00:00:00")
                except Exception:
                    pass
    except Exception:
        pass

    imported = media_pool.ImportTimelineFromFile(
        str(edl_path),
        {"timelineName": TIMELINE_NAME},
    )
    if not imported:
        print("ImportTimelineFromFile failed. Import the EDL manually:")
        print(f"  File → Import → Timeline → Import EDL… → {edl_path.name}")
        return 5

    try:
        project.SetCurrentTimeline(imported)
    except Exception:
        pass

    markers_ok = 0
    plan_path = handoff_dir / EDIT_PLAN_NAME
    if plan_path.is_file():
        try:
            plan = json.loads(plan_path.read_text(encoding="utf-8"))
            for m in plan.get("markers") or []:
                try:
                    frame = int(m.get("frame") or 0)
                    color = str(m.get("color") or "Blue")
                    name = str(m.get("name") or "Marker")[:64]
                    note = str(m.get("note") or "")[:256]
                    dur = max(1, int(m.get("durationFrames") or 1))
                    if imported.AddMarker(frame, color, name, note, dur):
                        markers_ok += 1
                except Exception:
                    pass
        except Exception as exc:
            print(f"Marker plan warning: {exc}")

    print(f"Imported timeline from {edl_path.name}")
    print(f"Linked {media_count} media file(s) into bin '{BIN_NAME}'.")
    print(f"Applied {markers_ok} timeline marker(s).")
    if media_count == 0:
        print("If clips are offline, relink using paths in shootspine_handoff.json.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
`;
}

export function buildOpenOnMacReadme(input: {
  projectId: string;
  timelineName?: string;
}): string {
  return [
    "ShootSpine → Mac DaVinci Resolve",
    "================================",
    "",
    "This folder is the portable handoff. Sync/copy the whole project (or at least",
    "01_ORIGINAL_MEDIA + this folder) to the Mac volume Resolve can see.",
    "",
    "Option A — companion script (Resolve running, External scripting on):",
    "  1. Open DaVinci Resolve and create/open a project.",
    "  2. cd into this folder",
    "  3. python3 import_shootspine_edl.py",
    "     (creates a ShootSpine media bin, links clips, imports the EDL)",
    "",
    "Option B — manual:",
    "  1. Media Pool → import clips from 01_ORIGINAL_MEDIA (or proxies)",
    "  2. File → Import → Timeline → Import EDL…",
    "  3. Choose shootspine_rough_cut.edl",
    "  4. Relink using paths in shootspine_handoff.json if needed",
    "",
    `Project: ${input.projectId}`,
    input.timelineName ? `Timeline: ${input.timelineName}` : "",
    "",
    "Camera originals never leave your disks via ShootSpine cloud.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildHandoffFileMap(input: {
  edl: string;
  manifestJson: string;
  readme: string;
  looksGuide?: string;
  editPlanJson?: string;
  timelineName?: string;
  projectId: string;
}): Record<string, string> {
  const files: Record<string, string> = {
    [RESOLVE_HANDOFF_FILES.edl]: input.edl,
    [RESOLVE_HANDOFF_FILES.manifest]: input.manifestJson,
    [RESOLVE_HANDOFF_FILES.readme]: input.readme,
    [RESOLVE_HANDOFF_FILES.companionPy]: buildResolveCompanionPython({
      timelineName: input.timelineName,
    }),
    [RESOLVE_HANDOFF_FILES.openMac]: buildOpenOnMacReadme({
      projectId: input.projectId,
      timelineName: input.timelineName,
    }),
  };
  if (input.editPlanJson?.trim()) {
    files[RESOLVE_HANDOFF_FILES.editPlan] = input.editPlanJson;
  }
  if (input.looksGuide?.trim()) {
    files[RESOLVE_HANDOFF_FILES.looks] = input.looksGuide;
  }
  return files;
}
