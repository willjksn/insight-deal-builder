import { describe, expect, it } from "vitest";
import {
  normalizeSceneRef,
  productionSceneFramesFromScript,
  productionShotsFromScript,
} from "@/lib/scriptWriter/scriptMappers";
import { ScriptDocument } from "@/lib/scriptWriter/types";

const scriptWithNumericScenes = {
  title: "Test",
  logline: "Logline",
  fountain: "",
  scenes: [
    {
      sceneNumber: 1 as unknown as string,
      heading: "INT. LIVING ROOM - NIGHT",
      action: "Action beat.",
      dialogue: [],
    },
  ],
  characters: [],
  suggestedShots: [
    {
      sceneNumber: 1 as unknown as string,
      shotNumber: 1,
      shotType: "master_wide",
      description: "Wide shot",
    },
  ],
  storyboardFrames: [
    {
      sceneNumber: 1 as unknown as string,
      shotType: "master_wide",
      caption: "Stormi watches TV",
    },
  ],
} as ScriptDocument;

describe("scriptMappers scene numbers", () => {
  it("normalizes numeric scene refs", () => {
    expect(normalizeSceneRef(1)).toBe("1");
    expect(normalizeSceneRef(" 2 ")).toBe("2");
  });

  it("maps storyboard frames when sceneNumber is numeric", () => {
    const frames = productionSceneFramesFromScript(scriptWithNumericScenes);
    expect(frames).toHaveLength(1);
    expect(frames[0].sceneRef).toBe("1");
    expect(frames[0].caption).toBe("Stormi watches TV");
  });

  it("maps production shots when sceneNumber is numeric", () => {
    const shots = productionShotsFromScript(scriptWithNumericScenes);
    expect(shots[0].sceneRef).toBe("1");
  });
});
