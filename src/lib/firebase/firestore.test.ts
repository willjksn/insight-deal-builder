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
});
