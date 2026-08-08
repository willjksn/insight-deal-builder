import { NextRequest, NextResponse } from "next/server";
import { buildFinishingFeedback } from "@/lib/aiEditor/feedback";
import {
  aiEditorErrorResponse,
  requireAiEditorAccess,
} from "@/lib/aiEditor/routeAccess";
import {
  createJob,
  updateJob,
  upsertAiEditorProjectSettings,
} from "@/lib/aiEditor/server";
import type {
  FinishingFeedbackOutcome,
  FinishingMoodId,
  TransitionStyleId,
} from "@/lib/aiEditor/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  moodId: FinishingMoodId;
  transitionStyle: TransitionStyleId;
  outcome: FinishingFeedbackOutcome;
  note?: string;
};

/**
 * V3 — save wrap-up feedback so the next Look step can remember what worked.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const access = await requireAiEditorAccess(request, projectId);
    if (access.error) return access.error;

    const body = (await request.json()) as Body;
    if (!body.moodId || !body.transitionStyle || !body.outcome) {
      return NextResponse.json(
        { error: "Tell us how finishing went and which look to remember" },
        { status: 400 }
      );
    }

    const feedback = buildFinishingFeedback({
      moodId: body.moodId,
      transitionStyle: body.transitionStyle,
      outcome: body.outcome,
      note: body.note,
    });

    const created = await createJob(access.appUser, projectId, "feedback", {
      outcome: feedback.outcome,
      moodId: feedback.moodId,
    });

    const settings = await upsertAiEditorProjectSettings(projectId, {
      lastFinishingFeedback: feedback,
    });

    const job = await updateJob(created.id, {
      status: "completed",
      progress: 100,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      message: `${feedback.outcome} · ${feedback.moodLabel} · ${feedback.transitionLabel}`,
    });

    return NextResponse.json({ ok: true, feedback, settings, job });
  } catch (err) {
    return aiEditorErrorResponse(err);
  }
}
