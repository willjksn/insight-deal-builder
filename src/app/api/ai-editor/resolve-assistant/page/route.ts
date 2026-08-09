import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import {
  apiErrorStatus,
  assertCanUseProductionTools,
  requireApprovedAuthUser,
} from "@/lib/api/routeAuth";
import { isAiEditorEnabled } from "@/lib/aiEditor/featureFlag";
import { getResolveManualManifest } from "@/lib/aiEditor/resolveManual";
import { renderResolveManualPage } from "@/lib/aiEditor/resolveManual/renderPage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Render a cited manual PDF page (figures included) as PNG. */
export async function GET(request: NextRequest) {
  try {
    if (!isAiEditorEnabled()) {
      return NextResponse.json({ error: "AI Editor is disabled" }, { status: 404 });
    }
    const { appUser } = await requireApprovedAuthUser(request);
    assertCanUseProductionTools(appUser);

    if (!getResolveManualManifest()) {
      return NextResponse.json({ error: "Manual index missing" }, { status: 404 });
    }

    const page = Number(request.nextUrl.searchParams.get("page") || "");
    if (!Number.isFinite(page) || page < 1) {
      return NextResponse.json({ error: "page is required" }, { status: 400 });
    }

    const filePath = await renderResolveManualPage(page);
    if (!filePath) {
      return NextResponse.json({ error: "Could not render manual page" }, { status: 500 });
    }

    const buf = await fs.readFile(filePath);
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to render page";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}
