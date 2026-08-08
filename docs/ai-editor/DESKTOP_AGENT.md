# AI Editor — Desktop Agent

Companion process (not a separate product). Windows-first; macOS Resolve companion via handoff scripts (V1.5).

## Responsibilities (staged)

V1A: localhost HTTP API, session auth, storage root validation, create project folders, index folder, FFprobe stub/mock, thumbnail stub, job progress events.

Supports verified copy, proxies, local AI analysis, media stream, archive/restore batch, safe-delete (project-root only), and Resolve detect / scripting-probe / import-edl (V4) / sync-from-nle (V5/V6 clip names) / write-handoff / open (allowlisted only).

## Communication

1. Browser (Firebase auth) calls ShootSpine API → mints short-lived **agent session token**.
2. Browser **registers** that token with the agent (`POST /v1/session/register`).
3. Browser calls agent APIs with `Authorization: Bearer <token>` (or `?token=` for media streams).
4. Agent binds **localhost only**. No remote shell. No arbitrary command execution from LLM output.

### Auth modes (v0.13+)

| Mode | When | Behavior |
|------|------|----------|
| `registered` (default) | No special env | Only tokens registered after mint are accepted |
| `app_verify` | `SHOOTSPINE_APP_URL` set | Register/verify calls ShootSpine `/api/ai-editor/agent/verify-session` |
| `dev_open` | `SHOOTSPINE_AGENT_DEV_OPEN=1` | Any non-empty Bearer token (agent testing only) |

Archive / restore / reclaim batches return **per-file** success/failure so the UI patches only what actually changed on disk.

### Drives (v0.14+)

`GET /v1/fs/drives` on Windows enriches volumes via PowerShell (`Get-Volume` / `Get-Disk`): volume label, free/capacity, bus/media type, and a best-effort `storageType` (`externalSSD` / `externalHDD` / `internal` / `removable` / `network`). The AI Editor Step 2 picker uses this for “Edit on SSD / Backup on HDD” guidance.

### Storage presence (v0.15+)

`POST /v1/storage/stat` returns `online: false` (and `reason: "drive_offline"`) when the Windows drive root is not accessible — used by AI Editor to show an “Edit drive offline” banner instead of failing mid-copy.

### Resolve markers (v0.16+)

`POST /v1/resolve/import-edl` applies timeline markers from `shootspine_edit_plan.json` after `ImportTimelineFromFile` (acts/reels + dissolve/fade cues). Soft blends are also written into the EDL as dissolves when the finishing plan uses them. Grades are never applied by the agent.

## Scaffold location

`desktop-agent/` — Node TypeScript HTTP service for V1A (lightweight; Tauri shell can wrap later).

Default port: `17865` (configurable).
