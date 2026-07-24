import { describe, expect, it } from "vitest";
import { stripUndefined } from "@/lib/firebase/firestore";

describe("stripUndefined", () => {
  it("removes undefined nested fields in agent output drafts", () => {
    const cleaned = stripUndefined({
      output: {
        drafts: [
          {
            channel: "linkedin_dm",
            body: "Hello",
            recipientEmail: undefined,
            recipientName: undefined,
          },
        ],
      },
    });
    expect(cleaned).toEqual({
      output: {
        drafts: [{ channel: "linkedin_dm", body: "Hello" }],
      },
    });
  });

  it("strips undefined keys inside deeply nested arrays (Firestore rejects undefined)", () => {
    const cleaned = stripUndefined({
      acts: [
        {
          scenes: [
            {
              heading: "INT. ROOM - DAY",
              dialogue: [{ character: "ANA", line: "Go.", parenthetical: undefined }],
            },
          ],
        },
      ],
    });
    const line = cleaned.acts[0].scenes[0].dialogue[0];
    // Key must be truly absent, not just undefined (toEqual would ignore undefined).
    expect(Object.prototype.hasOwnProperty.call(line, "parenthetical")).toBe(false);
    expect(line).toEqual({ character: "ANA", line: "Go." });
  });
});
