# AI Editor — Architecture

AI Editor is a **module inside ShootSpine**, not a separate product. It sits on the project spine after Coverage / Day shots and bridges production planning to post.

## Existing ShootSpine stack (reused)

| Area | Implementation |
|------|----------------|
| Framework | Next.js 16 App Router, React 19, npm |
| Auth | Firebase Auth + `AuthContext` + `requireAuthUser` |
| Project access | `projectAccess` areas: scripts / production / shots |
| Project data | `projects`, `productionBoards`, `scriptWriterSessions` |
| Cloud media (planning stills) | Firebase Storage via `production/storage.ts` |
| Cloud AI | Gemini + `aiUsageMonthly` attribution |
| UI | `PageHeader`, `Card`, `Badge`, ProjectSpine |

**Not present today:** Electron/Tauri, local FS access, FFmpeg, NLE bridge. Desktop Agent is greenfield.

## Integration surface

```
/projects/[id]                  → Project hub + spine
/projects/[id]/ai-editor        → AI Editor module
/api/projects/[id]/ai-editor/*  → Cloud metadata + agent session minting
desktop-agent/                  → Local companion (localhost only)
```

Spine order (conceptual):

Script → Prep → Coverage → Day shots → **AI Editor** → Agreement

## Layered architecture

```
ShootSpine UI (Next.js)
        ↓ HTTPS (Firebase auth)
AI Editor API (Next.js route handlers)
        ↓ localhost + session token
Desktop Agent (Windows-first)
        ↓
MediaEngine / AIEngine / Storage roots
```

Cloud (Firestore) holds: project settings, StorageLocation records, MediaAsset **metadata**, jobs, timeline JSON, analysis summaries.

Local (Desktop Agent + disk) holds: originals, proxies, cache, thumbnails, SQLite index, local models.

**Never** upload original camera media to Firebase by default.

## Production Context

`buildProductionContext(projectId)` normalizes existing ShootSpine data:

- `Project`
- linked `ScriptWriterSession` / script scenes
- `ProductionBoard` people, locations, days, shots
- storyboard / coverage frames (URLs only)
- deliverable hints from project fields

AI Editor must not re-ask for data already in ShootSpine.

## Cross-platform (Windows → macOS Resolve)

- Media identity = `MediaAsset.id` + `relativeProjectPath` + checksum
- Paths are platform-resolved via `MediaPathResolver` (later)
- Resolve handoff is a **portable package**, not “open Resolve on this PC”
- Heavy AI stays on Windows; finishing on Mac is first-class

## Provider / NLE abstractions (stubs in V1A)

- `MediaEngine` — probe, proxy, thumbnail, waveform
- `AIProvider` — local vs cloud (later phases)
- `NleAdapter` / `ResolveAdapter` — export later; internal timeline is ShootSpine-owned

## Feature flag

`NEXT_PUBLIC_AI_EDITOR_ENABLED` (default **on** for development of this branch; set `false` to hide).
