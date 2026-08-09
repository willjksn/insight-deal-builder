import { NextRequest, NextResponse } from "next/server";
import {
  apiErrorStatus,
  assertCanUseProductionTools,
  requireApprovedAuthUser,
} from "@/lib/api/routeAuth";
import { getScriptSessionForRequest } from "@/lib/projectAccess/requestAccess";
import { generateReelPromptPack } from "@/lib/reelPrompt";
import type { ReelPromptPlatform, ReelPromptStyle } from "@/lib/reelPrompt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

function asStyle(v: unknown): ReelPromptStyle {
  if (v === "ugc_ad" || v === "hybrid" || v === "cinematic_reel") return v;
  return "cinematic_reel";
}
function asPlatform(v: unknown): ReelPromptPlatform {
  if (v === "reels" || v === "tiktok" || v === "shorts" || v === "flexible") return v;
  return "flexible";
}

/** Build a reel prompt pack from an existing Script Writer session. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { uid, appUser } = await requireApprovedAuthUser(request);
    assertCanUseProductionTools(appUser);
    const { id } = await params;

    const body = (await request.json().catch(() => ({}))) as {
      style?: ReelPromptStyle;
      platform?: ReelPromptPlatform;
      targetLength?: string;
      talentKitId?: string | null;
      talentNotes?: string;
      idea?: string;
    };

    const session = await getScriptSessionForRequest(request, id, uid, appUser);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    const script = session.script;
    if (!script?.scenes?.length) {
      return NextResponse.json(
        { error: "Session needs a script with scenes first" },
        { status: 400 }
      );
    }

    const pack = await generateReelPromptPack({
      style: asStyle(body.style),
      toolTarget: "generic",
      platform: asPlatform(body.platform),
      targetLength: body.targetLength?.toString().trim() || undefined,
      talentKitId: body.talentKitId ?? "stormi",
      talentNotes: body.talentNotes?.toString().trim() || undefined,
      idea: body.idea?.toString().trim() || script.productionPack?.premise || undefined,
      scriptTitle: script.title,
      productionTone: script.productionPack?.tone,
      characters: script.characters,
      scenes: script.scenes.map((s) => ({
        sceneNumber: s.sceneNumber,
        heading: s.heading,
        action: s.action,
        dialogue: s.dialogue || [],
      })),
    });
    pack.sourceSessionId = id;

    return NextResponse.json({ pack });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Reel prompt generation failed";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}
