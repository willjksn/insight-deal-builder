import { NextRequest, NextResponse } from "next/server";
import {
  apiErrorStatus,
  requireApprovedAuthUser,
} from "@/lib/api/routeAuth";
import { getAdminDb } from "@/lib/firebase/admin";
import { assertScriptWriterAppAccess } from "@/lib/projectAccess/server";
import { ScriptWriterBrief } from "@/lib/scriptWriter/brief";
import { resolveSessionBrief } from "@/lib/scriptWriter/scriptWriterAi";
import { generateScriptIdeas } from "@/lib/scriptWriter/ideaSpark";
import { canManageUsers } from "@/lib/utils/permissions";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { uid, appUser } = await requireApprovedAuthUser(request);

    const db = getAdminDb();
    if (!db) throw new Error("Firebase Admin is not configured");

    // Match the script-writer page/list gate: full production-tools OR
    // project-scoped script access. Prevents a 401 for project-shared users.
    await assertScriptWriterAppAccess(db, uid, appUser);

    const body = (await request.json().catch(() => ({}))) as {
      brief?: Partial<ScriptWriterBrief>;
    };

    const brief = resolveSessionBrief(
      body.brief as ScriptWriterBrief | undefined,
      body.brief?.concept?.trim() ?? ""
    );
    // "Spicy" tone is admin-only; never honor it for non-admins.
    if (brief.spicyMode && !canManageUsers(appUser)) {
      brief.spicyMode = false;
    }

    const { ideas, usedTrends } = await generateScriptIdeas(brief, { db });

    return NextResponse.json({ ideas, usedTrends });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Idea generation failed";
    const lower = message.toLowerCase();
    const hint =
      lower.includes("api key") || lower.includes("gemini")
        ? " Check GEMINI_API_KEY or FIREBASE_SERVICE_ACCOUNT_JSON (Vertex) on the server."
        : "";
    return NextResponse.json(
      { error: `${message}${hint}` },
      { status: apiErrorStatus(message) }
    );
  }
}
