import { describe, expect, it } from "vitest";
import { ScoutProject } from "@/lib/scout/types";
import {
  pickScoutSessionsForProject,
  scoutHrefForProject,
  scoutSessionMatchesProject,
} from "@/lib/utils/scoutProjectLink";

function scout(overrides: Partial<ScoutProject> & Pick<ScoutProject, "id">): ScoutProject {
  return {
    userId: "u1",
    projectName: "Test",
    sceneType: "short_film",
    sceneIdea: "Scene",
    mood: "cinematic",
    platform: "youtube",
    aspectRatio: "16:9",
    skillLevel: "intermediate",
    preferredLook: "s_log3",
    status: "needs_images",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("scoutSessionMatchesProject", () => {
  it("matches by linkedProjectId", () => {
    expect(scoutSessionMatchesProject(scout({ id: "s1", linkedProjectId: "p1" }), "p1")).toBe(true);
  });

  it("matches orphan session by project name", () => {
    expect(
      scoutSessionMatchesProject(
        scout({ id: "s1", projectName: "The Uninvited Screening — location scout" }),
        "p1",
        "The Uninvited Screening"
      )
    ).toBe(true);
  });

  it("does not match session linked to another project", () => {
    expect(
      scoutSessionMatchesProject(
        scout({ id: "s1", linkedProjectId: "other", projectName: "The Uninvited Screening" }),
        "p1",
        "The Uninvited Screening"
      )
    ).toBe(false);
  });
});

describe("pickScoutSessionsForProject", () => {
  it("includes board-linked scout ids", () => {
    const sessions = pickScoutSessionsForProject(
      [scout({ id: "s1", linkedProjectId: "other" })],
      "p1",
      { boardLinkedScoutIds: ["s1"], projectName: "Demo" }
    );
    expect(sessions.map((s) => s.id)).toEqual(["s1"]);
  });
});

describe("scoutHrefForProject", () => {
  it("opens existing session instead of new form", () => {
    const href = scoutHrefForProject("p1", [
      scout({ id: "scout-abc", linkedProjectId: "p1" }),
    ]);
    expect(href).toMatch(/^\/scout\/scout-abc/);
  });
});
