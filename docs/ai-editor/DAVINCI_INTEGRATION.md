# AI Editor — DaVinci Resolve Integration

## Principle

Windows AI Editor → portable handoff → Mac Resolve finishing is a **first-class** workflow.

Do not assume Resolve and AI Editor share a machine or OS paths.

## Status

- **V1G** — EDL + `shootspine_handoff.json` + README. No camera media uploaded.
- **V1.5** — Write handoff under `03_PROJECT_FILES/shootspine_resolve/`, detect/launch Resolve, Mac companion.
- **V1.6** — Mood / transition suggestions as `LOOKS.txt`.
- **V2 (initial)** — Workflow status + **Bring edit into Resolve** via official `DaVinciResolveScript` when Resolve is open with a project (External scripting on). Falls back to manual import.
- **V4 (initial)** — Media Pool **ShootSpine** bin + `ImportMedia` from handoff paths, then `ImportTimelineFromFile`.
- **V5 (initial)** — Read open Resolve timeline back (metadata + optional EDL snapshot). Non-destructive.
- **V6 (initial)** — Clip list from Resolve → compare to rough cut / coverage → “For next time” planning notes.
- **V7 (initial)** — Import Resolve cut into ShootSpine as a new timeline version (prior cut restorable).
- **V8 (initial)** — Next shoot checklist (missing coverage + Resolve feedback), check-off in AI Editor.
- **V9 (initial)** — Send open checklist to production board **filming notes** (marked, replaceable section).

## Phase plan

1. **V1G** — EDL + media mapping manifest — done
2. **V1.5** — Open in Resolve / write package / Mac companion — done
3. **V2** — Workflow Integration (official Blackmagic scripting only) — initial landed
4. **V3** — Finishing feedback loop — done
5. **V4** — Resolve bin + media link — initial landed
6. **V5** — Reverse sync from Resolve — initial landed
7. **V6** — Planning feedback from final cut — initial landed
8. **V7** — Reverse import into ShootSpine timeline — initial landed
9. **V8** — Next shoot checklist — initial landed
10. **V9** — Board handoff (filming notes) — initial landed
11. Later — cross-project analytics

Always feature-detect Resolve capabilities. Prefer official developer docs for the installed version.

## V2/V4 workstation flow (plain language)

1. Rough cut (+ optional look) in AI Editor.
2. **On this computer** → check status → **Bring edit into Resolve**.
3. If Resolve isn’t open yet: we start it; you open a project; press the button again.
4. When scripting can talk to Resolve: clips go into a **ShootSpine** media bin, then the timeline imports.
5. If not: File → Import → Timeline (manual) — same saved folder.

Requirements for auto-import:

- DaVinci Resolve installed
- Resolve **running** with a **project open**
- External scripting enabled (Preferences → System → General)
- Python available (`py -3` / `python`)
- Scripting modules present (Studio / supported installs)

## Mac flow

Unchanged: prepare on Windows → copy project folder → import on Mac (script or File → Import → Timeline).

## Agent endpoints

| Endpoint | Purpose |
|----------|---------|
| `POST /v1/resolve/detect` | Install + scripting modules on disk |
| `POST /v1/resolve/scripting-probe` | Live scripting reachability + project open |
| `POST /v1/resolve/import-edl` | Media Pool bin + `ImportMedia` + `ImportTimelineFromFile` |
| `POST /v1/resolve/sync-from-nle` | Read open timeline + clip names + optional EDL (V5/V6) |
| `POST /v1/resolve/write-handoff` | Write text package under project root |
| `POST /v1/resolve/open` | Launch Resolve (allowlisted path) |
| `POST /v1/fs/reveal` | Open folder in Explorer / Finder |

No arbitrary shell from the browser — only allowlisted Resolve / Python invocations.
