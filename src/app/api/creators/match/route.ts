import { NextRequest, NextResponse } from "next/server";
import { listCreators } from "@/lib/creators/server";
import { runCreatorMatch } from "@/lib/creators/opsServer";
import { creatorMatchAgent } from "@/lib/creators/creatorMatchAgent";
import { creatorApiError, requireCreatorManager } from "@/lib/creators/routeHelpers";
import { initRevenueAgents } from "@/lib/revenueOpportunities/agents";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { appUser } = await requireCreatorManager(request);
    const body = (await request.json()) as {
      requiredNiche?: string;
      requiredPlatforms?: string[];
      locationPreference?: string;
      audienceNotes?: string;
      limit?: number;
      useAgent?: boolean;
    };
    const brief = {
      requiredNiche: body.requiredNiche,
      requiredPlatforms: body.requiredPlatforms,
      locationPreference: body.locationPreference,
      audienceNotes: body.audienceNotes,
      excludeUnavailable: true,
    };

    if (body.useAgent) {
      initRevenueAgents();
      const creators = await listCreators(appUser);
      const result = await creatorMatchAgent.execute({
        creators,
        brief,
        limit: body.limit ?? 10,
      });
      return NextResponse.json({
        matches: result.output.matches,
        confidence: result.confidence,
        agentName: result.agentName,
        version: result.version,
      });
    }

    const matches = await runCreatorMatch(appUser, brief, body.limit ?? 10);
    return NextResponse.json({ matches });
  } catch (err) {
    return creatorApiError(err);
  }
}
