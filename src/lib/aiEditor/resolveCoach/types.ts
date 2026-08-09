/** DaVinci Resolve bottom-page coach (local guide — no cloud). */

export type ResolveCoachLevel = "beginner" | "intermediate" | "advanced";

/** Official Resolve pages (bottom bar). `project` = setup that spans pages. */
export type ResolveCoachPage =
  | "project"
  | "media"
  | "cut"
  | "edit"
  | "fusion"
  | "color"
  | "fairlight"
  | "deliver";

export type ResolveCoachBlock = {
  heading?: string;
  paragraphs?: string[];
  bullets?: string[];
  tips?: string[];
};

export type ResolveCoachSection = {
  id: string;
  page: ResolveCoachPage;
  level: ResolveCoachLevel;
  title: string;
  summary: string;
  /** Synonyms / phrases for local ask matching */
  keywords: string[];
  /** Short “do this now” checklist shown first */
  steps: string[];
  body: ResolveCoachBlock[];
  relatedIds?: string[];
};

export type ResolveCoachMatch = {
  section: ResolveCoachSection;
  score: number;
};

export const RESOLVE_COACH_PAGES: {
  id: ResolveCoachPage;
  label: string;
  blurb: string;
}[] = [
  { id: "project", label: "Project", blurb: "Create projects, settings, ShootSpine handoff" },
  { id: "media", label: "Media", blurb: "Import, bins, proxies, stills/photos" },
  { id: "cut", label: "Cut", blurb: "Fast assembly and trimming" },
  { id: "edit", label: "Edit", blurb: "Timeline, transitions, titles, effects" },
  { id: "fusion", label: "Fusion", blurb: "Compositing, titles, tracking" },
  { id: "color", label: "Color", blurb: "Nodes, balance, look, stills" },
  { id: "fairlight", label: "Fairlight", blurb: "Dialogue, music, mix" },
  { id: "deliver", label: "Deliver", blurb: "Export presets and render queue" },
];
