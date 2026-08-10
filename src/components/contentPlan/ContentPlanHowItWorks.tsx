"use client";

import { useEffect, useId, useState } from "react";
import { BookOpen, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";

function ContentPlanHowItWorksGuideContent() {
  return (
    <div className="space-y-6 text-sm leading-relaxed text-slate-700">
      <section className="space-y-2">
        <h3 className="font-semibold text-slate-900">What Content Plans are</h3>
        <p>
          A Content Plan turns a short idea (or a package pitch) into a saved production blueprint:
          creative brief, story, script, shot list with how-to-shoot notes, shoot order, and
          checklist. Plans live on your account and can create a full ShootSpine project + board for
          set and AI Editor.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="font-semibold text-slate-900">Start from Pitch or a new plan</h3>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <span className="font-medium">Pitch ideas for a package</span> — generate one-liners from
            a service package and client context, then Develop an idea into a Content Plan.
          </li>
          <li>
            <span className="font-medium">New plan</span> — pick content style → describe the idea →
            set parameters → generate the blueprint.
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="font-semibold text-slate-900">Build the blueprint (Director)</h3>
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            <span className="font-medium">Phase 1</span> — Brief, Story, Script, and Shots.
          </li>
          <li>
            <span className="font-medium">Phase 2</span> — Edit Map, Sound, Music, Look, and Lighting.
          </li>
          <li>
            <span className="font-medium">Phase 3</span> — Coverage, Shoot Order, and Checklist.
          </li>
        </ol>
        <p>
          Regenerate or refine sections as needed. Optional{" "}
          <span className="font-medium">Teach me</span> expands on-set guidance. Shots may include
          optional <span className="font-medium">set design</span> ideas and dressing bullets when
          the physical set matters.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="font-semibold text-slate-900">Create project + board</h3>
        <p>
          When shots exist, <span className="font-medium">Create project + board</span> spins up a
          production project, script session, and Prep / Coverage board from the plan. After you
          regenerate sections, use <span className="font-medium">Update board + script</span> so board
          shots and AI Editor stay aligned (shot IDs kept when numbers match).
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="font-semibold text-slate-900">Shoot Mode on set</h3>
        <p>
          Open <span className="font-medium">Shoot Mode</span> to work the list in shoot order: mark
          done, log takes, and notes. Linked plans pull from the board when you open Shoot Mode and
          can auto-sync progress both ways. You can also Sync to board / Pull from board manually,
          then mark the plan wrapped when the shoot is done.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="font-semibold text-slate-900">Hand off to AI Editor</h3>
        <p>
          From a linked plan, open the project’s <span className="font-medium">AI Editor</span>. Match
          and first cut use the planned shots; Shoot Mode progress stays aligned with the board so
          preferred takes and notes carry into the cut. Then Play the first cut and finish in Resolve.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="font-semibold text-slate-900">Library &amp; stages</h3>
        <p>
          This page lists saved plans with production stage (Planning → Ready to shoot → Shooting →
          Wrapped), shot completion, and linked-board status. Filter, search, duplicate, or delete a
          plan — linked projects are not deleted.
        </p>
      </section>

      <section className="rounded-xl border border-sky-100 bg-sky-50/60 px-3 py-3 text-xs text-slate-600">
        Tip: Pitch or New plan → generate shots → Create project + board before the shoot → Shoot
        Mode on set → AI Editor after wrap for Match and first cut.
      </section>
    </div>
  );
}

export function ContentPlanHowItWorks() {
  const [open, setOpen] = useState(false);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <>
      <Card>
        <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 font-semibold text-slate-900">
              <BookOpen className="h-4 w-4 text-sky-700" />
              How it works
            </div>
            <p className="mt-1 text-sm text-slate-600">
              Full guide: pitch, blueprint, board handoff, Shoot Mode sync, and AI Editor.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="shrink-0"
            onClick={() => setOpen(true)}
          >
            Open guide
          </Button>
        </CardBody>
      </Card>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/45 backdrop-blur-[1px]"
            onClick={() => setOpen(false)}
            aria-label="Close how it works"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative flex max-h-[min(88vh,720px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div>
                <h2 id={titleId} className="text-lg font-semibold text-slate-900">
                  How Content Plans work
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Pitch · blueprint · Shoot Mode · AI Editor handoff
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto px-5 py-4">
              <ContentPlanHowItWorksGuideContent />
            </div>
            <div className="border-t border-slate-100 px-5 py-3">
              <Button type="button" className="w-full sm:w-auto" onClick={() => setOpen(false)}>
                Got it
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
