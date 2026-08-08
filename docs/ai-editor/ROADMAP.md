# AI Editor — Roadmap

## Already built in ShootSpine (reuse)

- Project + ProductionBoard + script sessions
- Shot list / coverage / storyboard frames (planning stills)
- Firebase Auth, project members, production permissions
- Gemini cloud AI + monthly usage tracking
- Firebase Storage for **planning** media (not camera originals)

## Phases

| Phase | Milestone |
|-------|-----------|
| **V1A Foundation** | Route, Production Context, storage/media models, agent scaffold, folder create, index + probe stubs, jobs, offline state |
| **V1B Ingest** | Verified copy, camera assignment, proxies, disk checks |
| **V1C Local Analysis** | Transcription, shot detection, searchable metadata |
| **V1D Matching** | Script/shot-list matching, coverage report, preferred takes |
| **V1E Rough Cut** | Timeline model + engine + preview + versioning |
| **V1F Edit by Chat** | Structured ops + validate + apply + undo |
| **V1G Resolve Export** | NLEAdapter + portable handoff (Windows → Mac) |
| **V1H Archive/Restore/Delete** | Verified archive, reclaim, safe delete |
| **V1.5 Open in Resolve** | Write handoff to disk, detect/launch Resolve, Mac companion |
| **V1.6 Finishing suggestions** | Mood/look notes + transition style → Resolve LOOKS.txt |
| **V2 Workflow Integration** | Official Resolve scripting: status + auto-import when ready |
| **V3 Feedback loop** | Wrap-up after Resolve → remember look defaults next time |
| **V4 Resolve bin + media** | Media Pool “ShootSpine” bin + ImportMedia before EDL |
| **V5 Reverse sync** | Read open Resolve timeline → snapshot + optional EDL (non-destructive) |
| **V6 Planning feedback** | Clip-level compare Resolve ↔ rough cut → next-shoot notes |
| **Edit notes** | Shoot / client / look notes → creative brief for Edit by Chat |
| **Long-form ready** | Raised soft caps + acts/reels for ~1h45 features |
| **V7 Reverse import** | Import Resolve cut → new ShootSpine timeline version |
| **V8 Next shoot checklist** | Checkable pickups from missing coverage + Resolve feedback |
| **V9 Board handoff** | Send open checklist items → production board filming notes |
| **V10 Cross-project insights** | Patterns across looks / coverage / checklists on AI Editor hub |
| **V11 Look defaults + Mac brief** | Cross-project Look seeding; LOOKS.txt creative brief; Resolve preflight tips |
| **V12 Dual-drive setup** | Drive labels (SSD/HDD/USB) + guided edit SSD / backup HDD folders |
| **V13 Offline remount** | Remember volume id; relink edit/backup paths when drive letter changes |
| **V14 Recommendations** | Ranked next steps on hub + project tips (checklists, wrap-up, backup) |
| **V15 Storage health** | Live edit/backup coaching (internal vs SSD/HDD, same-drive risk, free space) |

Later: deeper anonymized analytics across orgs (opt-in)

## Current implementation status

- **V1A Foundation** — landed  
- **V1B Ingest** — verified copy, disk checks, camera assignment, multi-camera queue, progress UI, media safety banner; card erase never automatic  
- **V1C Local Analysis (initial)** — technical analysis + FFmpeg shot breaks, optional Whisper transcription (local CLI, CUDA→CPU fallback), transcript search, analysis stored as metadata  
- **V1D Matching (initial)** — deterministic clip↔planned-shot scoring, coverage report, preferred takes + manual override, script dialogue used when linked  
- **V1E Rough Cut (initial)** — timeline model + ops (insert/trim/move/rippleDelete/split/reorder), build from coverage, version snapshots + restore, Step 7 UI, local preview stream  
- **V1F Edit by Chat (initial)** — NL → structured ops (rules + optional Gemini), validate, apply, undo via versions, Step 8 UI  
- **V1G Resolve Export (initial)** — EDL + handoff JSON + README, media map by MediaAsset.id / relativeProjectPath / checksum, Step 9 download UI  
- **V1H Archive/Restore/Delete (initial)** — verified archive batch, restore to project, reclaim active copies with typed confirm; camera cards never auto-erased; Step 10 UI  
- **V1 stabilize** — job APIs return completed status (not stale `queued`); archive unit tests green  
- **V1.5 Open in Resolve (initial)** — write package to `03_PROJECT_FILES/shootspine_resolve`, detect/launch Resolve, Mac companion script + OPEN_ON_MAC.txt; plain-language finish-here vs finish-on-Mac UI  
- **V1.6 Finishing suggestions (initial)** — mood presets + transition style on timeline; LOOKS.txt in Resolve package; Step 9 UI (suggestions only — grade in Resolve)  
- **V2 Workflow Integration (initial)** — scripting probe, Bring edit into Resolve (`ImportTimelineFromFile`), plain-language readiness status; manual fallback  
- **V3 Feedback loop (initial)** — “How did finishing go?” wrap-up; stores last look preference; Look step pre-fills from feedback  
- **V4 Resolve bin + media (initial)** — create/find Media Pool bin, link clips from handoff manifest, then import EDL; companion script matches  
- **V5 Reverse sync (initial)** — “Check what’s in Resolve” reads timeline metadata + optional `resolve_from_nle.edl`; compares length/clips to rough cut; does not overwrite ShootSpine edit  
- **V6 Planning feedback (initial)** — Resolve clip names matched to media; dropped/added vs rough cut; missing coverage + preferred-take notes for next shoot  
- **Edit notes (initial)** — tagged notes (on set / client / look / general); saved on project; injected into Edit by Chat; “Propose from notes”  
- **Long-form ready** — soft caps raised (5k media, 500/batch, 2k Resolve link/sync); acts/reels on timeline; Edit by chat scoped to active reel/act  
- **V7 Reverse import (initial)** — “Import Resolve cut here” builds a new timeline version from Resolve clip names; prior cut kept in Versions  
- **V8 Next shoot checklist (initial)** — checkable list from missing coverage + dropped/preferred insights; saved on project; AI Editor only  
- **V9 Board handoff (initial)** — “Send to production board” merges open checklist into filming notes (marked section, replaceable)  
- **V10 Cross-project insights (initial)** — hub “Patterns across your edits” from finishing feedback, planning insights, open checklists (metadata only)  
- **V11 Look defaults + Mac brief (initial)** — seed Look from cross-project patterns when no wrap-up; LOOKS.txt includes look/client notes; “Before you finish” preflight tips  
- **V12 Dual-drive setup (initial)** — Desktop Agent lists volume name / SSD·HDD·USB / free space; Step 2 guided edit + backup folders with type detection  
- **V13 Offline remount (initial)** — persist volume serial on save; detect letter change; Relink paths for edit/backup + media  
- **V14 Recommendations (initial)** — ranked hub “Suggested next steps” with deep links; light project-page tip  
- **V15 Storage health (initial)** — Step 2 workspace health for edit/backup placement + free space; guidance only  
- Later: deeper anonymized analytics across orgs (opt-in)
