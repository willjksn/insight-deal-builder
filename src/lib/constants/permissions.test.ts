import { describe, expect, it } from "vitest";
import {
  ACCOUNTING_PERMISSIONS,
  CREATOR_PORTAL_PERMISSIONS,
  EMPTY_PERMISSIONS,
  FULL_IMG_PERMISSIONS,
  PARTNER_PERMISSIONS,
  matchingPresetId,
} from "@/lib/constants/permissions";

const IMG = "Insight Media Group LLC";

describe("matchingPresetId", () => {
  it("does not treat a new signup (no org, no permissions) as creator portal", () => {
    expect(matchingPresetId({ ...EMPTY_PERMISSIONS }, "", IMG)).toBe("none");
  });

  it("matches creator portal only when access is actually granted at IMG", () => {
    expect(matchingPresetId({ ...CREATOR_PORTAL_PERMISSIONS }, IMG, IMG)).toBe("creator");
  });

  it("matches full admin, partner, and accounting presets", () => {
    expect(matchingPresetId({ ...FULL_IMG_PERMISSIONS }, IMG, IMG)).toBe("full");
    expect(matchingPresetId({ ...PARTNER_PERMISSIONS }, "Partner Co", IMG)).toBe("partner");
    expect(matchingPresetId({ ...ACCOUNTING_PERMISSIONS }, IMG, IMG)).toBe("accounting");
  });
});
