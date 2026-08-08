import { describe, expect, it } from "vitest";
import { buildProductionContext } from "@/lib/aiEditor/productionContext";
import type { Project } from "@/lib/types";
import type { ProductionBoard } from "@/lib/production/types";
import type { ScriptWriterSession } from "@/lib/scriptWriter/types";

describe("aiEditor productionContext", () => {
  it("normalizes project, board, and script without I/O", () => {
    const project = {
      id: "p1",
      projectName: "Mountain Horror",
      clientName: "IMG",
      projectType: "narrative",
      status: "active",
    } as unknown as Project;

    const board = {
      id: "b1",
      projectId: "p1",
      scriptSessionId: "s1",
      people: [{ id: "1", name: "Stormi" }],
      locations: [{ id: "1", name: "Theater" }],
      productionDays: [
        {
          id: "d1",
          dayNumber: 1,
          shootDate: "2026-08-01",
          primaryLocation: "Theater",
          shots: [
            {
              id: "sh1",
              shotName: "7A",
              sceneRef: "7",
              shotType: "WS",
              cameraBody: "FX3",
              referenceImageUrl: "https://example.com/f.jpg",
            },
          ],
        },
      ],
    } as unknown as ProductionBoard;

    const scriptSession = {
      id: "s1",
      title: "Home Theater",
      script: {
        title: "Home Theater",
        logline: "Something watches",
        scenes: [
          {
            sceneNumber: "7",
            heading: "INT. THEATER - NIGHT",
            action: "Stormi enters",
            dialogue: [{ character: "Stormi", line: "Hello?" }],
          },
        ],
        characters: [{ name: "Stormi" }],
      },
    } as unknown as ScriptWriterSession;

    const ctx = buildProductionContext({ project, board, scriptSession });
    expect(ctx.projectId).toBe("p1");
    expect(ctx.projectName).toBe("Mountain Horror");
    expect(ctx.scenes).toHaveLength(1);
    expect(ctx.characters).toContain("Stormi");
    expect(ctx.shotCount).toBe(1);
    expect(ctx.framedShotCount).toBe(1);
    expect(ctx.scriptSessionId).toBe("s1");
    expect(ctx.aiEditorOnly).toBe(false);
  });

  it("marks footage-only workspaces", () => {
    const project = {
      id: "p2",
      projectName: "Reception selects",
      aiEditorOnly: true,
      projectType: "Custom Project",
      shootType: "Video Only",
      status: "draft",
    } as unknown as Project;
    const ctx = buildProductionContext({ project, board: null, scriptSession: null });
    expect(ctx.aiEditorOnly).toBe(true);
    expect(ctx.shotCount).toBe(0);
    expect(ctx.notes.some((n) => n.includes("Footage-only"))).toBe(true);
  });
});
