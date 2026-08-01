import {
  ScriptSeries,
  ScriptSeriesContinuityMode,
  ScriptSeriesEntry,
  ScriptSeriesEntryKind,
  ScriptTrailerResolvedScene,
  SCRIPT_SERIES_ENTRY_KIND_LABELS,
} from "@/lib/scriptWriter/series/types";

const ENTRY_KIND_DIRECTIVE: Record<ScriptSeriesEntryKind, string> = {
  episode:
    "This is a full EPISODE in the series. Keep the world and recurring characters consistent.",
  teaser:
    "This is a short TEASER for the series. Tease the world and central mystery with mood and a single hook — do not resolve anything.",
  trailer:
    "This is a TRAILER for the series. Assemble a fast, escalating montage of charged moments drawn from the series world; imply the stakes without spoiling resolutions.",
};

const CONTINUITY_DIRECTIVE: Record<ScriptSeriesContinuityMode, string> = {
  continues: [
    "CONTINUITY MODE: CONTINUES PREVIOUS.",
    "This episode must feel like the next chapter — same emotional temperature, visual grammar, and character voices.",
    "Pick up threads from prior entries: unresolved tension, relationships, and the last episode's ending beat.",
    "Do not soft-reboot or re-introduce the world from scratch. Do not repeat prior plot beats.",
    "Advance the story with a clear new turn that could only happen after what already occurred.",
  ].join(" "),
  standalone: [
    "CONTINUITY MODE: SAME WORLD, NEW STORY (anthology).",
    "Reuse the series world, tone, look, motifs, and recurring cast identities,",
    "but tell a self-contained story that does not require knowing prior episodes.",
    "Do not continue unresolved plot from prior entries; you may echo themes only.",
  ].join(" "),
};

/**
 * Build the high-priority "series canon" block injected into generation so
 * every entry shares one world, recurring cast, and motifs — and optionally
 * carries the story forward from prior entries.
 */
export function formatSeriesContextForPrompt(
  series: ScriptSeries,
  entryKind: ScriptSeriesEntryKind,
  priorEntries: ScriptSeriesEntry[],
  continuityMode: ScriptSeriesContinuityMode = "continues"
): string {
  const lines: string[] = [
    `=== SERIES CANON — "${series.title}" (HIGH PRIORITY — keep continuity) ===`,
    "This piece belongs to a series. Stay consistent with the canon below: same world, tone, and recurring characters. Never rename or recast a recurring character, and do not contradict established facts.",
    ENTRY_KIND_DIRECTIVE[entryKind],
    CONTINUITY_DIRECTIVE[continuityMode],
  ];

  if (series.premise) lines.push(`Series premise: ${series.premise}`);
  if (series.theme) lines.push(`Recurring theme: ${series.theme}`);
  if (series.world) lines.push(`World / setting: ${series.world}`);
  if (series.tone) lines.push(`Tone: ${series.tone}`);
  if (series.genre) lines.push(`Genre: ${series.genre}`);
  if (series.lookAndFeel) lines.push(`Signature look: ${series.lookAndFeel}`);

  if (series.recurringCharacters.length) {
    lines.push("", "RECURRING CHARACTERS (reuse exactly — same names and traits):");
    for (const c of series.recurringCharacters) {
      const parts = [c.name];
      if (c.role) parts.push(`(${c.role})`);
      if (c.description) parts.push(`— ${c.description}`);
      lines.push(`- ${parts.join(" ")}`);
    }
  }

  if (series.motifs.length) {
    lines.push(
      "",
      "SIGNATURE MOTIFS (weave these recurring beats into the visuals/shots):"
    );
    for (const m of series.motifs) lines.push(`- ${m}`);
  }

  if (continuityMode === "continues" && priorEntries.length) {
    lines.push(
      "",
      "STORY SO FAR (prior entries — continue from here; honor ending beats):"
    );
    for (const e of priorEntries) {
      const label = `${SCRIPT_SERIES_ENTRY_KIND_LABELS[e.entryKind]} ${e.order}: ${e.title}`;
      lines.push(`- ${label}${e.recap ? ` — ${e.recap}` : ""}`);
      if (e.endingBeat) {
        lines.push(`  Ending beat to pick up from: ${e.endingBeat}`);
      }
    }
    const last = priorEntries[priorEntries.length - 1];
    if (last) {
      lines.push(
        "",
        `IMMEDIATE HAND-OFF: Your opening should feel continuous with ${SCRIPT_SERIES_ENTRY_KIND_LABELS[last.entryKind]} ${last.order} ("${last.title}").` +
          (last.endingBeat
            ? ` Start from the aftermath of: ${last.endingBeat}`
            : last.recap
              ? ` Carry forward: ${last.recap}`
              : "")
      );
    }
  } else if (continuityMode === "standalone" && priorEntries.length) {
    lines.push(
      "",
      "PRIOR ENTRIES (theme/world reference only — do NOT continue their plots):"
    );
    for (const e of priorEntries.slice(-3)) {
      const label = `${SCRIPT_SERIES_ENTRY_KIND_LABELS[e.entryKind]} ${e.order}: ${e.title}`;
      lines.push(`- ${label}${e.recap ? ` — ${e.recap}` : ""}`);
    }
  }

  return lines.join("\n");
}

/**
 * For trailer/teaser entries: the specific canon scenes (from sibling episodes)
 * the editor picked to assemble the trailer from. The AI must build the piece
 * out of THIS material — selecting, trimming, reordering, and intercutting —
 * rather than inventing new plot.
 */
export function formatTrailerSourcesForPrompt(
  scenes: ScriptTrailerResolvedScene[]
): string {
  if (!scenes.length) return "";
  const lines: string[] = [
    "=== TRAILER SOURCE MATERIAL (assemble the trailer from THESE canon scenes) ===",
    "Build the trailer/teaser by selecting, trimming, reordering, and intercutting the most charged moments from the source scenes below. Stay faithful to what actually happens in them — do NOT invent new plot or characters. You may tease and withhold, but every beat must trace back to this material. Escalate toward a hook; do not reveal resolutions.",
  ];
  for (const s of scenes) {
    lines.push("", `— ${s.entryLabel} · Scene ${s.sceneNumber}: ${s.heading}`);
    if (s.action) lines.push(s.action);
    for (const l of s.lines) lines.push(`  ${l}`);
  }
  return lines.join("\n");
}
