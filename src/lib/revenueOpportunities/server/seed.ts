import { createCampaign } from "@/lib/revenueOpportunities/server/campaigns";
import { createOpportunity } from "@/lib/revenueOpportunities/server/opportunities";
import { buildSeedOpportunities, SEED_IMG_CAMPAIGN } from "@/lib/revenueOpportunities/seedData";
import { AppUser } from "@/lib/types";

export async function seedRevenueDemoData(appUser: AppUser): Promise<{
  campaignId: string;
  opportunityIds: string[];
}> {
  const campaign = await createCampaign(appUser, SEED_IMG_CAMPAIGN);
  const inputs = buildSeedOpportunities(campaign.id, campaign.name);
  const opportunityIds: string[] = [];
  for (const input of inputs) {
    const opp = await createOpportunity(appUser, input);
    opportunityIds.push(opp.id);
  }
  return { campaignId: campaign.id, opportunityIds };
}
