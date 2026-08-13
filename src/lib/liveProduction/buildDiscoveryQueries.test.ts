import { describe, expect, it } from "vitest";
import { buildLiveDiscoveryQueries } from "./buildDiscoveryQueries";
import { defaultImgLiveProductionProfile } from "./defaultsKeywords";

describe("buildLiveDiscoveryQueries", () => {
  it("builds a wide on-demand plan beyond SAM.gov", () => {
    const profile = defaultImgLiveProductionProfile();
    const queries = buildLiveDiscoveryQueries(profile);
    expect(queries.length).toBeGreaterThanOrEqual(8);
    expect(queries.some((q) => /county/i.test(q))).toBe(true);
    expect(queries.some((q) => /city OR municipal|municipal/i.test(q))).toBe(true);
    expect(queries.some((q) => /university OR college/i.test(q))).toBe(true);
    expect(queries.some((q) => /corporate|event agency|experiential/i.test(q))).toBe(true);
    expect(queries.some((q) => /subrent|overflow|production partner/i.test(q))).toBe(true);
    expect(queries.some((q) => /sam\.gov/i.test(q))).toBe(true);
    expect(queries.some((q) => /live streaming|livestream|webcast/i.test(q))).toBe(true);
  });

  it("still builds base AV queries without streaming service", () => {
    const profile = {
      ...defaultImgLiveProductionProfile(),
      services: ["LED", "Audio"],
      keywords: ["LED wall", "PA system"],
    };
    const queries = buildLiveDiscoveryQueries(profile);
    expect(queries.some((q) => /LED|AV|event production/i.test(q))).toBe(true);
    expect(queries.filter((q) => /live streaming|livestream/i.test(q)).length).toBeLessThan(
      queries.filter((q) => /county|municipal|university|corporate/i.test(q)).length
    );
  });
});
