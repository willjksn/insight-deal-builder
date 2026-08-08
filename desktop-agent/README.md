# ShootSpine Desktop Agent (V1A)

Localhost companion for **AI Editor** inside ShootSpine. Not a separate product.

## Run

```bash
cd desktop-agent
npm start
```

Listens on `http://127.0.0.1:17865` only.

## Auth

1. Sign in to ShootSpine in the browser.
2. Open a project → AI Editor → mint session (automatic when creating folders / indexing).
3. Browser sends `Authorization: Bearer <session-token>` to the agent.

V1A accepts any non-empty bearer token when `SHOOTSPINE_AGENT_DEV_OPEN=1` (default in this scaffold). Production hardening will verify tokens against ShootSpine.

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/v1/health` | Connectivity / hardware hints |
| POST | `/v1/folders/create` | Create managed project folders |
| POST | `/v1/media/index` | List media files under a folder |
| POST | `/v1/media/probe` | FFprobe metadata (falls back to mock) |
| GET | `/v1/fs/drives` | Drives + common folders for pickers |
| POST | `/v1/fs/list` | List subfolders under a path |
| POST | `/v1/storage/stat` | Free/capacity bytes for a path |
| POST | `/v1/media/checksum` | SHA-256 of a file |
| POST | `/v1/media/copy-verified` | Copy one file + verify checksum |
| POST | `/v1/media/ingest-copy` | Batch verified copy into project media folders |
| POST | `/v1/resolve/detect` | Detect DaVinci Resolve + scripting modules |
| POST | `/v1/resolve/scripting-probe` | Live scripting + project-open check |
| POST | `/v1/resolve/import-edl` | Import EDL via official Resolve scripting API |
| POST | `/v1/resolve/write-handoff` | Write EDL/JSON/companion under project root |
| POST | `/v1/resolve/open` | Launch Resolve (allowlisted) |
| POST | `/v1/fs/reveal` | Open a folder in Explorer / Finder |

## FFprobe

Set `FFPROBE_PATH` or ensure `ffprobe` is on `PATH`. Without it, probe returns lightweight file metadata only.
