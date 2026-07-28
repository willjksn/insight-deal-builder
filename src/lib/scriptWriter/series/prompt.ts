import {
  ScriptSeries,
  ScriptSeriesEntry,
  ScriptSeriesEntryKind,
  SCRIPT_SERIES_ENTRY_KIND_LABELS,
} from "@/lib/scriptWriter/series/types";

const ENTRY_KIND_DIRECTIVE: Record<ScriptSeriesEntryKind, string> = {
  episode:
    "This is a full EPISODE in the series. Advance the ongoing story while keeping the world and recurring characters consistent.",
  teaser:
    "This is a short TEASER for the series. Tease the world and central mystery with mood and a single hook — do not resolve anything.",
  trailer:
    "This is a TRAILER for the series. Assemble a fast, escalating montage of charged moments drawn from the series world; imply the stakes without spoiling resolutions.",
};

/**
 * Build the high-priority "series canon" block injected into generation so
 * every entry shares one world, recurring cast, and motifs, and carries the
 * story forward from prior entries.
 */
export function formatSeriesContextForPrompt(
  series: ScriptSeries,
  entryKind: ScriptSeriesEntryKind,
  priorEntries: ScriptSeriesEntry[]
): string {
  const lines: string[] = [
    `=== SERIES CANON — "${series.title}" (HIGH PRIORITY — keep continuity) ===`,
    "This piece belongs to a series. Stay consistent with the canon below: same world, tone, and recurring characters. Never rename or recast a recurring character, and do not contradict established facts.",
    ENTRY_KIND_DIRECTIVE[entryKind],
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

  if (priorEntries.length) {
    lines.push("", "STORY SO FAR (prior entries — continue from here, do not repeat):");
    for (const e of priorEntries) {
      const label = `${SCRIPT_SERIES_ENTRY_KIND_LABELS[e.entryKind]} ${e.order}: ${e.title}`;
      lines.push(`- ${label}${e.recap ? ` — ${e.recap}` : ""}`);
    }
  }

  return lines.join("\n");
}
