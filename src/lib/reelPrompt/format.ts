import type { ReelPromptClip, ReelPromptPack } from "@/lib/reelPrompt/types";

/** Format one clip + continuity for clipboard. */
export function formatReelClipForCopy(pack: ReelPromptPack, clip: ReelPromptClip): string {
  return [
    `// ${pack.title} — clip ${clip.index} (${clip.beat}, ${clip.duration})`,
    `// Style: ${pack.style} · ${pack.platform}`,
    clip.camera ? `// Camera: ${clip.camera}` : "",
    "",
    "CONTINUITY:",
    pack.continuityBlock,
    "",
    "PROMPT:",
    clip.prompt,
    clip.dialogueOrVo ? `\nVO:\n${clip.dialogueOrVo}` : "",
    clip.onScreenText ? `\nON-SCREEN TEXT:\n${clip.onScreenText}` : "",
    pack.avoid.length ? `\nAVOID:\n${pack.avoid.map((a) => `- ${a}`).join("\n")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function formatReelPackForCopy(pack: ReelPromptPack): string {
  const parts = [
    `# ${pack.title}`,
    `${pack.logline}`,
    `Length: ${pack.targetLength} · ${pack.style} · ${pack.platform}`,
    "",
    "## Continuity",
    pack.continuityBlock,
    "",
    "## Avoid",
    ...pack.avoid.map((a) => `- ${a}`),
    "",
  ];
  for (const clip of pack.clips) {
    parts.push(
      `## Clip ${clip.index} — ${clip.beat} (${clip.duration})`,
      clip.camera ? `Camera: ${clip.camera}` : "",
      clip.prompt,
      clip.dialogueOrVo ? `VO: ${clip.dialogueOrVo}` : "",
      clip.onScreenText ? `Text: ${clip.onScreenText}` : "",
      ""
    );
  }
  return parts.filter((l) => l !== undefined && l !== "").join("\n");
}
