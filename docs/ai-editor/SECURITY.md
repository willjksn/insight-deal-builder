# AI Editor — Security

- Localhost-only agent bind.
- Agent session tokens minted by ShootSpine after Firebase auth; short TTL.
- Filesystem ops restricted to user-authorized StorageLocation roots.
- Path validation rejects traversal (`..`), null bytes, and paths outside roots.
- No remote shell; no executing model-produced shell commands.
- Destructive delete (later) requires explicit confirmation + ownership via MediaAsset records — never by folder-name match alone.
- Originals are never modified by AI Editor.
- Do not log secrets or full media content in agent logs.
