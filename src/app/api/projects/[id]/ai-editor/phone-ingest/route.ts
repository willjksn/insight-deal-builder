import { NextRequest, NextResponse } from "next/server";
import {
  aiEditorErrorResponse,
  requireAiEditorAccess,
} from "@/lib/aiEditor/routeAccess";
import { extensionOf, inferMediaType } from "@/lib/aiEditor/mediaEngine";
import { newMediaAssetId, upsertMediaAssets } from "@/lib/aiEditor/server";
import type { MediaAsset } from "@/lib/aiEditor/types";

export const runtime = "nodejs";

type PhoneFile = {
  filename: string;
  sizeBytes?: number;
  cloudStoragePath: string;
  cloudStorageUrl: string;
  extension?: string;
};

type Body = {
  files: PhoneFile[];
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
    if (!Array.isArray(body.files) || body.files.length === 0) {
      return NextResponse.json({ error: "files are required" }, { status: 400 });
    }
    if (body.files.length > 40) {
      return NextResponse.json({ error: "Max 40 phone clips per request" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const media: MediaAsset[] = body.files.map((f) => {
      const filename = String(f.filename || "phone-clip.mp4").trim() || "phone-clip.mp4";
      const cloudStoragePath = String(f.cloudStoragePath || "").trim();
      const cloudStorageUrl = String(f.cloudStorageUrl || "").trim();
      if (!cloudStoragePath || !cloudStorageUrl) {
        throw new Error("cloudStoragePath and cloudStorageUrl are required");
      }
      if (!cloudStoragePath.startsWith(`ai-editor/${access.uid}/${projectId}/phone/`)) {
        throw new Error("Invalid storage path for this project");
      }
      const mediaType = inferMediaType(filename);
      return {
        id: newMediaAssetId(),
        projectId,
        userId: access.uid,
        filename,
        originalFilename: filename,
        extension: f.extension || extensionOf(filename),
        mediaType: mediaType === "audio" ? "audio" : "video",
        sizeBytes: typeof f.sizeBytes === "number" ? f.sizeBytes : undefined,
        relativeProjectPath: `01_ORIGINAL_MEDIA/PHONE/${filename}`,
        cloudStoragePath,
        cloudStorageUrl,
        cameraAssignment: "PHONE",
        onlineStatus: "offline",
        ingestStatus: "phone_upload",
        analysisStatus: "none",
        createdAt: now,
        updatedAt: now,
      };
    });

    await upsertMediaAssets(media);
    return NextResponse.json({ media });
  } catch (err) {
    return aiEditorErrorResponse(err);
  }
}
