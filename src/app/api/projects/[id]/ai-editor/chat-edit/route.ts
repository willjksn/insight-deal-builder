import { NextRequest, NextResponse } from "next/server";
import { callGeminiJsonText } from "@/lib/ai/geminiClient";
import {
  EDIT_BY_CHAT_SYSTEM,
  buildTimelineChatContext,
  describeOps,
  parseEditCommandRules,
  parseGeminiOpsPayload,
  validateTimelineOps,
  type ChatEditProposal,
} from "@/lib/aiEditor/editByChat";
import {
  aiEditorErrorResponse,
  requireAiEditorAccess,
} from "@/lib/aiEditor/routeAccess";
import {
  applyTimelineOps,
  bumpVersion,
  makeTimelineVersion,
} from "@/lib/aiEditor/timeline";
import {
  createJob,
  getTimeline,
  listMediaAssets,
  listTimelineVersions,
  saveTimelineVersion,
  updateJob,
  upsertTimeline,
} from "@/lib/aiEditor/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function proposeFromGemini(
  message: string,
  timeline: NonNullable<Awaited<ReturnType<typeof getTimeline>>>,
  media: Awaited<ReturnType<typeof listMediaAssets>>
): Promise<ChatEditProposal | null> {
  try {
    const ctx = buildTimelineChatContext(timeline, media);
    const userPrompt = `Timeline context (metadata only — no media bytes):\n${JSON.stringify(ctx, null, 2)}\n\nUser request:\n${message}`;
    const raw = await callGeminiJsonText(EDIT_BY_CHAT_SYSTEM, userPrompt);
    return parseGeminiOpsPayload(raw);
  } catch {
    return null;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const access = await requireAiEditorAccess(request, projectId);
    if (access.error) return access.error;

    const body = (await request.json()) as {
      message?: string;
      apply?: boolean;
    };
    const message = (body.message || "").trim();
    if (!message) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    const [timeline, media, versions] = await Promise.all([
      getTimeline(projectId),
      listMediaAssets(projectId),
      listTimelineVersions(projectId),
    ]);

    if (!timeline) {
      return NextResponse.json(
        { error: "Build a rough cut before editing by chat" },
        { status: 400 }
      );
    }

    let proposal =
      parseEditCommandRules(message, timeline, media) ||
      (await proposeFromGemini(message, timeline, media));

    if (!proposal) {
      proposal = {
        summary:
          "I couldn’t map that to an edit. Try: “remove the first clip”, “trim first to 2 seconds”, “reverse the order”, or “undo”.",
        ops: [],
        confidence: 0.2,
        source: "rules",
        warnings: ["unparsed"],
      };
    }

    if (proposal.action === "undo") {
      if (!body.apply) {
        return NextResponse.json({
          ok: true,
          proposal,
          descriptions: ["Restore previous timeline version"],
          validation: { ok: versions.length > 1, errors: versions.length > 1 ? [] : ["No earlier version"], warnings: [] },
        });
      }
      const prior = versions.find((v) => v.version < timeline.version) || versions[1];
      if (!prior) {
        return NextResponse.json({ error: "Nothing to undo" }, { status: 400 });
      }
      const job = await createJob(access.appUser, projectId, "chat_edit", {
        action: "undo",
        fromVersion: timeline.version,
      });
      const restored = {
        ...prior.snapshot,
        projectId,
        id: projectId,
        updatedAt: new Date().toISOString(),
      };
      const { timeline: bumped, versionRecord } = bumpVersion(
        restored,
        `Undo via chat → restored v${prior.version}`
      );
      await upsertTimeline(bumped);
      await saveTimelineVersion(versionRecord);
      const completedJob = await updateJob(job.id, {
        status: "completed",
        progress: 100,
        completedAt: new Date().toISOString(),
        message: `Undid to v${prior.version} (now v${bumped.version})`,
      });
      const nextVersions = await listTimelineVersions(projectId);
      return NextResponse.json({
        ok: true,
        applied: true,
        proposal,
        timeline: bumped,
        versions: nextVersions,
        job: completedJob,
      });
    }

    const validation = validateTimelineOps(timeline, proposal.ops);
    const descriptions = describeOps(proposal.ops, timeline);

    if (!body.apply) {
      return NextResponse.json({
        ok: true,
        proposal,
        descriptions,
        validation,
      });
    }

    if (!validation.ok) {
      return NextResponse.json(
        { error: validation.errors.join("; ") || "Invalid edit", proposal, validation },
        { status: 400 }
      );
    }

    const job = await createJob(access.appUser, projectId, "chat_edit", {
      summary: proposal.summary,
      opCount: proposal.ops.length,
      source: proposal.source,
    });
    await updateJob(job.id, {
      status: "running",
      progress: 30,
      startedAt: new Date().toISOString(),
      message: proposal.summary,
    });

    const applied = applyTimelineOps(timeline, proposal.ops);
    const { timeline: bumped, versionRecord } = bumpVersion(
      applied,
      proposal.summary.slice(0, 160)
    );
    // Ensure we keep a snapshot of the pre-apply state too when missing
    if (!versions.some((v) => v.version === timeline.version)) {
      await saveTimelineVersion(makeTimelineVersion(timeline, `Before: ${proposal.summary}`));
    }
    await upsertTimeline(bumped);
    await saveTimelineVersion(versionRecord);
    const completedJob = await updateJob(job.id, {
      status: "completed",
      progress: 100,
      completedAt: new Date().toISOString(),
      message: `Chat edit → v${bumped.version}`,
    });

    const nextVersions = await listTimelineVersions(projectId);
    return NextResponse.json({
      ok: true,
      applied: true,
      proposal,
      descriptions,
      validation,
      timeline: bumped,
      versions: nextVersions,
      job: completedJob,
    });
  } catch (err) {
    return aiEditorErrorResponse(err);
  }
}
