import { Timestamp } from "firebase/firestore";

/** Firestore collection holding series "bibles" (shared canon across entries). */
export const SCRIPT_SERIES_COLLECTION = "scriptSeries";

/** What kind of entry a session is within a series. */
export type ScriptSeriesEntryKind = "episode" | "teaser" | "trailer";

export const SCRIPT_SERIES_ENTRY_KIND_LABELS: Record<ScriptSeriesEntryKind, string> = {
  episode: "Episode",
  teaser: "Teaser",
  trailer: "Trailer",
};

/**
 * How a new entry relates to prior entries:
 * - continues: pick up plot/emotional threads from the story so far
 * - standalone: same series world/cast/tone, self-contained plot (anthology)
 */
export type ScriptSeriesContinuityMode = "continues" | "standalone";

export const SCRIPT_SERIES_CONTINUITY_LABELS: Record<ScriptSeriesContinuityMode, string> = {
  continues: "Continues previous",
  standalone: "Same world, new story",
};

/** A recurring character reused across every entry in the series. */
export interface ScriptSeriesCharacter {
  id: string;
  name: string;
  role?: string;
  description?: string;
}

/**
 * A series "bible" — the shared canon (premise, world, tone, recurring cast,
 * motifs) that every entry (episode/teaser/trailer) is generated against so the
 * pieces feel like one connected world with real continuity.
 */
export interface ScriptSeries {
  id: string;
  ownerUserId: string;
  title: string;
  /** Core premise / logline of the series world. */
  premise?: string;
  /** The recurring theme/message (e.g. "someone is always watching"). */
  theme?: string;
  /** World / setting — place, era, rules. */
  world?: string;
  /** Tone words (e.g. "paranoid, intimate, slow-burn"). */
  tone?: string;
  genre?: string;
  /** Signature visual look & feel shared across entries. */
  lookAndFeel?: string;
  /** Recurring visual/thematic motifs the AI must weave into every entry. */
  motifs: string[];
  /** Recurring cast reused (same names/looks) across entries. */
  recurringCharacters: ScriptSeriesCharacter[];
  /** Admin-only sensual tone; carried through to new entries. */
  spicyMode?: boolean;
  createdAt: Timestamp | string;
  updatedAt: Timestamp | string;
}

/** Lightweight summary of a session that belongs to a series (for list views). */
export interface ScriptSeriesEntry {
  sessionId: string;
  title: string;
  entryKind: ScriptSeriesEntryKind;
  order: number;
  /** One-line "what happened" recap captured after the script is written. */
  recap?: string;
  /** How this entry relates to prior ones (default continues). */
  continuityMode?: ScriptSeriesContinuityMode;
  /** Last-scene beat for stronger continuity prompts. */
  endingBeat?: string;
  status?: string;
}

/** A reference to one scene in a sibling entry, selected as trailer material. */
export interface ScriptTrailerSceneRef {
  sessionId: string;
  sceneNumber: string;
}

/** A sibling entry with its scenes, offered as pickable trailer material. */
export interface ScriptTrailerSourceEntry {
  sessionId: string;
  title: string;
  entryKind: ScriptSeriesEntryKind;
  order: number;
  scenes: { sceneNumber: string; heading: string; action: string }[];
}

/** A fully resolved source scene (with dialogue) used to build the trailer prompt. */
export interface ScriptTrailerResolvedScene {
  entryLabel: string;
  sceneNumber: string;
  heading: string;
  action: string;
  lines: string[];
}

export interface ScriptSeriesCreateInput {
  title: string;
  premise?: string;
  theme?: string;
  world?: string;
  tone?: string;
  genre?: string;
  lookAndFeel?: string;
  motifs?: string[];
  recurringCharacters?: ScriptSeriesCharacter[];
  spicyMode?: boolean;
}

export type ScriptSeriesUpdateInput = Partial<ScriptSeriesCreateInput>;
