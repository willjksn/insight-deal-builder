import { NextRequest, NextResponse } from "next/server";
import { analyzeLiveOpportunityText } from "@/lib/liveProduction/analyzeOpportunity";
import {
  getLiveOpportunity,
  updateLiveOpportunity,
} from "@/lib/liveProduction/server/opportunities";
import {
  liveProductionApiError,
  requireLiveManager,
} from "@/lib/liveProduction/server/routeHelpers";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, ctx: Ctx) {
  try {
    const { appUser } = await requireLiveManager(request);
    const { id } = await ctx.params;
    const existing = await getLiveOpportunity(appUser, id);
    if (!existing) {
      return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
    }
    const body = (await request.json().catch(() => ({}))) as { text?: string };
    const text = (body.text || existing.rawText || existing.summary || "").trim();
    if (!text) {
      return NextResponse.json({ error: "No opportunity text to analyze" }, { status: 400 });
    }
    const extract = await analyzeLiveOpportunityText(text, {
      sourceUrl: existing.sourceUrl,
      titleHint: existing.title,
    });
    const opportunity = await updateLiveOpportunity(
      appUser,
      id,
      {
        title: extract.title || existing.title,
        organizationName: extract.organizationName || existing.organizationName,
        opportunityType: extract.opportunityType || existing.opportunityType,
        location: extract.location || existing.location,
        city: extract.city || existing.city,
        state: extract.state || existing.state,
        venue: extract.venue || existing.venue,
        bidDeadline: extract.bidDeadline || existing.bidDeadline,
        questionDeadline: extract.questionDeadline || existing.questionDeadline,
        siteVisitDate: extract.siteVisitDate || existing.siteVisitDate,
        eventDates: extract.eventDates || existing.eventDates,
        setupDate: extract.setupDate || existing.setupDate,
        strikeDate: extract.strikeDate || existing.strikeDate,
        estimatedValueLow: extract.estimatedValueLow ?? existing.estimatedValueLow,
        estimatedValueHigh: extract.estimatedValueHigh ?? existing.estimatedValueHigh,
        solicitationNumber: extract.solicitationNumber || existing.solicitationNumber,
        contactName: extract.contactName || existing.contactName,
        contactEmail: extract.contactEmail || existing.contactEmail,
        contactPhone: extract.contactPhone || existing.contactPhone,
        summary: extract.summary || existing.summary,
        equipmentRequirements:
          extract.equipmentRequirements.length > 0
            ? extract.equipmentRequirements
            : existing.equipmentRequirements,
        crewRequirements:
          extract.crewRequirements.length > 0
            ? extract.crewRequirements
            : existing.crewRequirements,
        adminRequirements:
          extract.adminRequirements.length > 0
            ? extract.adminRequirements
            : existing.adminRequirements,
        status: existing.status === "new" ? "reviewing" : existing.status,
      },
      true
    );
    return NextResponse.json({ opportunity });
  } catch (err) {
    return liveProductionApiError(err);
  }
}
