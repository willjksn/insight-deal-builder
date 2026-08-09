export type ResolveManualChunk = {
  id: string;
  page: number;
  text: string;
};

export type ResolveManualManifest = {
  sourceFile: string;
  sourceName: string;
  pageCount: number;
  chunkCount: number;
  manualLabel: string;
  indexedWith?: string;
};

export type ResolveManualCitation = {
  page: number;
  excerpt: string;
  chunkId: string;
};

export type ResolveManualChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ResolveManualChatResult = {
  answer: string;
  steps: string[];
  /** Optional coach tips / gotchas grounded in the manual excerpts. */
  tips?: string[];
  citations: ResolveManualCitation[];
  mode: "manual_grounded" | "excerpts_only" | "index_missing";
  manualLabel: string | null;
  pageCount: number | null;
};
