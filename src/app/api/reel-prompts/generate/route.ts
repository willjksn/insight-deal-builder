import { NextRequest, NextResponse } from "next/server";
import {
  apiErrorStatus,
  assertCanUseProductionTools,
  requireApprovedAuthUser,
} from "@/lib/api/routeAuth";
import { generateReelPromptPack } from "@/lib/reelPrompt";
import type {
  ReelPromptGenerateInput,
  ReelPromptPlatform,
  ReelPromptStyle,
} from "@/lib/reelPrompt";

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

/** Freeform or script-payload reel prompt pack (no session required). */
export async function POST(request: NextRequest) {
  try {
    const { appUser } = await requireApprovedAuthUser(request);
    assertCanUseProductionTools(appUser);

    const body = (await request.json()) as Partial<ReelPromptGenerateInput> & {
      idea?: string;
    };
    const idea = String(body.idea || "").trim();
    const hasScenes = Array.isArray(body.scenes) && body.scenes.length > 0;
    if (!idea && !hasScenes) {
      return NextResponse.json(
        { error: "Provide an idea or script scenes" },
        { status: 400 }
      );
    }

    const input: ReelPromptGenerateInput = {
      style: asStyle(body.style),
      toolTarget: "generic",
      platform: asPlatform(body.platform),
      idea: idea || undefined,
      targetLength: body.targetLength?.toString().trim() || undefined,
      talentKitId: body.talentKitId ?? null,
      talentNotes: body.talentNotes?.toString().trim() || undefined,
      scriptTitle: body.scriptTitle?.toString().trim() || undefined,
      scenes: hasScenes ? body.scenes : undefined,
      characters: Array.isArray(body.characters) ? body.characters : undefined,
      productionTone: body.productionTone?.toString().trim() || undefined,
    };

    const pack = await generateReelPromptPack(input);
    return NextResponse.json({ pack });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Reel prompt generation failed";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}
