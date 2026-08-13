import type { LiveDiscoveryCandidate } from "@/lib/liveProduction/discoveryTypes";
import type { LiveProductionTargetProfile } from "@/lib/liveProduction/defaultsKeywords";

/** Offline / unconfigured fallback so the discovery UI is usable without Tavily. */
export function mockLiveDiscoveryCandidates(
  profile: LiveProductionTargetProfile
): LiveDiscoveryCandidate[] {
  const loc = profile.homeLocation || "Charlotte, NC";
  const city = loc.split(",")[0]?.trim() || "Charlotte";
  return [
    {
      id: "mock_stream_1",
      title: `${city} University Commencement — Live Stream & IMAG`,
      organizationName: `${city} University`,
      opportunityType: "University Live Streaming",
      location: loc,
      sourceKind: "university",
      sourceUrl: undefined,
      bidDeadline: undefined,
      estimatedValueLow: 12000,
      estimatedValueHigh: 28000,
      summary:
        "Demo candidate: multi-camera commencement capture with IMAG and live streaming to the web. Not a live web result — run discovery with Tavily/Gemini for real openings.",
      whyFit: "Matches Live Streaming + IMAG services in your target profile.",
      servicesMentioned: ["Live Streaming", "IMAG", "Cameras", "Audio"],
      includesLiveStreaming: true,
      priority: "high",
    },
    {
      id: "mock_led_1",
      title: `Annual Audio, Lighting & LED Production Services`,
      organizationName: `City of ${city}`,
      opportunityType: "Municipal Event Production",
      location: loc,
      sourceKind: "city_procurement",
      estimatedValueLow: 18000,
      estimatedValueHigh: 35000,
      summary:
        "Demo candidate: municipal LED / audio / lighting / staging package. Use Add opportunity or live discovery for real solicitations.",
      whyFit: "Strong equipment overlap with LED, audio, lighting, and staging.",
      servicesMentioned: ["LED", "Audio", "Lighting", "Staging", "Truss"],
      includesLiveStreaming: false,
      priority: "high",
    },
    {
      id: "mock_partner_1",
      title: "Overflow LED + live stream package for corporate hybrid meeting",
      organizationName: "Regional AV Partner",
      opportunityType: "Partner / Subcontract",
      location: loc,
      sourceKind: "partner_subcontract",
      estimatedValueLow: 8000,
      estimatedValueHigh: 15000,
      summary:
        "Demo partner overflow request: wall + stream encode for a three-day conference.",
      whyFit: "Partner subcontract with Live Streaming + LED.",
      servicesMentioned: ["LED", "Live Streaming", "Technical Labor"],
      includesLiveStreaming: true,
      priority: "good",
    },
  ];
}
