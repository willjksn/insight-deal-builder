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
  formatEditNotesForChat,
  wantsNotesDrivenEdit,
} from "@/lib/aiEditor/editNotes";
import {
  aiEditorErrorResponse,
  requireAiEditorAccess,
} from "@/lib/aiEditor/routeAccess";
import { timelineScopedToReel } from "@/lib/aiEditor/reels";
import {
  applyTimelineOps,
  bumpVersion,
  makeTimelineVersion,
} from "@/lib/aiEditor/timeline";
import {
  createJob,
  getAiEditorProjectSettings,
  getTimeline,
  listMediaAssets,
  listTimelineVersions,
  saveTimelineVersion,
  updateJob,
  upsertTimeline,
} from "@/lib/aiEditor/server";
import type { EditNote } from "@/lib/aiEditor/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function proposeFromGemini(
  message: string,
  timeline: NonNullable<Awaited<ReturnType<typeof getTimeline>>>,
  media: Awaited<ReturnType<typeof listMediaAssets>>,
  editNotes?: EditNote[],
  scope?: { reelName?: string | null; truncated?: boolean; totalInReel?: number }
): Promise<ChatEditProposal | null> {
  try {
    const ctx = buildTimelineChatContext(timeline, media);
    const notesBlock = formatEditNotesForChat(editNotes);
    const scopeLine = scope?.reelName
      ? `\nActive reel/act: ${scope.reelName}` +
        (scope.truncated
          ? ` (showing ${timeline.tracks.find((t) => t.kind === "video")?.clips.length ?? 0} of ${scope.totalInReel} clips — work reel-by-reel for long features)`
          : "")
      : "";
    const userPrompt = [
      "Timeline context (metadata only — no media bytes):",
      JSON.stringify(ctx, null, 2),
      scopeLine,
      notesBlock
        ? `\nEdit notes (creative brief from shoot / client / look):\n${notesBlock}`
        : "",
      `\nUser request:\n${message}`,
    ]
      .filter(Boolean)
      .join("\n");
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
      /** Scope chat to a reel/act (defaults to timeline.activeReelId). */
      reelId?: string | null;
      /** When applying, send the approved proposal so we don’t re-run Gemini/rules. */
      proposal?: ChatEditProposal;
    };
    const storedProposal =
      body.apply && body.proposal && Array.isArray(body.proposal.ops)
        ? body.proposal
        : null;
    const message = (body.message || storedProposal?.summary || "").trim();
    if (!message && !storedProposal) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    const [timeline, media, versions, settings] = await Promise.all([
      getTimeline(projectId),
      listMediaAssets(projectId),
      listTimelineVersions(projectId),
      getAiEditorProjectSettings(projectId),
    ]);

    if (!timeline) {
      return NextResponse.json(
        { error: "Build a first cut before editing by chat" },
        { status: 400 }
      );
    }

    const { scoped, reel, truncated, totalInReel } = timelineScopedToReel(
      timeline,
      body.reelId !== undefined ? body.reelId : timeline.activeReelId
    );
    const chatTimeline = scoped;
    const scopeMeta = {
      reelName: reel?.name || null,
      truncated,
      totalInReel,
    };

    let proposal: ChatEditProposal | null = null;
    if (storedProposal) {
      proposal = {
        summary: storedProposal.summary || "Applied edit",
        ops: storedProposal.ops,
        confidence:
          typeof storedProposal.confidence === "number" ? storedProposal.confidence : 1,
        source: storedProposal.source === "gemini" ? "gemini" : "rules",
        warnings: Array.isArray(storedProposal.warnings) ? storedProposal.warnings : [],
        action: storedProposal.action,
      };
    } else {
      const editNotes = settings?.editNotes || [];
      const notesDriven = wantsNotesDrivenEdit(message) && editNotes.length > 0;

      if (notesDriven) {
        // Prefer Gemini so client/on-set notes shape the cut; skip brittle rule matches.
        proposal = await proposeFromGemini(
          message,
          chatTimeline,
          media,
          editNotes,
          scopeMeta
        );
      } else {
        proposal =
          parseEditCommandRules(message, chatTimeline, media) ||
          (await proposeFromGemini(message, chatTimeline, media, editNotes, scopeMeta));
      }

      if (!proposal) {
        proposal = {
          summary: notesDriven
            ? "I couldn’t turn your edit notes into timeline ops yet. Try a more specific ask (e.g. “tighten the open using my notes”) or add clearer notes."
            : "I couldn’t map that to an edit. Try: “remove the first clip”, “trim first to 2 seconds”, “reverse the order”, “use my notes”, or “undo”.",
          ops: [],
          confidence: 0.2,
          source: "rules",
          warnings: notesDriven ? ["notes_unparsed"] : ["unparsed"],
        };
      }

      if (truncated && !(proposal.warnings || []).includes("reel_truncated")) {
        proposal = {
          ...proposal,
          warnings: [...(proposal.warnings || []), "reel_truncated"],
        };
      }
    }

    if (proposal.action === "undo") {
      if (!body.apply) {
        return NextResponse.json({
          ok: true,
          proposal,
          scope: scopeMeta,
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

    // Validate/apply against the full timeline (ops use real clip ids from the reel scope).
    const validation = validateTimelineOps(timeline, proposal.ops);
    const descriptions = describeOps(proposal.ops, timeline);

    if (!body.apply) {
      return NextResponse.json({
        ok: true,
        proposal,
        descriptions,
        validation,
        scope: scopeMeta,
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
      scope: scopeMeta,
      timeline: bumped,
      versions: nextVersions,
      job: completedJob,
    });
  } catch (err) {
    return aiEditorErrorResponse(err);
  }
}
