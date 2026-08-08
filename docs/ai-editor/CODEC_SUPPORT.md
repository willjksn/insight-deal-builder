# AI Editor — Codec support

## Principle

ShootSpine does **not** require Windows to natively decode every camera codec.

- **Originals** stay untouched for DaVinci Resolve (and other NLEs).
- **Preview / AI analysis** should use FFmpeg-generated **H.264 proxies** when the source is difficult.

## Sony formats (common pain points)

| Label (UI) | Typical essence | Windows player | AI Editor approach |
|------------|-----------------|----------------|--------------------|
| XAVC HS | H.265 / HEVC | Often fails without HEVC pack | Flag `needsProxy` → FFmpeg → H.264 720p proxy |
| XAVC S | H.264 in MP4 | Sometimes flaky | Same |
| XAVC S-I | Intra H.264 (often MXF) | Often fails | Same |

Misspellings like **XAVS** are treated as XAVC.

## Requirements on the editing PC

1. **Desktop Agent** running (Start Desktop Agent button, or `desktop-agent/start-agent.cmd`)
2. **FFmpeg + FFprobe** on `PATH` (full build, not a stub). Set `FFMPEG_PATH` / `FFPROBE_PATH` if needed.
3. After indexing, click **Generate proxies for XAVC / HEVC**

## What we do *not* do

- Install proprietary Sony codec packs into Windows (optional for the user, not required by ShootSpine)
- Re-encode or rename camera originals
- Upload originals to the cloud for decoding

## Resolve handoff

Exports should reference **original** media paths / MediaAsset IDs. Proxies are for ShootSpine preview and local AI only.
