import { describe, expect, it } from "vitest";
import { isFirestoreIndexPending } from "@/lib/revenueOpportunities/server/queryHelpers";

describe("isFirestoreIndexPending", () => {
  it("detects gRPC code 9", () => {
    expect(isFirestoreIndexPending({ code: 9, message: "index" })).toBe(true);
  });

  it("detects FAILED_PRECONDITION message", () => {
    expect(
      isFirestoreIndexPending(
        new Error("9 FAILED_PRECONDITION: The query requires an index.")
      )
    ).toBe(true);
  });

  it("returns false for other errors", () => {
    expect(isFirestoreIndexPending(new Error("Not found"))).toBe(false);
  });
});
