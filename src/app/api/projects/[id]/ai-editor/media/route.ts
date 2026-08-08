import { NextRequest, NextResponse } from "next/server";
import {
  aiEditorErrorResponse,
  requireAiEditorAccess,
} from "@/lib/aiEditor/routeAccess";
import { classifyCodec } from "@/lib/aiEditor/codecs";
import { extensionOf, inferMediaType } from "@/lib/aiEditor/mediaEngine";
import {
  createJob,
  newMediaAssetId,
  updateJob,
  upsertMediaAssets,
} from "@/lib/aiEditor/server";
import type { MediaAsset } from "@/lib/aiEditor/types";

export const runtime = "nodejs";

type IndexFile = {
  path: string;
  filename: string;
  sizeBytes?: number;
  relativeProjectPath?: string;
  probe?: Partial<MediaAsset>;
};

type Body = {
  files: IndexFile[];
  ingestMode?: "managed" | "existing_folder" | "in_place";
  storageLocationId?: string;
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
    if (body.files.length > 500) {
      return NextResponse.json({ error: "Max 500 files per index request" }, { status: 400 });
    }

    const job = await createJob(access.appUser, projectId, "index_folder", {
      count: body.files.length,
      ingestMode: body.ingestMode ?? "existing_folder",
    });
    await updateJob(job.id, {
      status: "running",
      progress: 10,
      startedAt: new Date().toISOString(),
      message: `Indexing ${body.files.length} file(s)`,
    });

    const now = new Date().toISOString();
    const ingestStatus =
      body.ingestMode === "in_place"
        ? ("in_place" as const)
        : body.ingestMode === "managed"
          ? ("verified" as const)
          : ("indexed" as const);

    const media: MediaAsset[] = body.files.map((f) => {
      const filename = f.filename || f.path.replace(/\\/g, "/").split("/").pop() || "unknown";
      const probe = f.probe ?? {};
      const mediaType = probe.mediaType || inferMediaType(filename);
      const classified = classifyCodec({
        codec: probe.codec,
        codecLongName: (probe as { codecLongName?: string }).codecLongName,
        codecTag: (probe as { codecTag?: string }).codecTag,
        container: probe.container,
        filename,
        mediaType,
      });
      const verified = Boolean(probe.checksum) && body.ingestMode === "managed";
      return {
        id: newMediaAssetId(),
        projectId,
        userId: access.uid,
        filename,
        originalFilename: probe.originalFilename || filename,
        extension: probe.extension || extensionOf(filename),
        mediaType,
        sizeBytes: f.sizeBytes ?? probe.sizeBytes,
        checksum: probe.checksum,
        checksumAlgorithm: probe.checksumAlgorithm,
        relativeProjectPath: f.relativeProjectPath ?? probe.relativeProjectPath,
        currentPath: f.path,
        proxyPath: probe.proxyPath,
        storageLocationId: body.storageLocationId,
        cameraAssignment: probe.cameraAssignment,
        verifiedCopyCount: verified ? 1 : undefined,
        codec: probe.codec,
        codecFamily: probe.codecFamily || classified.family,
        codecLabel: probe.codecLabel || classified.label,
        needsProxy: probe.needsProxy ?? classified.needsProxy,
        codecNote: probe.codecNote || classified.reason,
        container: probe.container,
        resolution: probe.resolution,
        frameRate: probe.frameRate,
        durationSeconds: probe.durationSeconds,
        durationFrames: probe.durationFrames,
        videoBitrate: probe.videoBitrate,
        audioChannels: probe.audioChannels,
        audioSampleRate: probe.audioSampleRate,
        creationTime: probe.creationTime,
        startTimecode: probe.startTimecode,
        endTimecode: probe.endTimecode,
        reelName: probe.reelName,
        clipName: probe.clipName,
        thumbnailDataUrl: probe.thumbnailDataUrl,
        cameraMake: probe.cameraMake,
        cameraModel: probe.cameraModel,
        onlineStatus: "online",
        ingestStatus: verified ? "verified" : ingestStatus,
        analysisStatus: "none",
        createdAt: now,
        updatedAt: now,
      };
    });

    await upsertMediaAssets(media);
    const completedJob = await updateJob(job.id, {
      status: "completed",
      progress: 100,
      completedAt: new Date().toISOString(),
      message: `Indexed ${media.length} asset(s)`,
    });

    return NextResponse.json({
      media,
      job: completedJob,
    });
  } catch (err) {
    return aiEditorErrorResponse(err);
  }
}
