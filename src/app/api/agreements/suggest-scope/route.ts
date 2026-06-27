import { NextRequest, NextResponse } from "next/server";
import { apiErrorStatus, assertCanCreateQuotes, requireAuthUser } from "@/lib/api/routeAuth";
import { getAdminDb } from "@/lib/firebase/admin";
import { suggestQuoteScope } from "@/lib/agreement/scopeSuggestAi";
import { presetToServicePackage } from "@/lib/agreement/packages";
import { SERVICE_PACKAGE_PRESETS } from "@/lib/constants/presets";
import { AgreementType, ServicePackage } from "@/lib/types";
import { isPartnerOrgUser } from "@/lib/utils/permissions";

export const runtime = "nodejs";

type SuggestScopeBody = {
  jobDescription: string;
  agreementType?: AgreementType;
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

export async function POST(request: NextRequest) {
  try {
    const { appUser } = await requireAuthUser(request);
    assertCanCreateQuotes(appUser);

    const body = (await request.json()) as SuggestScopeBody;
    if (!body.jobDescription?.trim()) {
      return NextResponse.json({ error: "Job description is required" }, { status: 400 });
    }

    const packages = await loadServicePackages();
    const suggestion = await suggestQuoteScope(body.jobDescription, packages, {
      preferredAgreementType: body.agreementType,
      partnerOnly: isPartnerOrgUser(appUser),
    });

    return NextResponse.json({ ok: true, suggestion });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Scope suggestion failed";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}
