import { describe, expect, it } from "vitest";
import {
  initialsFromLabel,
  normalizeSharedNoteBody,
  sharedNotePreview,
} from "@/lib/sharedNotes/initials";

describe("initialsFromLabel", () => {
  it("uses first and last name parts", () => {
    expect(initialsFromLabel("Jane Doe")).toBe("JD");
  });

  it("uses single name prefix", () => {
    expect(initialsFromLabel("Madonna")).toBe("MA");
  });

  it("falls back to email local part", () => {
    expect(initialsFromLabel(undefined, "john.k@example.com")).toBe("JK");
  });
});

describe("normalizeSharedNoteBody", () => {
  it("trims and rejects empty", () => {
    expect(normalizeSharedNoteBody("  hello  ")).toBe("hello");
    expect(normalizeSharedNoteBody("   ")).toBeNull();
  });
});

describe("sharedNotePreview", () => {
  it("truncates long text", () => {
    const long = "a".repeat(200);
    expect(sharedNotePreview(long).length).toBeLessThanOrEqual(120);
  });
});
