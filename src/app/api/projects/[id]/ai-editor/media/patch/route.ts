import { NextRequest, NextResponse } from "next/server";
import {
  aiEditorErrorResponse,
  requireAiEditorAccess,
} from "@/lib/aiEditor/routeAccess";
import { patchMediaAssets } from "@/lib/aiEditor/server";
import type { MediaAsset } from "@/lib/aiEditor/types";

export const runtime = "nodejs";

type Body = {
  patches: Array<{ id: string } & Partial<MediaAsset>>;
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const access = await requireAiEditorAccess(request, projectId);
    if (access.error) return access.error;

    const body = (await request.json()) as Body;
    if (!Array.isArray(body.patches) || !body.patches.length) {
      return NextResponse.json({ error: "patches are required" }, { status: 400 });
    }
    if (body.patches.length > 200) {
      return NextResponse.json({ error: "Max 200 patches" }, { status: 400 });
    }

    const count = await patchMediaAssets(projectId, body.patches);
    return NextResponse.json({ ok: true, count });
  } catch (err) {
    return aiEditorErrorResponse(err);
  }
}
