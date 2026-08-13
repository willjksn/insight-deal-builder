import type { LiveProductionTargetProfile } from "@/lib/liveProduction/defaultsKeywords";

function regionParts(homeLocation: string): { city: string; state: string; region: string } {
  const loc = homeLocation.trim() || "Charlotte, NC";
  const bits = loc.split(",").map((s) => s.trim()).filter(Boolean);
  const city = bits[0] || "Charlotte";
  const state = bits[1] || "NC";
  return { city, state, region: loc };
}

const AV_CORE =
  '("event production" OR audiovisual OR "audio visual" OR "AV production" OR "LED wall" OR "video wall" OR staging OR "sound reinforcement" OR "live production" OR IMAG OR "production services")';

const STREAM_CORE =
  '("live streaming" OR livestream OR webcast OR "hybrid event" OR "virtual event production" OR "live stream production")';

/**
 * Wide on-demand search plan: public procurement + private/partner + venues.
 * SAM.gov is only one lane — not the primary focus.
 */
export function buildLiveDiscoveryQueries(profile: LiveProductionTargetProfile): string[] {
  const { city, state, region } = regionParts(profile.homeLocation);
  const hasStreaming =
    profile.services.some((s) => /stream/i.test(s)) ||
    profile.keywords.some((k) => /stream|webcast|hybrid/i.test(k));

  const userKw = profile.keywords
    .filter((k) => k.trim().length > 2)
    .slice(0, 8)
    .map((k) => `"${k.replace(/"/g, "")}"`)
    .join(" OR ");

  const kwClause = userKw ? `(${userKw})` : AV_CORE;
  const yearHint = "2025 OR 2026 OR 2027";

  const queries: string[] = [
    // Broad public RFP / bid language near home
    `${region} (RFP OR IFB OR RFQ OR "request for proposal" OR "invitation for bid" OR solicitation OR "bid opportunity") ${kwClause} ${yearHint}`,

    // Cities / municipalities
    `(city OR municipal OR "town of" OR "village of") (${city} OR ${state}) (procurement OR purchasing OR bids OR RFP) ${AV_CORE} ${yearHint}`,

    // Counties
    `(county OR "board of commissioners") (${city} OR ${state}) (procurement OR purchasing OR bids OR RFP OR solicitation) ${AV_CORE} ${yearHint}`,

    // State procurement / eVP-style portals (query language, not scraping)
    `${state} (state procurement OR eProcurement OR "vendor portal" OR "purchasing division" OR IPS OR "interactive purchasing") ${AV_CORE} (RFP OR bid OR solicitation)`,

    // Universities / colleges / school systems
    `${region} (university OR college OR "community college" OR "school district" OR "board of education") (RFP OR bid OR solicitation) ${AV_CORE}`,

    // Convention centers, arenas, venues
    `${region} ("convention center" OR arena OR amphitheater OR "performing arts" OR venue OR coliseum) (RFP OR bid OR "AV services" OR "production services" OR "event production")`,

    // Churches / houses of worship / nonprofit events
    `${region} (church OR ministry OR "house of worship" OR nonprofit) ("event production" OR AV OR "sound and lighting" OR "live stream" OR staging) (RFP OR proposal OR bid OR "looking for")`,

    // Corporate / private event & experiential (non-gov)
    `${region} (corporate OR "event agency" OR experiential OR "conference production" OR "meeting planner") (RFP OR RFI OR "AV RFP" OR "production RFP" OR "seeking AV" OR "seeking production") ${AV_CORE}`,

    // Festival / concert / municipal special events
    `${region} (festival OR concert OR "special events" OR parade OR "outdoor event") (production OR AV OR staging OR lighting OR "sound system" OR LED) (RFP OR bid OR "vendor application" OR "production company")`,

    // Partner / private overflow / subcontract (not formal RFP)
    `${region} ("subrent" OR "sub-rent" OR overflow OR "need LED" OR "need AV support" OR "looking for production company" OR "seeking AV vendor" OR "co-pro" OR "production partner") (event OR conference OR concert OR wedding OR corporate)`,

    // Federal is optional lane only
    `site:sam.gov (${state} OR ${city}) (audiovisual OR "event production" OR "sound reinforcement" OR "video wall" OR staging OR "live streaming")`,
  ];

  if (hasStreaming) {
    queries.push(
      `${region} (RFP OR solicitation OR bid OR "request for proposal") ${STREAM_CORE} (university OR city OR county OR church OR conference OR corporate)`,
      `${region} (commencement OR conference OR worship OR "town hall" OR "hybrid meeting") ${STREAM_CORE} (production OR AV OR video)`
    );
  }

  // Deduplicate and cap — runDiscovery will execute most of these on demand.
  return [...new Set(queries.map((q) => q.replace(/\s+/g, " ").trim()))].slice(0, 12);
}

/** Human-readable source lanes shown in the UI (on-demand search, not nightly). */
export const LIVE_DISCOVERY_SOURCE_LANES = [
  "Cities & municipalities",
  "Counties",
  "State procurement portals",
  "Universities & schools",
  "Venues & convention centers",
  "Churches & nonprofits",
  "Corporate / private / agencies",
  "Festivals & special events",
  "Partner / subcontract overflow",
  "Federal (SAM.gov) — one lane among many",
  "Live streaming / webcast / hybrid",
] as const;
