import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { apiErrorStatus } from "@/lib/api/routeAuth";
import { getAdminDb } from "@/lib/firebase/admin";
import { stripUndefined } from "@/lib/firebase/firestore";
import { lookupScoutTechniques } from "@/lib/scout/techniqueLookup";
import { requireScoutProjectAccess } from "@/lib/scout/scoutRouteAuth";
import { tavilyAvailable } from "@/lib/search/tavilyClient";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await requireScoutProjectAccess(request, id);

    if (!tavilyAvailable()) {
      return NextResponse.json(
        { error: "TAVILY_API_KEY is not configured on the server" },
        { status: 503 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as { query?: string };
    const userQuery = typeof body.query === "string" ? body.query.trim() : undefined;

    const db = getAdminDb();
    if (!db) throw new Error("Firebase Admin is not configured");

    const ref = db.collection("shotScoutProjects").doc(id);
    const snap = await ref.get();
    const project = { id: snap.id, ...snap.data() } as import("@/lib/scout/types").ScoutProject;
    if (!project.latestDpPlan) {
      return NextResponse.json({ error: "Generate a DP plan first" }, { status: 400 });
    }

    const lookup = await lookupScoutTechniques(project, userQuery);

    await ref.update(
      stripUndefined({
        latestTechniqueLookup: lookup,
        updatedAt: FieldValue.serverTimestamp(),
      })
    );

    const updated = await ref.get();
    return NextResponse.json({
      lookup,
      project: { id: updated.id, ...updated.data() },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Technique lookup failed";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}
