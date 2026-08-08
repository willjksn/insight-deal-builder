# AI Editor — Managed Camera Card Ingest

Professional card → project ingest orchestrated by ShootSpine + Desktop Agent.  
**Not a separate product.** Extends AI Editor V1B / V12–V21.

## A. Existing components that support this

| Area | Location | Reuse |
|------|----------|--------|
| Drive list + volume IDs | `desktop-agent` `GET /v1/fs/drives`, `listWindowsVolumes` | Phase A discovery |
| Offline / free space | `POST /v1/storage/stat`, `evaluateDiskSpace` | Preflight |
| Media walk | `walkMedia` / `POST /v1/media/index` | Source scan |
| Verified / managed copy | `ingestCopyBatch`, `copyVerifiedBatch` | Phase B |
| Proxy / probe / thumb / analyze | agent media routes + Step 4–5 UI | Phases C–E |
| MediaAsset + StorageLocation | `types.ts`, `server.ts`, media/storage APIs | Register after copy |
| Camera labels | Step 3 select, `cameraLabels`, ProductionContext shots | Assignment |
| Path safety | `assertSafePath`, project-root write gates | All phases |
| Manual folder pick | `FolderPicker` + in-place / copy modes | Alternative workflow |

## B. Missing (greenfield)

- Camera/audio card detectors + confidence
- Mount/unmount awareness (poll first; OS watcher later)
- Ingest review UI (“Camera media detected”)
- Human-readable managed folder naming (`Media\ShootSpine\YYYY-MM-DD_…`)
- Shared media format registry
- Pipelined per-clip jobs, progress events, cancel mid-file
- IngestSession model + history UI
- Dual-destination safety copy (Phase F)
- Sleep prevention, resume across agent restart

## C. Proposed module structure

```
src/lib/aiEditor/
  mediaFormats.ts              # extension registry
  mediaPathBuilder.ts          # sanitize + ingest folder names
  cameraDetectors/
    types.ts
    detectMediaSource.ts       # orchestrates providers
    sonyMediaDetector.ts
    zoomAudioDetector.ts
    genericMediaDetector.ts
  managedIngest/               # Phase B+ sessions / pipeline (later)
desktop-agent/
  POST /v1/media/detect-sources
src/components/aiEditor/
  ManagedIngestReview.tsx      # Phase A UI
```

OS isolation: Windows volume enrichment stays in agent; detectors are pure FS-layout heuristics (portable).

## D. Event flow (target)

```
drive.connected (poll/watcher)
  → media.detect-sources
  → UI: Camera media detected
  → user confirms project / camera / destination
  → ingest.started (Phase B)
  → per-clip: copy → verify → register → metadata → thumb → proxy → analysis
  → ingest.completed
```

Phase A emits only: detect poll → review card (no ingest.started).

## E. Pipeline / job dependencies (Phase C+)

```
COPY → VERIFY → REGISTER → METADATA ∥ THUMBNAIL → PROXY → ANALYSIS
```

Copy/verify highest priority; proxy/AI throttled so card offload is not starved.  
`MediaPipelineJob` / `IngestSession` land in Phase B–C — not Phase A.

## F. Security

- Source card: **read-only** (never rename/delete/format)
- Writes only under authorized `StorageLocation` / project root
- `assertSafePath` + no `..` traversal
- Agent Bearer session; no arbitrary shell from AI
- Browser never bulk-copies files

## G. Copy / checksum strategy (Phase B)

- Stream copy to `*.shootspine-partial`, rename after verify
- SHA-256 today (`sha256File`); architect for xxHash later
- Prefer single-pass where practical; document tradeoffs
- Never overwrite differing checksum silently

## H. Concurrency (Phase C+)

Defaults (configurable): copy 1 · checksum 1–2 · metadata 2–4 · thumb 2 · proxy 1–2 · AI resource-gated.  
Adapt to detected hardware; do not hard-code workstation specs.

## I. Database changes

| When | What |
|------|------|
| Phase A | Optional client-only draft; no required Firestore schema |
| Phase B | `IngestSession` collection; MediaAsset provenance fields |
| Phase C+ | `MediaPipelineJob` or stage fields on asset/job |

IDs stay independent of folder names.

## J. UI components

| Phase | UI |
|-------|-----|
| **A** | Detection banner + ingest review (camera, dest preview, preflight, options preview) |
| B | Progress / cancel / failed retry |
| C | Live media browser populate mid-ingest |
| D–E | Proxy/analysis counts in same panel |
| F | Safety copy + media safety status |

Manual “Select existing folder” remains.

---

## Implementation phases

| Phase | Scope | Status |
|-------|--------|--------|
| **A** | Detect + review + naming preview + preflight | **Landed (initial)** |
| B | Verified managed copy + MediaAsset + cancel | Next |
| C | Pipelined metadata/thumbnails | Later |
| D | Proxy queue (not from card) | Later |
| E | Analysis queue | Later |
| F | Safety copy / dual dest | Later |
