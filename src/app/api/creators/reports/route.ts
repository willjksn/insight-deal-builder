import { NextRequest, NextResponse } from "next/server";
import { getCreatorNetworkSummary, listCreatorCampaigns, listShortlists } from "@/lib/creators/opsServer";
import { creatorApiError, requireCreatorManager } from "@/lib/creators/routeHelpers";

export const runtime = "nodejs";

/** Aggregated creator reports for the Business reports hub. */
export async function GET(request: NextRequest) {
  try {
    const { appUser } = await requireCreatorManager(request);
    const [summary, campaigns, shortlists] = await Promise.all([
      getCreatorNetworkSummary(appUser),
      listCreatorCampaigns(appUser),
      listShortlists(appUser),
    ]);

    const economics = campaigns.reduce(
      (acc, c) => {
        acc.revenue += c.economics?.clientRevenue ?? 0;
        acc.compensation += c.economics?.creatorCompensationTotal ?? 0;
        acc.costs += c.economics?.directCosts ?? 0;
        return acc;
      },
      { revenue: 0, compensation: 0, costs: 0 }
    );

    return NextResponse.json({
      report: {
        network: summary,
        campaignsByStatus: campaigns.reduce<Record<string, number>>((acc, c) => {
          acc[c.status] = (acc[c.status] ?? 0) + 1;
          return acc;
        }, {}),
        campaignCount: campaigns.length,
        shortlistCount: shortlists.length,
        economics: {
          ...economics,
          estimatedMargin: economics.revenue - economics.compensation - economics.costs,
        },
        campaigns: campaigns.map((c) => ({
          id: c.id,
          name: c.name,
          brandName: c.brandName,
          status: c.status,
          creatorCount: c.assignments?.length ?? 0,
          deliverableCount: c.deliverables?.length ?? 0,
          estimatedMargin: c.economics?.estimatedMargin,
        })),
      },
    });
  } catch (err) {
    return creatorApiError(err);
  }
}
