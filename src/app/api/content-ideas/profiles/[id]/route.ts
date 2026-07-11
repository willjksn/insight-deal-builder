import { NextRequest, NextResponse } from "next/server";
import { FieldValue, Firestore } from "firebase-admin/firestore";
import {
  apiErrorStatus,
  assertCanUseProductionTools,
  requireApprovedAuthUser,
} from "@/lib/api/routeAuth";
import { getAdminDb } from "@/lib/firebase/admin";
import { stripUndefined } from "@/lib/firebase/firestore";
import { BRAND_PROFILES_COLLECTION } from "@/lib/contentIdeas/collections";
import { BrandProfile } from "@/lib/contentIdeas/types";

export const runtime = "nodejs";

async function loadOwnedProfile(db: Firestore, id: string, uid: string) {
  const snap = await db.collection(BRAND_PROFILES_COLLECTION).doc(id).get();
  if (!snap.exists) return null;
  const data = snap.data() as BrandProfile;
  if (data.userId !== uid) return null;
  return { ...data, id: snap.id };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { uid, appUser } = await requireApprovedAuthUser(request);
    assertCanUseProductionTools(appUser);
    const { id } = await params;
    const db = getAdminDb();
    if (!db) throw new Error("Firebase Admin is not configured");

    const profile = await loadOwnedProfile(db, id, uid);
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    return NextResponse.json({ profile });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load profile";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { uid, appUser } = await requireApprovedAuthUser(request);
    assertCanUseProductionTools(appUser);
    const { id } = await params;
    const body = (await request.json()) as Partial<BrandProfile>;

    const db = getAdminDb();
    if (!db) throw new Error("Firebase Admin is not configured");

    const existing = await loadOwnedProfile(db, id, uid);
    if (!existing) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    await db.collection(BRAND_PROFILES_COLLECTION).doc(id).update(
      stripUndefined({
        type: body.type ?? existing.type,
        basic: body.basic ? { ...existing.basic, ...body.basic } : existing.basic,
        brandIdentity: body.brandIdentity
          ? { ...existing.brandIdentity, ...body.brandIdentity }
          : existing.brandIdentity,
        creatorIdentity: body.creatorIdentity
          ? { ...existing.creatorIdentity, ...body.creatorIdentity }
          : existing.creatorIdentity,
        audience: body.audience ? { ...existing.audience, ...body.audience } : existing.audience,
        business: body.business ? { ...existing.business, ...body.business } : existing.business,
        productionPreferences: body.productionPreferences
          ? { ...existing.productionPreferences, ...body.productionPreferences }
          : existing.productionPreferences,
        safety: body.safety ? { ...existing.safety, ...body.safety } : existing.safety,
        linkedClientId: body.linkedClientId ?? existing.linkedClientId,
        updatedAt: FieldValue.serverTimestamp(),
      })
    );

    const snap = await db.collection(BRAND_PROFILES_COLLECTION).doc(id).get();
    return NextResponse.json({ profile: { id: snap.id, ...snap.data() } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update profile";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { uid, appUser } = await requireApprovedAuthUser(request);
    assertCanUseProductionTools(appUser);
    const { id } = await params;
    const db = getAdminDb();
    if (!db) throw new Error("Firebase Admin is not configured");

    const existing = await loadOwnedProfile(db, id, uid);
    if (!existing) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    await db.collection(BRAND_PROFILES_COLLECTION).doc(id).delete();
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete profile";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}
