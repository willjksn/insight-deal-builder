import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import {
  apiErrorStatus,
  assertCanUseProductionTools,
  requireApprovedAuthUser,
} from "@/lib/api/routeAuth";
import { getAdminDb } from "@/lib/firebase/admin";
import { stripUndefined } from "@/lib/firebase/firestore";
import { CONTENT_PLAN_PITCH_SESSIONS_COLLECTION } from "@/lib/contentPlan/collections";
import { generatePitchIdeaBatch } from "@/lib/contentPlan/generatePitchIdeas";
import {
  capPitchTargets,
  remainingPitchTargets,
} from "@/lib/contentPlan/pitchTargets";
import type { PackageDeliverable } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeDeliverables(raw: unknown): PackageDeliverable[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((d) => {
      const o = d && typeof d === "object" ? (d as Record<string, unknown>) : {};
      return {
        name: String(o.name || "").trim() || "Content",
        quantity: Math.max(0, Math.floor(Number(o.quantity) || 0)),
      };
    })
    .filter((d) => d.quantity > 0);
}

export async function GET(request: NextRequest) {
  try {
    const { uid, appUser } = await requireApprovedAuthUser(request);
    assertCanUseProductionTools(appUser);
    const db = getAdminDb();
    if (!db) throw new Error("Firebase Admin is not configured");

    const snap = await db
      .collection(CONTENT_PLAN_PITCH_SESSIONS_COLLECTION)
      .where("userId", "==", uid)
      .limit(40)
      .get();

    const sessions = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => {
        const am =
          a && typeof a === "object" && "updatedAt" in a
            ? Number((a as { updatedAt?: { toMillis?: () => number } }).updatedAt?.toMillis?.() || 0)
            : 0;
        const bm =
          b && typeof b === "object" && "updatedAt" in b
            ? Number((b as { updatedAt?: { toMillis?: () => number } }).updatedAt?.toMillis?.() || 0)
            : 0;
        return bm - am;
      });

    return NextResponse.json({ sessions });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list pitch sessions";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { uid, appUser } = await requireApprovedAuthUser(request);
    assertCanUseProductionTools(appUser);
    const body = (await request.json()) as {
      packageId?: string | null;
      packageName?: string;
      deliverables?: PackageDeliverable[];
      clientName?: string;
      businessContext?: string;
      brand?: string;
      product?: string;
      agreementId?: string | null;
      opportunityId?: string | null;
      proposalId?: string | null;
      clientId?: string | null;
    };

    const packageName = String(body.packageName || "").trim();
    const clientName = String(body.clientName || "").trim();
    const businessContext = String(body.businessContext || "").trim();
    const deliverables = normalizeDeliverables(body.deliverables);

    if (!packageName) {
      return NextResponse.json({ error: "Package name is required" }, { status: 400 });
    }
    if (!businessContext) {
      return NextResponse.json(
        { error: "Describe the client’s business so we can pitch ideas." },
        { status: 400 }
      );
    }
    if (!deliverables.length) {
      return NextResponse.json(
        { error: "Package needs at least one deliverable with quantity." },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    if (!db) throw new Error("Firebase Admin is not configured");

    const targets = capPitchTargets(remainingPitchTargets(deliverables, []));
    const ideas = await generatePitchIdeaBatch({
      clientName,
      businessContext,
      brand: body.brand?.trim() || undefined,
      product: body.product?.trim() || undefined,
      packageName,
      targets,
    });

    const ref = await db.collection(CONTENT_PLAN_PITCH_SESSIONS_COLLECTION).add(
      stripUndefined({
        userId: uid,
        packageId: body.packageId?.trim() || null,
        packageName,
        deliverables,
        clientName: clientName || "Client",
        businessContext,
        brand: body.brand?.trim() || null,
        product: body.product?.trim() || null,
        agreementId: body.agreementId?.trim() || null,
        opportunityId: body.opportunityId?.trim() || null,
        proposalId: body.proposalId?.trim() || null,
        clientId: body.clientId?.trim() || null,
        ideas,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })
    );

    const snap = await ref.get();
    return NextResponse.json({ session: { id: ref.id, ...snap.data() } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create pitch session";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}
