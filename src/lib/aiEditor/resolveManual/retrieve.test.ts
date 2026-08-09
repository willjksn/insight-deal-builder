import { describe, expect, it } from "vitest";
import { retrieveManualChunks } from "@/lib/aiEditor/resolveManual/retrieve";
import type { ResolveManualChunk } from "@/lib/aiEditor/resolveManual/types";

const chunks: ResolveManualChunk[] = [
  {
    id: "p10-1",
    page: 10,
    text: "To add a transition, open the Effects Library and drag a Cross Dissolve onto an edit point between two clips.",
  },
  {
    id: "p200-1",
    page: 200,
    text: "On the Color page, use serial nodes to balance exposure before applying a creative LUT.",
  },
  {
    id: "p50-1",
    page: 50,
    text: "The Media Pool is where you import and organize clips into bins.",
  },
];

describe("retrieveManualChunks", () => {
  it("finds transition guidance", () => {
    const hits = retrieveManualChunks(chunks, "how do I add a cross dissolve transition");
    expect(hits[0]?.chunk.page).toBe(10);
  });

  it("finds color node guidance", () => {
    const hits = retrieveManualChunks(chunks, "color page nodes LUT");
    expect(hits[0]?.chunk.page).toBe(200);
  });
});
