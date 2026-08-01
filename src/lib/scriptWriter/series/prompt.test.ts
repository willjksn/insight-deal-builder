import { describe, expect, it } from "vitest";
import {
  formatSeriesContextForPrompt,
  formatTrailerSourcesForPrompt,
} from "@/lib/scriptWriter/series/prompt";
import {
  ScriptSeries,
  ScriptSeriesEntry,
  ScriptTrailerResolvedScene,
} from "@/lib/scriptWriter/series/types";

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

  it("adds a story-so-far recap from prior entries in continues mode", () => {
    const prior: ScriptSeriesEntry[] = [
      {
        sessionId: "e1",
        title: "The First Look",
        entryKind: "episode",
        order: 1,
        recap: "Elara notices the watcher.",
        endingBeat: "INT. STUDIO — NIGHT — The webcam light blinks on.",
      },
    ];
    const out = formatSeriesContextForPrompt(baseSeries, "episode", prior, "continues");
    expect(out).toContain("CONTINUITY MODE: CONTINUES PREVIOUS");
    expect(out).toContain("STORY SO FAR");
    expect(out).toContain("Episode 1: The First Look — Elara notices the watcher.");
    expect(out).toContain("Ending beat to pick up from");
    expect(out).toContain("IMMEDIATE HAND-OFF");
  });

  it("treats standalone mode as anthology (no plot continuation)", () => {
    const prior: ScriptSeriesEntry[] = [
      {
        sessionId: "e1",
        title: "The First Look",
        entryKind: "episode",
        order: 1,
        recap: "Elara notices the watcher.",
      },
    ];
    const out = formatSeriesContextForPrompt(baseSeries, "episode", prior, "standalone");
    expect(out).toContain("SAME WORLD, NEW STORY");
    expect(out).toContain("PRIOR ENTRIES");
    expect(out).not.toContain("STORY SO FAR (prior entries");
    expect(out).not.toContain("IMMEDIATE HAND-OFF");
  });

  it("uses a trailer-specific directive", () => {
    const out = formatSeriesContextForPrompt(baseSeries, "trailer", []);
    expect(out).toContain("TRAILER");
    expect(out).not.toContain("STORY SO FAR (prior entries");
  });
});

describe("formatTrailerSourcesForPrompt", () => {
  it("returns empty string with no scenes", () => {
    expect(formatTrailerSourcesForPrompt([])).toBe("");
  });

  it("lists source scenes with their entry label, action, and lines", () => {
    const scenes: ScriptTrailerResolvedScene[] = [
      {
        entryLabel: "Episode 1: The First Look",
        sceneNumber: "3",
        heading: "INT. STUDIO — NIGHT",
        action: "Elara freezes as the webcam light blinks on by itself.",
        lines: ["ELARA: Who's there?"],
      },
    ];
    const out = formatTrailerSourcesForPrompt(scenes);
    expect(out).toContain("TRAILER SOURCE MATERIAL");
    expect(out).toContain("Episode 1: The First Look · Scene 3: INT. STUDIO — NIGHT");
    expect(out).toContain("webcam light blinks on by itself");
    expect(out).toContain("ELARA: Who's there?");
    expect(out).toContain("do NOT invent new plot");
  });
});
