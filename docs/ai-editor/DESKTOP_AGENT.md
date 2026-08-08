# AI Editor — Desktop Agent

Companion process (not a separate product). Windows-first; macOS Resolve Bridge later.

## Responsibilities (staged)

V1A: localhost HTTP API, session auth, storage root validation, create project folders, index folder, FFprobe stub/mock, thumbnail stub, job progress events.

Supports verified copy, proxies, local AI analysis, media stream, archive/restore batch, and safe-delete (project-root only).

## Communication

1. Browser (Firebase auth) calls ShootSpine API → mints short-lived **agent session token**.
2. Browser connects to `http://127.0.0.1:<port>` with that token.
3. Agent binds **localhost only**. No remote shell. No arbitrary command execution from LLM output.

## Scaffold location

`desktop-agent/` — Node TypeScript HTTP service for V1A (lightweight; Tauri shell can wrap later).

Default port: `17865` (configurable).
