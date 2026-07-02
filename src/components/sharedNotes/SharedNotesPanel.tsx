"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, MessageSquare, Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { useAuth } from "@/contexts/AuthContext";
import { fetchSharedNotes, postSharedNote } from "@/lib/sharedNotes/apiClient";
import { SHARED_NOTE_MAX_LENGTH } from "@/lib/sharedNotes/initials";
import { SharedNotesMeta, SharedResourceNote, SharedResourceType } from "@/lib/sharedNotes/types";
import { formatDateTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

interface SharedNotesPanelProps {
  resourceType: SharedResourceType;
  resourceId: string;
  adminOpen?: boolean;
  className?: string;
}

export function SharedNotesPanel({
  resourceType,
  resourceId,
  adminOpen = false,
  className,
}: SharedNotesPanelProps) {
  const { user } = useAuth();
  const [notes, setNotes] = useState<SharedResourceNote[]>([]);
  const [meta, setMeta] = useState<SharedNotesMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const listEndRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchSharedNotes(() => user.getIdToken(), resourceType, resourceId, {
        adminOpen,
      });
      setNotes(result.notes);
      setMeta(result.meta);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load notes");
      setNotes([]);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }, [user, resourceType, resourceId, adminOpen]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (notes.length) listEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [notes.length]);

  const submit = async () => {
    if (!user || !draft.trim() || posting || !meta?.canPost) return;
    setPosting(true);
    setError(null);
    try {
      const result = await postSharedNote(
        () => user.getIdToken(),
        resourceType,
        resourceId,
        draft.trim(),
        { adminOpen }
      );
      setNotes(result.notes);
      setMeta(result.meta);
      setDraft("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to post note");
    } finally {
      setPosting(false);
    }
  };

  if (loading) {
    return (
      <div className={cn("rounded-xl border border-slate-200 bg-white p-4", className)}>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading notes…
        </div>
      </div>
    );
  }

  if (!meta) return null;

  const isOwner = user?.uid === meta.ownerUserId;
  const visible = meta.isShared || notes.length > 0;
  if (!visible) return null;

  const resourceLabel = resourceType === "script" ? "script" : "scout session";

  return (
    <section
      className={cn("rounded-xl border border-slate-200 bg-white shadow-sm", className)}
      aria-label="Shared notes"
    >
      <div className="border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-sky-600" />
          <h2 className="text-sm font-semibold text-slate-900">Notes for the author</h2>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          {isOwner
            ? `Collaborators can leave feedback on this ${resourceLabel}. You can reply here too.`
            : `Your notes are visible to the ${resourceLabel} owner.`}
        </p>
      </div>

      <div className="max-h-64 space-y-3 overflow-y-auto px-4 py-3">
        {notes.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-500">
            No notes yet. {meta.canPost ? "Be the first to leave feedback." : ""}
          </p>
        ) : (
          notes.map((note) => (
            <article key={note.id} className="flex gap-3">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-800"
                title={note.authorDisplayName ?? note.authorInitials}
                aria-hidden
              >
                {note.authorInitials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  {note.authorDisplayName ? (
                    <span className="text-xs font-medium text-slate-800">{note.authorDisplayName}</span>
                  ) : null}
                  <time className="text-[10px] text-slate-400" dateTime={note.createdAt}>
                    {formatDateTime(note.createdAt)}
                  </time>
                </div>
                <p className="mt-0.5 whitespace-pre-wrap text-sm text-slate-700">{note.body}</p>
              </div>
            </article>
          ))
        )}
        <div ref={listEndRef} />
      </div>

      {error ? (
        <p className="border-t border-red-100 bg-red-50 px-4 py-2 text-xs text-red-700">{error}</p>
      ) : null}

      {meta.canPost ? (
        <div className="space-y-2 border-t border-slate-100 p-4">
          <Textarea
            label="Add a note"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            maxLength={SHARED_NOTE_MAX_LENGTH}
            placeholder={
              isOwner
                ? "Reply to your collaborators…"
                : "Share feedback for the owner without editing their work…"
            }
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] text-slate-400">
              {draft.length}/{SHARED_NOTE_MAX_LENGTH}
            </span>
            <Button
              type="button"
              size="sm"
              disabled={posting || !draft.trim()}
              onClick={() => void submit()}
            >
              {posting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Post note
            </Button>
          </div>
        </div>
      ) : (
        <p className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
          Admin read-only — you can view notes but not post.
        </p>
      )}
    </section>
  );
}
