import { describe, expect, it } from "vitest";
import {
  createEditNote,
  formatEditNotesForChat,
  normalizeEditNotes,
  wantsNotesDrivenEdit,
} from "@/lib/aiEditor/editNotes";

describe("editNotes", () => {
  it("creates and formats notes", () => {
    const n = createEditNote({
      text: "Client wants faster cuts in the open",
      source: "client",
    });
    expect(n?.source).toBe("client");
    const formatted = formatEditNotesForChat([n!]);
    expect(formatted).toMatch(/Client/);
    expect(formatted).toMatch(/faster cuts/i);
  });

  it("caps and cleans notes", () => {
    const cleaned = normalizeEditNotes([
      { id: "1", text: "  keep  ", source: "shooting", createdAt: "t" },
      { id: "2", text: "   ", source: "general", createdAt: "t" },
    ]);
    expect(cleaned).toHaveLength(1);
    expect(cleaned[0].text).toBe("keep");
  });

  it("detects notes-driven chat phrasing", () => {
    expect(wantsNotesDrivenEdit("use my notes")).toBe(true);
    expect(wantsNotesDrivenEdit("follow the edit notes")).toBe(true);
    expect(wantsNotesDrivenEdit("remove the first clip")).toBe(false);
  });
});
