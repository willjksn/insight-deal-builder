import { describe, expect, it } from "vitest";
import {
  IMG_INDUSTRY_CUSTOM_VALUE,
  IMG_INDUSTRY_PRESETS,
  isImgIndustryPreset,
} from "@/lib/revenueOpportunities/labels";

describe("IMG industry helpers", () => {
  it("treats presets as presets and custom text as not", () => {
    expect(isImgIndustryPreset(IMG_INDUSTRY_PRESETS[0])).toBe(true);
    expect(isImgIndustryPreset("Boutique wellness")).toBe(false);
    expect(isImgIndustryPreset("Custom industry")).toBe(false);
    expect(isImgIndustryPreset(IMG_INDUSTRY_CUSTOM_VALUE)).toBe(false);
    expect(isImgIndustryPreset("")).toBe(false);
  });
});
