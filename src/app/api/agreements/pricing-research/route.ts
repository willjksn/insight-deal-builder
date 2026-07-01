import { NextRequest, NextResponse } from "next/server";
import { apiErrorStatus, assertCanCreateQuotes, requireApprovedAuthUser } from "@/lib/api/routeAuth";
import { getAdminDb } from "@/lib/firebase/admin";
import { researchMarketPricing } from "@/lib/agreement/pricingResearch";
import { presetToServicePackage } from "@/lib/agreement/packages";
import { SERVICE_PACKAGE_PRESETS } from "@/lib/constants/presets";
import {
  AgreementType,
  EquipmentCatalogItem,
  LocationCatalogItem,
  ServicePackage,
} from "@/lib/types";
import { tavilyAvailable } from "@/lib/search/tavilyClient";
import { scoutAiUsesMock } from "@/lib/scout/cineScoutAi";

export const runtime = "nodejs";

type PricingResearchBody = {
  jobDescription?: string;
  city?: string;
  zip?: string;
  state?: string;
  agreementType?: AgreementType;
  yourQuotedFee?: number;
};

async function loadServicePackages(): Promise<ServicePackage[]> {
  const db = getAdminDb();
  if (db) {
    const snap = await db.collection("servicePackages").get();
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ServicePackage);
    const active = items.filter((p) => p.active !== false);
    if (active.length) return active;
  }
  return SERVICE_PACKAGE_PRESETS.map((preset, i) => ({
    id: `preset-${i}`,
    ...presetToServicePackage(preset),
    createdAt: null as unknown as ServicePackage["createdAt"],
    updatedAt: null as unknown as ServicePackage["updatedAt"],
  }));
}

async function loadEquipment(): Promise<EquipmentCatalogItem[]> {
  const db = getAdminDb();
  if (!db) return [];
  const snap = await db.collection("equipmentCatalog").limit(40).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as EquipmentCatalogItem);
}

async function loadLocations(): Promise<LocationCatalogItem[]> {
  const db = getAdminDb();
  if (!db) return [];
  const snap = await db.collection("locationCatalog").limit(20).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as LocationCatalogItem);
}

export async function POST(request: NextRequest) {
  try {
    const { appUser } = await requireApprovedAuthUser(request);
    assertCanCreateQuotes(appUser);

    if (!tavilyAvailable() && !scoutAiUsesMock()) {
      return NextResponse.json(
        { error: "TAVILY_API_KEY is not configured on the server" },
        { status: 503 }
      );
    }

    const body = (await request.json()) as PricingResearchBody;
    if (!body.jobDescription?.trim()) {
      return NextResponse.json({ error: "Job description is required" }, { status: 400 });
    }
    if (!body.city?.trim() && !body.zip?.trim()) {
      return NextResponse.json(
        { error: "Enter a city or ZIP code for the shoot market." },
        { status: 400 }
      );
    }

    const [packages, equipment, locations] = await Promise.all([
      loadServicePackages(),
      loadEquipment(),
      loadLocations(),
    ]);

    const research = await researchMarketPricing({
      jobDescription: body.jobDescription,
      city: body.city,
      zip: body.zip,
      state: body.state,
      agreementType: body.agreementType,
      yourQuotedFee: body.yourQuotedFee,
      packages,
      equipment,
      locations,
    });

    return NextResponse.json({ ok: true, research });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Pricing research failed";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}
