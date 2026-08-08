# AI Editor — Desktop Agent

Companion process (not a separate product). Windows-first; macOS Resolve companion via handoff scripts (V1.5).

## Responsibilities (staged)

V1A: localhost HTTP API, session auth, storage root validation, create project folders, index folder, FFprobe stub/mock, thumbnail stub, job progress events.

Supports verified copy, proxies, local AI analysis, media stream, archive/restore batch, safe-delete (project-root only), and Resolve detect / scripting-probe / import-edl (V4) / sync-from-nle (V5) / write-handoff / open (allowlisted only).

## Communication

1. Browser (Firebase auth) calls ShootSpine API → mints short-lived **agent session token**.
2. Browser connects to `http://127.0.0.1:<port>` with that token.
3. Agent binds **localhost only**. No remote shell. No arbitrary command execution from LLM output.

## Scaffold location

`desktop-agent/` — Node TypeScript HTTP service for V1A (lightweight; Tauri shell can wrap later).

Default port: `17865` (configurable).
