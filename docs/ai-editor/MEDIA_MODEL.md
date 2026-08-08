# AI Editor — Media Model

## Principles

- Identity is **not** absolute filepath.
- Originals are never modified.
- Store `relativeProjectPath` + checksum for cross-platform portability.
- Firestore stores metadata only; binaries stay on disk.

## MediaAsset (conceptual)

`id` · `projectId` · `filename` · `originalFilename` · `extension` · `mediaType`  
`sizeBytes` · `checksum` · `checksumAlgorithm`  
`relativeProjectPath` · `currentPath` · `archivePath` · `proxyPath`  
`storageLocationId` · `volumeIdentifier`  
`onlineStatus` · `ingestStatus` · `analysisStatus`  
technical probe fields (codec, resolution, frameRate, duration, startTimecode, …)

## Online status

`online` | `offline` | `unknown`

When offline: metadata/transcript/rough cut may still be available; original playback is not.
