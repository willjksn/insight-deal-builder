import { describe, expect, it } from "vitest";
import { syncProductionShot } from "./sceneBuilderHandoff";
import { matchesSelect, nextShotId, reviewStateFor, reviewSummary, reviewUnits, setTakeDecision, shotIsReviewed } from "./takeReview";
import type { ProductionDayShot } from "./types";
import type { TakeGroup } from "./ingestTypes";

function shot(partial: Partial<ProductionDayShot> = {}): ProductionDayShot {
  return {
    id: "shot-1",
    label: "Wide",
    done: false,
    sortOrder: 0,
    media: [
      { id: "a", role: "captured_footage", url: "", fileName: "A.mp4", camera: "Camera A — FX3", metadata: { ingestClipId: "clip-a" } },
      { id: "b", role: "captured_footage", url: "", fileName: "B.mp4", camera: "Camera B — FX30", metadata: { ingestClipId: "clip-b" } },
      { id: "c", role: "captured_footage", url: "https://cdn.example/manual.mp4", fileName: "manual.mp4", mediaType: "video" },
    ],
    ...partial,
  };
}

const group: TakeGroup = {
  id: "tg-1",
  projectId: "p",
  productionShotId: "shot-1",
  members: [
    { clipId: "clip-a", offsetSeconds: 0 },
    { clipId: "clip-b", offsetSeconds: 1.2 },
  ],
  takeNumber: 3,
  confidence: "high",
  confidenceScore: 0.9,
  matchReasons: ["Strong audio waveform match"],
  state: "confirmed",
  origin: "auto",
  preferredAudioClipId: "clip-b",
  createdAt: "2026-09-24T00:00:00.000Z",
  updatedAt: "2026-09-24T00:00:00.000Z",
};

describe("take review", () => {
  it("shows a confirmed group as one take and leaves other clips separate", () => {
    const units = reviewUnits(shot(), [group]);
    expect(units.map((unit) => unit.id)).toEqual(["tg-1", "c"]);
    expect(units[0].angles).toHaveLength(2);
    expect(units[0].angles[1].offsetSeconds).toBe(1.2);
  });

  it("keeps one best take and does not remove a rejected clip", () => {
    let next = setTakeDecision(shot(), "tg-1", "group", "best");
    next = setTakeDecision(next, "c", "clip", "best");
    next = setTakeDecision(next, "tg-1", "group", "reject");
    expect(next.media).toHaveLength(3);
    expect(next.takeReviews?.find((review) => review.id === "c")?.decision).toBe("best");
    expect(next.takeReviews?.find((review) => review.id === "tg-1")?.decision).toBe("reject");
    expect(next.takeReviews?.filter((review) => review.decision === "best")).toHaveLength(1);
  });

  it("moves to the next shot that has no decision", () => {
    const first = setTakeDecision(shot(), "c", "clip", "best");
    const second = shot({ id: "shot-2", sortOrder: 1, media: [{ id: "x", role: "captured_footage", url: "" }] });
    expect(shotIsReviewed(first, [group])).toBe(false);
    const reviewed = setTakeDecision(setTakeDecision(first, "tg-1", "group", "alternate"), "c", "clip", "best");
    expect(shotIsReviewed(reviewed, [group])).toBe(true);
    expect(reviewStateFor(reviewed, [group])).toBe("reviewed");
    expect(matchesSelect(reviewed, "rejected")).toBe(false);
    const rejected = setTakeDecision(reviewed, "tg-1", "group", "reject");
    expect(rejected.media).toHaveLength(3);
    expect(matchesSelect(rejected, "rejected", [group])).toBe(true);
    expect(matchesSelect(rejected, "best", [group])).toBe(true);
    expect(nextShotId([reviewed, second], reviewed.id, "unreviewed", [group])).toBe("shot-2");
    expect(reviewSummary([reviewed, second], [group]).planned).toBe(2);
  });

  it("keeps review decisions when Scene Builder syncs the shot", () => {
    const reviewed = { ...setTakeDecision(shot(), "c", "clip", "alternate"), pickupReason: "Focus issue", productionStatus: "needs_pickup" as const };
    const synced = syncProductionShot(reviewed, { ...reviewed, label: "Wide updated", sceneNotes: "from scene", media: [] });
    expect(synced.label).toBe("Wide updated");
    expect(synced.takeReviews?.[0].decision).toBe("alternate");
    expect(synced.pickupReason).toBe("Focus issue");
    expect(synced.productionStatus).toBe("needs_pickup");
    expect(synced.media?.some((item) => item.id === "c")).toBe(true);
  });
});
