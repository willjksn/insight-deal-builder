"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";

const TOC = [
  { id: "overview", label: "What this is for" },
  { id: "before-you-start", label: "Before you start" },
  { id: "step-1", label: "1. Create a campaign" },
  { id: "step-2", label: "2. Run research" },
  { id: "step-3", label: "3. Review & approve" },
  { id: "step-4", label: "4. Outreach" },
  { id: "step-5", label: "5. Inbox & replies" },
  { id: "step-6", label: "6. Pipeline" },
  { id: "step-7", label: "7. Discovery calls" },
  { id: "step-8", label: "8. Proposals & convert" },
  { id: "step-9", label: "9. Automations" },
  { id: "step-10", label: "10. Analytics" },
  { id: "screens", label: "Screen map" },
  { id: "daily", label: "Suggested daily rhythm" },
] as const;

function Step({
  id,
  number,
  title,
  children,
}: {
  id: string;
  number: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <Card>
        <CardHeader>
          <p className="text-xs font-semibold tracking-wide text-sky-700 uppercase">Step {number}</p>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        </CardHeader>
        <CardBody className="space-y-3 text-sm leading-relaxed text-slate-700">{children}</CardBody>
      </Card>
    </section>
  );
}

function Tip({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 px-3 py-2 text-sm text-amber-950">
      {children}
    </div>
  );
}

export default function RevenueHowToGuidePage() {
  return (
    <>
      <PageHeader
        title="How to use Revenue & opportunities"
        subtitle="End-to-end playbook: find prospects, approve them, outreach, discovery, propose, and convert to a project."
      />

      <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <nav
            aria-label="Guide sections"
            className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
          >
            <p className="mb-2 px-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
              On this page
            </p>
            <ul className="space-y-0.5">
              {TOC.map((item) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    className="block rounded-lg px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <div className="space-y-6">
          <section id="overview" className="scroll-mt-24">
            <Card>
              <CardBody className="space-y-3 text-sm leading-relaxed text-slate-700">
                <h2 className="text-lg font-semibold text-slate-900">What this is for</h2>
                <p>
                  Revenue & opportunities is Insight Media Group’s prospecting and sales workspace. It helps you
                  find businesses (IMG client campaigns) or brands (Stormi campaigns), score and review them, send
                  human-approved outreach, run discovery, draft proposals, and convert wins into ShootSpine
                  projects / agreements.
                </p>
                <p>
                  AI assists with research, quality checks, drafts, and call prep — but approvals and sending stay
                  under your control. Nothing emails a prospect until you approve a draft and create / send it from
                  Gmail.
                </p>
              </CardBody>
            </Card>
          </section>

          <section id="before-you-start" className="scroll-mt-24">
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-slate-900">Before you start</h2>
              </CardHeader>
              <CardBody className="space-y-3 text-sm leading-relaxed text-slate-700">
                <ol className="list-decimal space-y-2 pl-5">
                  <li>
                    Confirm you have <strong>view</strong> and (for managers){" "}
                    <strong>manage Revenue & opportunities</strong> permissions under Admin.
                  </li>
                  <li>
                    Open{" "}
                    <Link href="/revenue/settings" className="font-medium text-sky-700 hover:underline">
                      Settings
                    </Link>{" "}
                    and connect Gmail if you want live inbox sync and draft creation. Mode should show{" "}
                    <strong>live</strong> when OAuth is configured and connected.
                  </li>
                  <li>
                    Check that n8n shows <strong>live</strong> if you use scheduled follow-up / inbox sync / daily
                    brief workflows. You can still work the pipeline manually without n8n.
                  </li>
                  <li>
                    Skim{" "}
                    <Link href="/revenue/automations" className="font-medium text-sky-700 hover:underline">
                      Automations
                    </Link>{" "}
                    so you know which AI agents are live vs stub (quality review, revision, outreach, etc.).
                  </li>
                </ol>
                <Tip>
                  Start from the{" "}
                  <Link href="/revenue" className="font-medium text-sky-800 hover:underline">
                    Command Center
                  </Link>{" "}
                  each day — it shows awaiting review, outreach-ready count, and recent activity. Use{" "}
                  <Link href="/revenue/analytics" className="font-medium text-sky-800 hover:underline">
                    Analytics
                  </Link>{" "}
                  when you want rates and pipeline value.
                </Tip>
              </CardBody>
            </Card>
          </section>

          <Step id="step-1" number={1} title="Create a campaign">
            <p>
              Campaigns define <em>who</em> you’re hunting and the scoring bar for new opportunities.
            </p>
            <ol className="list-decimal space-y-2 pl-5">
              <li>
                Go to{" "}
                <Link href="/revenue/campaigns" className="font-medium text-sky-700 hover:underline">
                  Campaigns
                </Link>{" "}
                → <strong>New campaign</strong> (or Command Center → New campaign).
              </li>
              <li>
                Choose type:
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  <li>
                    <strong>IMG client prospecting</strong> — hotels, med spas, restaurants, local businesses that
                    need production / brand content.
                  </li>
                  <li>
                    <strong>Stormi brand prospecting</strong> — brands / categories for Stormi partnerships.
                  </li>
                </ul>
              </li>
              <li>
                Fill name, objective, and targeting (industry / category, city, state, radius, service to promote,
                minimum project value, etc.).
              </li>
              <li>
                Set <strong>min opportunity score</strong> and <strong>min confidence</strong> so weak leads don’t
                clutter review. Keep daily / weekly research limits sensible — the app enforces them.
              </li>
              <li>
                Set status to <strong>Active</strong> and save. Research only runs on active campaigns.
              </li>
            </ol>
            <Tip>
              You can also add a single opportunity manually from Opportunities → Add opportunity if you already
              know the prospect. Deleting a campaign removes its opportunities and related revenue records.
            </Tip>
          </Step>

          <Step id="step-2" number={2} title="Run research">
            <ol className="list-decimal space-y-2 pl-5">
              <li>
                Open the campaign detail page from{" "}
                <Link href="/revenue/campaigns" className="font-medium text-sky-700 hover:underline">
                  Campaigns
                </Link>
                .
              </li>
              <li>
                Click <strong>Run research</strong>. The system searches the web and scores prospects, then creates
                opportunity records under that campaign.
              </li>
              <li>
                Research may also fill <strong>website</strong>, <strong>social links</strong>, and{" "}
                <strong>contact</strong> fields when those appear in sources — always verify before outreach.
              </li>
              <li>
                When it finishes, new leads land in the review queue. Open{" "}
                <Link href="/revenue/opportunities" className="font-medium text-sky-700 hover:underline">
                  Opportunities
                </Link>{" "}
                (filter by approval, campaign, or search) or use the Command Center review queue.
              </li>
            </ol>
            <Tip>
              Research respects your campaign daily / weekly limits. If you get zero results, loosen industry / geo /
              min score, or widen the objective — then run again.
            </Tip>
          </Step>

          <Step id="step-3" number={3} title="Review, quality-check, and approve">
            <ol className="list-decimal space-y-2 pl-5">
              <li>
                Open an opportunity. Read scores, research notes, and fit rationale on the left.
              </li>
              <li>
                On the right action column, confirm or fix:
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  <li>
                    <strong>Website & social</strong> — correct links before you pitch.
                  </li>
                  <li>
                    <strong>Contact person</strong> — decision-maker name, title, email, phone, plus public company
                    email/phone. Accurate emails also help Inbox auto-link replies later.
                  </li>
                  <li>
                    <strong>Pipeline stage</strong> — set manually anytime if the stage is wrong.
                  </li>
                </ul>
                Scroll to the <strong>Workflow</strong> section below for outreach, discovery, proposals, and convert.
              </li>
              <li>
                Under <strong>AI agents</strong>:
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  <li>
                    <strong>Run quality review</strong> — checks completeness, verification risks, and readiness.
                    Prefer a passing review before you approve.
                  </li>
                  <li>
                    <strong>Get revision suggestions</strong> — suggested copy / field improvements (suggestions
                    only; nothing auto-applies).
                  </li>
                  <li>
                    <strong>Generate campaign concept</strong> — creative angle you can reuse in outreach or
                    discovery.
                  </li>
                </ul>
              </li>
              <li>
                In <strong>Approval workspace</strong>:
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  <li>
                    <strong>Approve for outreach</strong> when it’s a real fit — stage moves toward ready for
                    outreach.
                  </li>
                  <li>
                    Or reject with a reason (poor fit, too small, wrong industry, etc.). Use “revisit later” if you
                    want it parked instead of lost.
                  </li>
                </ul>
              </li>
            </ol>
            <Tip>
              Treat pending review as a human gate. Don’t approve leads you wouldn’t personally email — quality of
              the queue beats volume.
            </Tip>
          </Step>

          <Step id="step-4" number={4} title="Prepare and send outreach">
            <ol className="list-decimal space-y-2 pl-5">
              <li>
                On an approved opportunity, open the outreach panel and generate an outreach draft (email / DM
                variants as available). Prefer the contact email you verified in step 3.
              </li>
              <li>
                Edit the draft in{" "}
                <Link href="/revenue/outreach" className="font-medium text-sky-700 hover:underline">
                  Outreach
                </Link>{" "}
                or on the opportunity page until the tone matches IMG / Stormi.
              </li>
              <li>
                <strong>Approve</strong> the draft when it’s ready. Reject and regenerate if it’s off-brand.
              </li>
              <li>
                Use <strong>Create Gmail draft</strong> (requires connected Gmail). Review the draft in Gmail, then
                send from Gmail yourself. Creating a Gmail draft also links that thread to the opportunity.
              </li>
              <li>
                After contact, the opportunity should move toward contacted / follow-up stages in the pipeline.
              </li>
            </ol>
            <Tip>
              The app does not auto-send email. Approving a draft ≠ sending. Always do a final read in Gmail.
            </Tip>
          </Step>

          <Step id="step-5" number={5} title="Monitor inbox and replies">
            <ol className="list-decimal space-y-2 pl-5">
              <li>
                Open{" "}
                <Link href="/revenue/inbox" className="font-medium text-sky-700 hover:underline">
                  Inbox
                </Link>
                . For managers it <strong>auto-syncs Gmail on open</strong>; use <strong>Sync inbox</strong> anytime
                to refresh.
              </li>
              <li>
                Select a thread. Check the <strong>Opportunity</strong> column — linked threads show the prospect
                name.
              </li>
              <li>
                If a reply isn’t linked, use <strong>Link to opportunity</strong> in the detail panel and save.
                Sync also tries to match participant emails to opportunity contact / public email. Unlink if the
                match is wrong.
              </li>
              <li>
                Run <strong>AI receptionist</strong> to classify the reply. When the thread is linked, classification
                can advance the pipeline (e.g. interested → replied, scheduling → discovery call, not interested →
                lost).
              </li>
              <li>
                Override anytime with the opportunity’s <strong>Pipeline stage</strong> control if the auto move is
                wrong.
              </li>
            </ol>
            <Tip>
              Stage auto-updates only work when the thread is linked to an opportunity. Link first, then classify.
            </Tip>
          </Step>

          <Step id="step-6" number={6} title="Work the pipeline">
            <p>
              <Link href="/revenue/pipeline" className="font-medium text-sky-700 hover:underline">
                Pipeline
              </Link>{" "}
              is a kanban board by stage. Drag cards between columns to update stage, or set stage on the opportunity
              detail page.
            </p>
            <ol className="list-decimal space-y-2 pl-5">
              <li>Scan columns for follow-up due, discovery, and proposal work.</li>
              <li>Drag a card to the right stage, or open it for the next concrete action.</li>
              <li>
                Prefer one clear next step per opportunity: send follow-up, book call, send proposal, or close out.
              </li>
            </ol>
          </Step>

          <Step id="step-7" number={7} title="Run discovery calls">
            <ol className="list-decimal space-y-2 pl-5">
              <li>
                When a prospect is interested, open the opportunity and generate{" "}
                <strong>discovery prep</strong> (agenda, questions, talking points).
              </li>
              <li>
                During / after the call, capture answers in the discovery session notes (linked from{" "}
                <Link href="/revenue/discovery" className="font-medium text-sky-700 hover:underline">
                  Discovery
                </Link>
                ).
              </li>
              <li>
                Run <strong>discovery debrief</strong> so the system summarizes needs, budget signals, and
                recommended package — that feeds the proposal step.
              </li>
            </ol>
            <Tip>
              Good call notes beat clever AI. Fill real answers before debrief so the proposal isn’t generic.
            </Tip>
          </Step>

          <Step id="step-8" number={8} title="Draft proposal and convert to a project">
            <ol className="list-decimal space-y-2 pl-5">
              <li>
                From the opportunity, generate a <strong>proposal draft</strong>. Review it under{" "}
                <Link href="/revenue/proposals" className="font-medium text-sky-700 hover:underline">
                  Proposals
                </Link>{" "}
                or on the opportunity page.
              </li>
              <li>
                Use <strong>Edit proposal</strong> to adjust title, scope, deliverables, timeline, and investment.
                If you’ve generated more than one draft, pick the version from the dropdown.
              </li>
              <li>
                Set proposal <strong>Status</strong> as you progress (draft → in review → approved → sent).
              </li>
              <li>
                Check the <strong>Agreement prefill checklist</strong>. When it’s green, open{" "}
                <strong>Open in agreement wizard</strong> to carry scope and fee into Agreements.
              </li>
              <li>
                When you win, use <strong>Convert to project</strong> on the opportunity (requires manage-projects
                permission). That creates a ShootSpine project you can take into the agreement wizard.
              </li>
              <li>
                Continue in Projects / Agreements for signatures, PDF, and payment terms — Revenue hands off once
                converted.
              </li>
            </ol>
          </Step>

          <Step id="step-9" number={9} title="Use automations (optional but powerful)">
            <ol className="list-decimal space-y-2 pl-5">
              <li>
                Open{" "}
                <Link href="/revenue/automations" className="font-medium text-sky-700 hover:underline">
                  Automations
                </Link>
                .
              </li>
              <li>
                <strong>Agents</strong> — see which AI agents are live (research helpers, quality, revision,
                outreach, discovery, proposal). Run them from the opportunity page; this screen is the registry +
                history.
              </li>
              <li>
                <strong>Workflow runs</strong> — n8n jobs for follow-up scan, inbox sync, and daily brief. Trigger
                manually when needed; watch status and retry failures. Delete old runs with the trash / multi-select
                controls.
              </li>
              <li>
                Filter workflow history by month if the list gets long.
              </li>
            </ol>
            <Tip>
              If a workflow stays “running,” confirm the n8n workflow is posting back to{" "}
              <code className="text-xs">/api/revenue/webhooks/n8n</code> with the shared secret.
            </Tip>
          </Step>

          <Step id="step-10" number={10} title="Check analytics">
            <ol className="list-decimal space-y-2 pl-5">
              <li>
                Open{" "}
                <Link href="/revenue/analytics" className="font-medium text-sky-700 hover:underline">
                  Analytics
                </Link>{" "}
                for approval rate, reply rate, estimated pipeline value, revenue won, and estimated AI spend.
              </li>
              <li>
                Use the pipeline snapshot cards to jump into stages that need attention (review, outreach,
                discovery, proposals, won).
              </li>
              <li>
                Reply rate compares classified reply signals to Gmail drafts created — it improves as you link inbox
                threads and run the AI receptionist.
              </li>
            </ol>
            <Tip>
              Analytics is a live read of your opportunity, outreach, inbox, and agent-run data — not a separate
              reporting warehouse.
            </Tip>
          </Step>

          <section id="screens" className="scroll-mt-24">
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-slate-900">Screen map</h2>
              </CardHeader>
              <CardBody>
                <dl className="space-y-3 text-sm">
                  {[
                    ["Command Center", "Daily snapshot: review queue, pipeline counts, estimated value, activity."],
                    ["Campaigns", "Targeting rules + Run research + delete (cascades related records)."],
                    [
                      "Opportunities",
                      "All researched leads; search + campaign/approval filters; open one to approve and advance.",
                    ],
                    ["Outreach", "Draft queue — edit, approve, push Gmail drafts."],
                    [
                      "Inbox",
                      "Auto-sync on open; link threads to opportunities; classify replies (stage writeback when linked).",
                    ],
                    ["Pipeline", "Kanban board — drag cards between stages."],
                    ["Discovery", "Call prep, notes, and debriefs."],
                    [
                      "Proposals",
                      "Drafts with status, version switch, edit, and agreement prefill checklist.",
                    ],
                    ["Automations", "Agent registry, n8n runs, retries, cleanup."],
                    [
                      "Analytics",
                      "Approval rate, reply rate, pipeline value, wins, and estimated AI spend.",
                    ],
                    ["Settings", "Gmail connect/disconnect and n8n mode (live / mock)."],
                    ["How to use", "This guide."],
                  ].map(([name, desc]) => (
                    <div
                      key={name}
                      className="grid gap-1 border-b border-slate-100 pb-3 last:border-0 sm:grid-cols-[140px_1fr]"
                    >
                      <dt className="font-medium text-slate-900">{name}</dt>
                      <dd className="text-slate-600">{desc}</dd>
                    </div>
                  ))}
                </dl>
              </CardBody>
            </Card>
          </section>

          <section id="daily" className="scroll-mt-24">
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-slate-900">Suggested daily rhythm</h2>
              </CardHeader>
              <CardBody className="space-y-3 text-sm leading-relaxed text-slate-700">
                <ol className="list-decimal space-y-2 pl-5">
                  <li>
                    <strong>Morning — Command Center:</strong> clear awaiting review, note outreach-ready and
                    proposals in progress. Glance at{" "}
                    <Link href="/revenue/analytics" className="font-medium text-sky-700 hover:underline">
                      Analytics
                    </Link>{" "}
                    weekly for rates.
                  </li>
                  <li>
                    <strong>Research block:</strong> run research on 1–2 active campaigns if the queue is thin.
                  </li>
                  <li>
                    <strong>Approval block:</strong> fix website/contact → quality-review → approve or reject every
                    pending opportunity.
                  </li>
                  <li>
                    <strong>Outreach block:</strong> approve drafts, create Gmail drafts, send personally.
                  </li>
                  <li>
                    <strong>Inbox + pipeline:</strong> open Inbox (auto-sync), link any unlinked replies, classify,
                    then drag pipeline stages as needed.
                  </li>
                  <li>
                    <strong>Close the loop:</strong> edit proposals, set status, open agreement wizard when the
                    checklist is ready; convert wins to projects; mark lost / revisit honestly.
                  </li>
                </ol>
                <p className="text-slate-600">
                  Questions about a specific screen? Open that tab from the sub-nav above, or jump back to{" "}
                  <Link href="/revenue" className="font-medium text-sky-700 hover:underline">
                    Command Center
                  </Link>
                  .
                </p>
              </CardBody>
            </Card>
          </section>
        </div>
      </div>
    </>
  );
}
