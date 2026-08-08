# AI Editor — AI Pipeline

Local-first analysis; cloud reasoning only when beneficial.

## V1A

No local AI models yet. Scaffold only:

- `MediaEngine` abstraction (probe / thumbnail)
- Future `AIProvider` split (local vision, local transcription, cloud reasoning)

## Later phases

See `ROADMAP.md` V1C+ for transcription, shot classification, take scoring, Edit by Chat.

**Rule:** do not send original camera media to cloud providers by default. Prefer proxies, transcripts, and structured metadata.
