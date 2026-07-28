import { NextRequest, NextResponse } from "next/server";
import { getCreatorNetworkSummary, searchCreators } from "@/lib/creators/opsServer";
import { creatorApiError, requireCreatorManager } from "@/lib/creators/routeHelpers";
import type { CreatorNetworkFilters } from "@/lib/creators/opsTypes";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { appUser } = await requireCreatorManager(request);
    const { searchParams } = new URL(request.url);
    if (searchParams.get("summary") === "1") {
      const summary = await getCreatorNetworkSummary(appUser);
      return NextResponse.json({ summary });
    }
    const filters: CreatorNetworkFilters = {
      q: searchParams.get("q") || undefined,
      location: searchParams.get("location") || undefined,
      availableOnly: searchParams.get("availableOnly") === "1",
      applicantsOnly: searchParams.get("applicantsOnly") === "1",
      relationshipTypes: searchParams.get("relationshipTypes")?.split(",").filter(Boolean),
      statuses: searchParams.get("statuses")?.split(",").filter(Boolean),
      readinessStatuses: searchParams.get("readinessStatuses")?.split(",").filter(Boolean),
      niches: searchParams.get("niches")?.split(",").filter(Boolean),
      platforms: searchParams.get("platforms")?.split(",").filter(Boolean),
      tags: searchParams.get("tags")?.split(",").filter(Boolean),
    };
    const creators = await searchCreators(appUser, filters);
    return NextResponse.json({ creators });
  } catch (err) {
    return creatorApiError(err);
  }
}
