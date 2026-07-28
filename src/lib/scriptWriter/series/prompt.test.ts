import { describe, expect, it } from "vitest";
import { formatSeriesContextForPrompt } from "@/lib/scriptWriter/series/prompt";
import { ScriptSeries, ScriptSeriesEntry } from "@/lib/scriptWriter/series/types";

const baseSeries: ScriptSeries = {
  id: "s1",
  ownerUserId: "u1",
  title: "The Gaze",
  premise: "A creator can never shake the sense of being watched.",
  theme: "Being watched",
  world: "Present-day creator's studio",
  tone: "Paranoid, intimate",
  genre: "Psychological thriller",
  lookAndFeel: "Cool low-key light, reflections",
  motifs: ["POV watcher shot", "Reflections in screens"],
  recurringCharacters: [
    { id: "c1", name: "Elara", role: "the creator", description: "Guarded, observant" },
  ],
  spicyMode: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("formatSeriesContextForPrompt", () => {
  it("includes canon, recurring cast, and motifs", () => {
    const out = formatSeriesContextForPrompt(baseSeries, "episode", []);
    expect(out).toContain('SERIES CANON — "The Gaze"');
    expect(out).toContain("Recurring theme: Being watched");
    expect(out).toContain("Elara (the creator) — Guarded, observant");
    expect(out).toContain("POV watcher shot");
    expect(out).toContain("full EPISODE");
  });

  it("adds a story-so-far recap from prior entries", () => {
    const prior: ScriptSeriesEntry[] = [
      { sessionId: "e1", title: "The First Look", entryKind: "episode", order: 1, recap: "Elara notices the watcher." },
    ];
    const out = formatSeriesContextForPrompt(baseSeries, "episode", prior);
    expect(out).toContain("STORY SO FAR");
    expect(out).toContain("Episode 1: The First Look — Elara notices the watcher.");
  });

  it("uses a trailer-specific directive", () => {
    const out = formatSeriesContextForPrompt(baseSeries, "trailer", []);
    expect(out).toContain("TRAILER");
    expect(out).not.toContain("STORY SO FAR");
  });
});
