# AI Editor — DaVinci Resolve Integration

## Principle

Windows AI Editor → portable handoff → Mac Resolve finishing is a **first-class** workflow.

Do not assume Resolve and AI Editor share a machine or OS paths.

## Status

**V1G initial landed.** `resolveExport.ts` builds CMX-style EDL + `shootspine_handoff.json` + README. Downloads from AI Editor Step 9. No camera media uploaded.

## Phase plan

1. **V1G** — EDL + media mapping manifest (`MediaAsset.id` + `relativeProjectPath` + checksum) — done (initial)
2. **V1.5** — Open in Resolve / bridge when same-machine scripting is available
3. **V2** — Workflow Integration panel (official Blackmagic APIs only)

Always feature-detect Resolve capabilities. Prefer official developer docs for the installed version.
