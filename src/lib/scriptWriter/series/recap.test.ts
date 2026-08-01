import { describe, expect, it } from "vitest";
import { buildSeriesRecapFields } from "@/lib/scriptWriter/series/recap";
import type { ScriptDocument } from "@/lib/scriptWriter/types";

describe("buildSeriesRecapFields", () => {
  it("returns empty when there is no script", () => {
    expect(buildSeriesRecapFields(null)).toEqual({});
  });

  it("captures logline and last-scene ending beat", () => {
    const script = {
      title: "Always Watching",
      logline: "She realizes the watcher never left.",
      scenes: [
        {
          sceneNumber: "1",
          heading: "INT. STUDIO — DAY",
          action: "Elara edits alone.",
          dialogue: [],
        },
        {
          sceneNumber: "2",
          heading: "INT. STUDIO — NIGHT",
          action: "The webcam light blinks on by itself.",
          dialogue: [],
        },
      ],
    } as unknown as ScriptDocument;

    const fields = buildSeriesRecapFields(script);
    expect(fields.seriesRecap).toContain("She realizes the watcher never left.");
    expect(fields.seriesRecap).toContain("Closes on:");
    expect(fields.seriesEndingBeat).toContain("INT. STUDIO — NIGHT");
    expect(fields.seriesEndingBeat).toContain("webcam light blinks on");
  });
});
