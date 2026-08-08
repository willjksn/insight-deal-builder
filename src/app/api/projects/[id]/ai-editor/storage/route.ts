import { NextRequest, NextResponse } from "next/server";
import {
  aiEditorErrorResponse,
  requireAiEditorAccess,
} from "@/lib/aiEditor/routeAccess";
import { joinProjectRelative } from "@/lib/aiEditor/mediaPathResolver";
import {
  createStorageLocation,
  upsertAiEditorProjectSettings,
} from "@/lib/aiEditor/server";
import type { StoragePurpose, StorageType } from "@/lib/aiEditor/types";

function sanitizeRootName(name: string): string {
  return name.replace(/[^\w\-.\s]+/g, "_").trim().replace(/\s+/g, "_") || "Project";
}

export const runtime = "nodejs";

type Body = {
  name: string;
  path: string;
  purpose: StoragePurpose;
  type?: StorageType;
  setAsActive?: boolean;
  projectRootName?: string;
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
    if (!body.path?.trim() || !body.purpose) {
      return NextResponse.json({ error: "path and purpose are required" }, { status: 400 });
    }

    const storage = await createStorageLocation(access.appUser, {
      name: body.name || "Active storage",
      path: body.path.trim(),
      purpose: body.purpose,
      type: body.type,
    });

    let settings = await upsertAiEditorProjectSettings(projectId, {
      ...(body.setAsActive !== false && body.purpose === "active"
        ? { activeStorageLocationId: storage.id }
        : {}),
    });

    if (body.setAsActive !== false && body.purpose === "active") {
      const baseName = storage.path.replace(/[\\\/]+$/, "").split(/[\\\/]/).pop() || projectId;
      const rootName = sanitizeRootName(body.projectRootName?.trim() || baseName);
      // Active path is the project root when user points at the project folder;
      // optional nested name is joined when provided explicitly as projectRootName.
      const projectRootPath = body.projectRootName?.trim()
        ? joinProjectRelative(storage.path, rootName)
        : storage.path.replace(/[\\\/]+$/, "");
      settings = await upsertAiEditorProjectSettings(projectId, {
        activeStorageLocationId: storage.id,
        projectRootPath,
        projectRootRelativeName: rootName,
        ingestMode: "managed",
      });
    }

    if (body.purpose === "archive") {
      settings = await upsertAiEditorProjectSettings(projectId, {
        archiveRootPath: storage.path.replace(/[\\\/]+$/, ""),
      });
    }

    return NextResponse.json({ storage, settings });
  } catch (err) {
    return aiEditorErrorResponse(err);
  }
}
