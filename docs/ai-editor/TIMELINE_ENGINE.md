# AI Editor — Timeline Engine

Internal NLE-independent timeline (not Resolve’s API model).

## Status

**V1E initial landed.** Frame helpers in `src/lib/aiEditor/frames.ts`; engine in `timeline.ts`.

## Implemented

- `Timeline` / `TimelineVersion` / `TimelineTrack` / `TimelineClip`
- Deterministic edit ops (`insert`, `trim`, `move`, `rippleDelete`, `split`, `reorder`)
- Rough cut from coverage preferred takes (footage-only fallback sequences all clips)
- Version snapshots + restore via `/api/projects/[id]/ai-editor/timeline`

## Preview

Local playback via Desktop Agent `GET /v1/media/stream` (Range + `?token=`). UI can watch individual clips or play the rough cut sequence (proxy preferred over originals).

## Edit by Chat (V1F)

`editByChat.ts` + `POST .../ai-editor/chat-edit`: propose ops from natural language (deterministic rules first, Gemini JSON fallback), validate against the live timeline, apply with version bump, undo = restore prior version. Never sends camera media — only clip labels/ids/durations.

## Long-form (acts / reels)

- `Timeline.reels` + `clip.reelId` + `activeReelId`
- Rough cut defaults to one “Full cut” reel
- UI: **Set up for feature (3 acts)** or **Split into ~20 min reels** (~1h45 runtime)
- Edit by Chat scopes Gemini/rules context to the active reel (cap in `limits.ts`)

Soft caps live in `src/lib/aiEditor/limits.ts` (raise there, not scattered).

## Still later

- Scrubbing / waveform / multi-track visual editor
- Resolve / Premiere adapters consume this model; they do not own it (V1G)
