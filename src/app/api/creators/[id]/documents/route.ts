import { NextRequest, NextResponse } from "next/server";
import { addCreatorDocument } from "@/lib/creators/server";
import { creatorApiError, requireCreatorManager } from "@/lib/creators/routeHelpers";
import { CreatorError } from "@/lib/creators/errors";
import { DOCUMENT_KINDS } from "@/lib/creators/validate";
import type { CreatorDocumentKind } from "@/lib/creators/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { appUser } = await requireCreatorManager(request);
    const { id } = await ctx.params;
    const body = (await request.json()) as Record<string, unknown>;
    const kind = body.kind as CreatorDocumentKind;
    if (!DOCUMENT_KINDS.includes(kind)) {
      throw new CreatorError("VALIDATION_FAILED", "Invalid document kind");
    }
    const creator = await addCreatorDocument(appUser, id, {
      kind,
      label: typeof body.label === "string" ? body.label : undefined,
      url: typeof body.url === "string" ? body.url : undefined,
      fileDataUrl: typeof body.fileDataUrl === "string" ? body.fileDataUrl : undefined,
      fileName: typeof body.fileName === "string" ? body.fileName : undefined,
    });
    return NextResponse.json({ creator });
  } catch (err) {
    return creatorApiError(err);
  }
}
