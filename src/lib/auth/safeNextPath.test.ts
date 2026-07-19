import { describe, expect, it } from "vitest";
import { safeNextPath } from "@/lib/auth/safeNextPath";

describe("safeNextPath", () => {
  it("allows relative app paths", () => {
    expect(safeNextPath("/projects/abc/coverage")).toBe("/projects/abc/coverage");
  });

  it("rejects open redirects", () => {
    expect(safeNextPath("//evil.com")).toBe("/dashboard");
    expect(safeNextPath("https://evil.com")).toBe("/dashboard");
    expect(safeNextPath(null)).toBe("/dashboard");
  });
});
