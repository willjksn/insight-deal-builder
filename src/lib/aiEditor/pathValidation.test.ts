import { describe, expect, it } from "vitest";
import {
  assertSafeStoragePath,
  containsPathTraversal,
  isPathInsideRoot,
} from "@/lib/aiEditor/pathValidation";

describe("aiEditor pathValidation", () => {
  it("detects traversal", () => {
    expect(containsPathTraversal("C:\\foo\\..\\bar")).toBe(true);
    expect(containsPathTraversal("C:\\Projects\\Media")).toBe(false);
  });

  it("checks root containment", () => {
    expect(isPathInsideRoot("X:\\ShootSpine", "X:\\ShootSpine\\A\\clip.mp4")).toBe(true);
    expect(isPathInsideRoot("X:\\ShootSpine", "Y:\\Other\\clip.mp4")).toBe(false);
  });

  it("asserts safe storage paths", () => {
    expect(() => assertSafeStoragePath("")).toThrow();
    expect(() => assertSafeStoragePath("C:\\ok\\path")).not.toThrow();
  });
});
