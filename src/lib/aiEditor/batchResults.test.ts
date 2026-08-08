import { describe, expect, it } from "vitest";
import { batchFailureCount, successfulBatchIds } from "@/lib/aiEditor/batchResults";

describe("batchResults", () => {
  it("collects only successful ids", () => {
    const ids = successfulBatchIds([
      { ok: true, id: "a" },
      { ok: false, id: "b" },
      { ok: true, id: "c" },
      { ok: true, id: null },
    ]);
    expect([...ids].sort()).toEqual(["a", "c"]);
  });

  it("counts failures from flag or ok:false rows", () => {
    expect(batchFailureCount([{ ok: true }, { ok: false }, { ok: false }], 2)).toBe(2);
    expect(batchFailureCount([{ ok: true }, { ok: false }])).toBe(1);
  });
});
