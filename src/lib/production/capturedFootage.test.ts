import { describe, expect, it } from "vitest";
import {
  appendCapturedTake,
  capturedTakes,
  selectCapturedTake,
  unlinkCapturedTake,
  updateCapturedTake,
} from "./capturedFootage";
import type { ProductionDayShot } from "./types";

function shot(): ProductionDayShot {
  return {
    id: "shot-1",
    label: "Gaze",
    done: false,
    sortOrder: 0,
    productionStatus: "ready",
    notes: "On-set note",
    media: [
      { id: "still", role: "ai_previs", url: "https://cdn.example/still.jpg" },
      { id: "old", role: "captured_footage", url: "https://cdn.example/old.mp4", fileName: "old.mp4" },
    ],
  };
}

describe("captured footage", () => {
  it("appends takes without removing older clips or previs", () => {
    const next = appendCapturedTake(shot(), {
      id: "new",
      role: "captured_footage",
      url: "https://cdn.example/new.mp4",
      fileName: "new.mp4",
      takeNumber: 2,
    });
    expect(capturedTakes(next).map((item) => item.id)).toEqual(["old", "new"]);
    expect(next.media?.some((item) => item.id === "still")).toBe(true);
    expect(next.productionStatus).toBe("ready");
  });

  it("stores rating, notes, and a single preferred take", () => {
    const withNotes = updateCapturedTake(shot(), "old", { rating: 4, notes: "best face", camera: "FX3", takeNumber: 1 });
    const preferred = selectCapturedTake(
      appendCapturedTake(withNotes, { id: "b", role: "captured_footage", url: "https://cdn.example/b.mp4" }),
      "b"
    );
    const takes = capturedTakes(preferred);
    expect(takes.find((item) => item.id === "old")?.preferred).toBe(false);
    expect(takes.find((item) => item.id === "b")?.preferred).toBe(true);
    expect(takes.find((item) => item.id === "old")?.rating).toBe(4);
    expect(preferred.notes).toBe("On-set note");
  });

  it("unlinks a take and leaves the other media", () => {
    const next = unlinkCapturedTake(shot(), "old");
    expect(capturedTakes(next)).toHaveLength(0);
    expect(next.media?.some((item) => item.role === "ai_previs")).toBe(true);
  });
});
