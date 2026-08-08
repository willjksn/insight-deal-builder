# AI Editor — Storage

## StorageLocation

Named, user-authorized roots with purpose:

- `active` · `cache` · `proxy` · `archive` · `backup`

Types: `internal` · `externalSSD` · `externalHDD` · `network` · `NAS` · `removable` · `unknown`

Never hard-code `C:\IMG_ACTIVE` or `E:\ARCHIVE`.

## Archive / reclaim (V1H)

- User picks an **archive** storage root (`archiveRootPath` on project settings).
- Archive = verified copy into `{archiveRoot}/{projectSlug}/{relativeProjectPath}`.
- Restore = verified copy back under `projectRootPath`.
- Reclaim = delete **active project copies only** after archive, with confirm phrase `DELETE_ACTIVE_COPY`.
- Agent refuses deletes outside `projectRoot`, drive roots, and paths listed as archive (`neverDeletePaths`).
- Camera cards are never erased by ShootSpine.

## Managed project folders

Under ProjectRoot:

```
01_ORIGINAL_MEDIA/   (CAMERA_* / AUDIO / DRONE / OTHER)
02_PROXIES/
03_PROJECT_FILES/
04_AUDIO/
05_GRAPHICS/
06_EXPORTS/
07_CACHE/
08_REFERENCE/
```

Camera folders are generated from project config / user assignment — not assumed fixed to three cameras.

## Portable roots

`ProjectRoot` + `relativeProjectPath` resolves on Windows or macOS when the volume is attached.
