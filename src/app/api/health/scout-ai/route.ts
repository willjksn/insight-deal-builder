import { NextRequest } from "next/server";
import {
  scoutDiagramOnly,
  scoutImageMaxWidth,
  scoutImageProvider,
  scoutMaxCinematicPrevis,
  scoutScenePrevisForAllShots,
  scoutUseOpenAiForImages,
} from "@/lib/scout/imageConfig";
import { probeGeminiConnection, scoutGeminiImageGenEnabled } from "@/lib/scout/geminiClient";
import { scoutAiUsesMock } from "@/lib/scout/cineScoutAi";
import {
  scoutGeminiUseVertexMode,
  vertexEnableUrl,
  vertexGeminiAvailable,
  vertexServiceAccountEmail,
} from "@/lib/scout/geminiVertex";
import { apiErrorStatus, requireAuthUser } from "@/lib/api/routeAuth";
import { hasPermission } from "@/lib/utils/permissions";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { appUser } = await requireAuthUser(request);
    if (!hasPermission(appUser, "manageUsers")) {
      return Response.json({ error: "Not authorized" }, { status: 401 });
    }

    const projectId =
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ??
      process.env.FIREBASE_ADMIN_PROJECT_ID ??
      null;

    const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY?.trim());
    const hasVertex = vertexGeminiAvailable();
    const hasOpenAiKey = Boolean(process.env.OPENAI_API_KEY?.trim());
    const mockAi = scoutAiUsesMock();

    const base = {
      projectId,
      mockAi,
      geminiKeyConfigured: hasGeminiKey,
      vertexAvailable: hasVertex,
      vertexMode: scoutGeminiUseVertexMode(),
      /** Grant "Vertex AI User" to THIS account — not the gcp-sa-aiplatform service agents */
      vertexServiceAccountEmail: vertexServiceAccountEmail(),
      openAiKeyConfigured: hasOpenAiKey,
      openAiImagesEnabled: scoutUseOpenAiForImages(),
      imageProvider: scoutImageProvider(),
      maxCinematicPrevis:
        scoutScenePrevisForAllShots() ? "all" : scoutMaxCinematicPrevis(),
      imageMaxWidth: scoutImageMaxWidth(),
      diagramOnly: scoutDiagramOnly(),
      imageGenEnabled: scoutGeminiImageGenEnabled() || scoutUseOpenAiForImages(),
      enableGenerativeLanguageApiUrl: projectId
        ? `https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com?project=${projectId}`
        : "https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com",
      enableVertexApiUrl: vertexEnableUrl(),
    };

    if (!hasGeminiKey && !hasVertex) {
      return Response.json({
        ok: false,
        ...base,
        gemini: "missing_credentials",
        hint: "Set GEMINI_API_KEY or FIREBASE_SERVICE_ACCOUNT_JSON (Vertex AI fallback) and SCOUT_USE_MOCK_AI=false",
      });
    }

    if (mockAi) {
      return Response.json({
        ok: false,
        ...base,
        gemini: "mock_mode",
        hint: "Set SCOUT_USE_MOCK_AI=false in production",
      });
    }

    try {
      const probe = await probeGeminiConnection();
      return Response.json({
        ok: true,
        ...base,
        gemini: "connected",
        provider: probe.provider,
        model: process.env.VERTEX_GEMINI_MODEL ?? process.env.GEMINI_SCOUT_MODEL ?? "gemini-2.5-flash",
        probeReply: probe.reply.trim().slice(0, 20),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gemini probe failed";
      return Response.json(
        {
          ok: false,
          ...base,
          gemini: "blocked_or_error",
          error: message,
        },
        { status: 503 }
      );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Health check failed";
    return Response.json({ error: message }, { status: apiErrorStatus(message) });
  }
}
