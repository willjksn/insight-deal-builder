# ShootSpine v2 Upgrade — Agent Kickoff Brief

> Paste this brief into the new agent chat first, then paste the full master spec
> ("Upgrade ShootSpine Business, Revenue, Meetings, and Production Workspaces") right after it.

**Repo:** ShootSpine (Insight Deal Builder), Next.js + Firebase.
**Work on branch `feature/v2-features`** (already created off `main`). Do not touch `main`
directly. Commit per phase; open a PR when a phase is stable.

**What this is:** Upgrade the existing internal app into one connected OS with two workspaces —
**Business** and **Production** — following the full master spec. It is a spec, not a green-field
build.

## Hard rules (from the spec)

- Do NOT create a new app or a public SaaS. Do NOT remove/rebuild working features. Preserve all
  existing data.
- Do NOT duplicate systems that already exist (proposals, agreements, clients, contacts, projects,
  opportunities, scripts, crew, gear, locations, deliverables). Extend them.
- Every AI output is **review-before-write**: never silently update opportunity/proposal/project
  records.
- Never invent prices, dates, deliverables, usage rights, or legal terms.

## Current state — REUSE these (already built, don't recreate)

- **Revenue & Opportunities** module under `src/app/(app)/revenue/*` and
  `src/lib/revenueOpportunities/*`: campaigns (missions), opportunities, pipeline, discovery,
  outreach, **Gmail inbox**, proposals, analytics, automations, settings, guide. Agents registered
  in `agents/index.ts` (img_research, stormi_research, quality_review, revision, outreach_draft,
  email_receptionist, discovery_prep, discovery_debrief, proposal_draft, campaign_concept).
  **Research was just rebuilt live-only** (multi-query Tavily → Gemini discover → per-prospect
  qualify; no dummy data) — build on `research/*`, don't revert it.
- **Agreements**: `src/app/(app)/agreements/*` (wizard, detail, sign, PDF). **Projects +
  Production**: `projects/[id]` with spine Script → Prep → Coverage → Day shots → Call sheet →
  Agreement; production board, coverage desk, call sheets, day shots. **Script writer**, **stage**,
  **calendar**. Catalogs: companies, clients, crew, equipment, locations, packages, templates.
  Content: brand profiles + idea engine (flagged off by default).
- **Infra to reuse:** Firebase Auth + Firestore + Storage, permissions (`canUseProductionTools`,
  project access = scripts/production/shots, revenue view/manage), AI stack (Gemini/Vertex +
  Tavily), AI usage/cost logging, n8n plumbing + `/api/cron/*`, feature flags
  (`REVENUE_OPPORTUNITIES_ENABLED` default on).

## Net-new (does NOT exist yet — build these)

- **Workspace switcher** (Business/Production) in the app shell — no workspace concept exists today;
  sidebar is in `src/components/layout/Sidebar.tsx` + `MobileNav.tsx`. This is the biggest
  architectural piece; it drives sidebar, dashboard, quick-create, AI context, search, default
  landing, and must persist last-used.
- **Meetings module + Universal Meeting Recorder + Transcription + AI meeting analysis** — none of
  this exists. Device-mic recording (in-person + speakerphone/online audio), resilient chunked
  upload to Storage, async transcription, transcript-linked evidence (timestamps),
  review-before-write extraction. **Raise the transcription-provider decision before building**
  (Gemini audio vs Whisper/AssemblyAI) — it's a cost + reliability call for the owner.
- **Global search** across records + transcript text — none exists.
- **Contacts** as a first-class module (today contacts live inside opportunities) — consolidate,
  don't fork.
- **Business ↔ Production conversion**: "Won opportunity → production project" with full record
  transfer (scope, deliverables, dates, rights, meetings, proposal, agreement) and **no re-entry**.
  Link, don't copy.
- Case-study / learning loop, agent-activity transparency, cost-controls dashboard.

## Execution order (do NOT one-shot all of it)

1. **Start with the audit** (spec Part 1): produce current-state summary, gap analysis, migrations,
   and confirm the shared data model + workspace approach. Present it and pause for owner sign-off
   before large changes.
2. Then implement **Phase 2 (Workspace navigation + switcher + two dashboards + workspace-aware AI
   context)**.
3. Stop, commit, PR. Subsequent phases each get their own chat:
   - Phase 3 — Revenue foundation polish (profiles, missions, scoring, evidence, feed, pursuit
     workspace, pipeline)
   - Phase 4 — AI opportunity agents (discovery, signal, formal, brand, verification, contacts,
     pursuit, outreach, follow-up)
   - Phase 5 — Universal meeting recorder + transcription + AI analysis + review workflow
   - Phase 6 — Proposal + agreement integration
   - Phase 7 — Production conversion (won → project/campaign)
   - Phase 8 — Production meeting integration
   - Phase 9 — Reliability (background jobs, cost controls, admin, security, testing, docs)

**Definition of done, testing, seed data, states:** follow spec Parts 48–52.

> After this brief, paste the full master spec. Begin with the audit; do not stop after the audit —
> implement Phase 2 once the owner approves the audit.
