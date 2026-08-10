import { NextRequest, NextResponse } from "next/server";
import {
  apiErrorStatus,
  assertCanUseProductionTools,
  requireApprovedAuthUser,
} from "@/lib/api/routeAuth";
import { isAiEditorEnabled } from "@/lib/aiEditor/featureFlag";
import {
  answerResolveManualChat,
  ensureResolveManualManifest,
} from "@/lib/aiEditor/resolveManual";
import type { ResolveManualChatMessage } from "@/lib/aiEditor/resolveManual";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Manual index status for the Resolve Assistant page. */
export async function GET(request: NextRequest) {
  try {
    if (!isAiEditorEnabled()) {
      return NextResponse.json({ error: "AI Editor is disabled" }, { status: 404 });
    }
    const { appUser } = await requireApprovedAuthUser(request);
    assertCanUseProductionTools(appUser);

    const manifest = await ensureResolveManualManifest();
    // Index is gitignored locally; production loads from private Firebase Storage
    // (build download and/or runtime fallback).
    const isDeployedHost =
      process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
    return NextResponse.json({
      ready: Boolean(manifest),
      manifest: manifest
        ? {
            sourceName: manifest.sourceName,
            pageCount: manifest.pageCount,
            chunkCount: manifest.chunkCount,
            manualLabel: manifest.manualLabel,
          }
        : null,
      /** When true, UI may show the local indexing command as a code hint. */
      showLocalIndexCommand: !isDeployedHost,
      indexHint: isDeployedHost
        ? "The Reference Manual index isn’t provisioned yet. An admin should run npm run upload-resolve-manual-index (after indexing locally), then redeploy."
        : 'py -3 scripts/index-resolve-manual.py "C:\\path\\to\\DaVinci Resolve.pdf"',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to read manual index";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}

/** Chat with the Resolve Reference Manual (retrieval + optional grounded Gemini). */
export async function POST(request: NextRequest) {
  try {
    if (!isAiEditorEnabled()) {
      return NextResponse.json({ error: "AI Editor is disabled" }, { status: 404 });
    }
    const { appUser } = await requireApprovedAuthUser(request);
    assertCanUseProductionTools(appUser);

    const body = (await request.json()) as {
      message?: string;
      history?: ResolveManualChatMessage[];
      /** Skip Gemini — excerpts + local steps only */
      localOnly?: boolean;
    };
    const message = String(body.message || "").trim();
    if (!message) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    const result = await answerResolveManualChat({
      message,
      history: Array.isArray(body.history) ? body.history.slice(-8) : [],
      preferLocal: Boolean(body.localOnly),
    });

    return NextResponse.json({ result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Resolve assistant failed";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}
