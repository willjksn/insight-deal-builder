import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import {
  apiErrorStatus,
  assertCanUseProductionTools,
  requireApprovedAuthUser,
} from "@/lib/api/routeAuth";
import { getAdminDb } from "@/lib/firebase/admin";
import { stripUndefined } from "@/lib/firebase/firestore";
import { BRAND_PROFILES_COLLECTION } from "@/lib/contentIdeas/collections";
import { emptyBrandProfile } from "@/lib/contentIdeas/defaults";
import { BrandProfile, BrandProfileType } from "@/lib/contentIdeas/types";

export const runtime = "nodejs";

function serializeProfile(id: string, data: FirebaseFirestore.DocumentData) {
  return { id, ...data };
}

export async function GET(request: NextRequest) {
  try {
    const { uid, appUser } = await requireApprovedAuthUser(request);
    assertCanUseProductionTools(appUser);
    const db = getAdminDb();
    if (!db) throw new Error("Firebase Admin is not configured");

    const snap = await db
      .collection(BRAND_PROFILES_COLLECTION)
      .where("userId", "==", uid)
      .orderBy("updatedAt", "desc")
      .get();

    const profiles = snap.docs.map((d) => serializeProfile(d.id, d.data()));
    return NextResponse.json({ profiles });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list profiles";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { uid, appUser } = await requireApprovedAuthUser(request);
    assertCanUseProductionTools(appUser);
    const body = (await request.json()) as {
      type?: BrandProfileType;
      basic?: BrandProfile["basic"];
      brandIdentity?: BrandProfile["brandIdentity"];
      creatorIdentity?: BrandProfile["creatorIdentity"];
      audience?: BrandProfile["audience"];
      business?: BrandProfile["business"];
      productionPreferences?: BrandProfile["productionPreferences"];
      safety?: BrandProfile["safety"];
      linkedClientId?: string;
      isStormiPreset?: boolean;
    };

    const type = body.type ?? "business";
    const base = emptyBrandProfile(type);
    const profileName = body.basic?.profileName?.trim();
    if (!profileName) {
      return NextResponse.json({ error: "Profile name is required" }, { status: 400 });
    }

    const db = getAdminDb();
    if (!db) throw new Error("Firebase Admin is not configured");

    const payload = stripUndefined({
      userId: uid,
      type,
      basic: { ...base.basic, ...body.basic, profileName },
      brandIdentity: { ...base.brandIdentity, ...body.brandIdentity },
      creatorIdentity: { ...base.creatorIdentity, ...body.creatorIdentity },
      audience: { ...base.audience, ...body.audience },
      business: { ...base.business, ...body.business },
      productionPreferences: { ...base.productionPreferences, ...body.productionPreferences },
      safety: { ...base.safety, ...body.safety },
      linkedClientId: body.linkedClientId,
      isStormiPreset: body.isStormiPreset,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    const ref = await db.collection(BRAND_PROFILES_COLLECTION).add(payload);
    const snap = await ref.get();
    return NextResponse.json({ profile: serializeProfile(ref.id, snap.data()!) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create profile";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}
