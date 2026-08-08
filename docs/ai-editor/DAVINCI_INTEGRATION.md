# AI Editor — DaVinci Resolve Integration

## Principle

Windows AI Editor → portable handoff → Mac Resolve finishing is a **first-class** workflow.

Do not assume Resolve and AI Editor share a machine or OS paths.

## Status

- **V1G** — EDL + `shootspine_handoff.json` + README (download). No camera media uploaded.
- **V1.5** — Write handoff under `03_PROJECT_FILES/shootspine_resolve/`, detect/launch Resolve on this machine when installed, Mac companion (`import_shootspine_edl.py` + `OPEN_ON_MAC.txt`).

## Phase plan

1. **V1G** — EDL + media mapping manifest (`MediaAsset.id` + `relativeProjectPath` + checksum) — done
2. **V1.5** — Open in Resolve / write package / Mac companion — done (initial)
3. **V2** — Workflow Integration panel (official Blackmagic APIs only)

Always feature-detect Resolve capabilities. Prefer official developer docs for the installed version.

## V1.5 workstation flow

1. Build rough cut in AI Editor.
2. **Write to project folder** or **Open in Resolve** (Desktop Agent v0.6+).
3. Files land in `{ProjectRoot}/03_PROJECT_FILES/shootspine_resolve/`.
4. If Resolve is installed locally: agent launches it and reveals the handoff folder.
5. Import `shootspine_rough_cut.edl` (or run `import_shootspine_edl.py` with External scripting enabled).

## V1.5 Mac companion flow

1. Sync/copy project media + `03_PROJECT_FILES/shootspine_resolve` to the Mac volume.
2. Open Resolve → project → External scripting on.
3. `python3 import_shootspine_edl.py` from the handoff folder — or import EDL manually.
4. Relink using `shootspine_handoff.json`.

## Agent endpoints

| Endpoint | Purpose |
|----------|---------|
| `POST /v1/resolve/detect` | Feature-detect install + scripting modules |
| `POST /v1/resolve/write-handoff` | Write text package under project root only |
| `POST /v1/resolve/open` | Reveal folder + launch Resolve from allowlisted path |
| `POST /v1/fs/reveal` | Open folder in Explorer / Finder |

Launch uses the detected app path only — no arbitrary shell from the browser.
