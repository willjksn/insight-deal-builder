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
  readme: "README_RESOLVE.txt",
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

/** Python companion: feature-detect Resolve scripting and import the EDL. */
export function buildResolveCompanionPython(input: {
  edlFilename?: string;
  timelineName?: string;
}): string {
  const edl = input.edlFilename || RESOLVE_HANDOFF_FILES.edl;
  const name = (input.timelineName || "ShootSpine Rough Cut").replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `#!/usr/bin/env python3
"""
ShootSpine → DaVinci Resolve companion (V1.5)

Requires DaVinci Resolve running with External Scripting enabled
(Preferences → System → General → External scripting using).
Studio scripting API preferred; free Resolve may not expose the full API.

Usage (Mac or Windows), from this folder:
  python3 import_shootspine_edl.py
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

EDL_NAME = ${JSON.stringify(edl)}
TIMELINE_NAME = "${name}"


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


def main() -> int:
    setup_env()
    edl_path = Path(__file__).resolve().parent / EDL_NAME
    if not edl_path.is_file():
        print(f"EDL not found: {edl_path}")
        return 1

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
    imported = media_pool.ImportTimelineFromFile(
        str(edl_path),
        {"timelineName": TIMELINE_NAME},
    )
    if not imported:
        print("ImportTimelineFromFile failed. Import the EDL manually:")
        print(f"  File → Import → Timeline → Import EDL… → {edl_path.name}")
        return 5

    print(f"Imported timeline from {edl_path.name}")
    print("Relink offline media using shootspine_handoff.json (relativeProjectPath / checksum).")
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
    "",
    "Option B — manual:",
    "  1. File → Import → Timeline → Import EDL…",
    "  2. Choose shootspine_rough_cut.edl",
    "  3. Relink using paths in shootspine_handoff.json",
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
  timelineName?: string;
  projectId: string;
}): Record<string, string> {
  return {
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
}
