# Revenue & Opportunities — Implementation Plan

This plan adapts the product specification to the **existing ShootSpine repository** (`insight-deal-builder`). Do not create a new Firebase project, Vercel project, or Next.js app.

## Repository inspection summary (Phase 0)

### Stack

- **Next.js 16** App Router, React 19, TypeScript, Tailwind v4
- **Firebase** Auth + Firestore + Storage; Admin SDK in API routes
- **AI:** Gemini (`src/lib/ai/geminiClient.ts`), optional Vertex, mock via `SCOUT_USE_MOCK_AI`
- **Search:** Tavily (`src/lib/search/tavilyClient.ts`), weekly `trendSnapshots` cron
- **Email:** Resend (not Gmail) — Gmail is **new work** in Phase 6
- **Automation:** Vercel cron for trends only — **n8n is new** in Phase 9
- **Tests:** Vitest (`src/**/*.test.ts`)

### Reuse map

| Spec need | ShootSpine asset |
|-----------|------------------|
| Authentication | `AuthContext`, `requireApprovedAuthUser` |
| Organization | `users.company`, IMG vs partner via `INSIGHT_MEDIA_GROUP_LLC` |
| Clients | `clients` collection + `Client` type (no separate Contact model) |
| Proposals | Agreements + Quick quote (`/agreements`, `/quick-quote`) |
| Project creation | `POST /api/projects`, `createProjectFromIdea.ts` |
| AI structured output | `callGeminiJsonText`, manual validation (no Zod in repo today) |
| Usage/cost tracking | `aiUsageMonthly`, `usageLog.ts` |
| Pipeline revenue metrics | `adminMetrics.ts` (agreement-based, not opportunity-based) |
| Nav shell | `Sidebar.tsx`, `MobileNav.tsx`, `PageHeader` |

### Gaps / conflicts

| Spec | Current state | Resolution |
|------|---------------|------------|
| Zod validation | Not used project-wide | Add Zod for new R&O schemas only, or manual validation matching `parseIdeas.ts` |
| `organizationId` on records | Tenant = `company` string on user | Use `organizationCompany` field on R&O docs (= `users.company`) until multi-org refactor |
| Gmail integration | None | Phase 6; mock provider in earlier phases |
| n8n | None | Phase 9; `WorkflowProvider` interface in Phase 1 |
| Separate Contact model | Single contact on `Client` | Extend opportunity with embedded contact; link `clientId` when known |
| Duplicate CRM | None exists | New `revenue*` collections, not duplicate clients/projects |

### New Firestore collections (planned)

Server-only via Admin SDK (mirror `ideaSessions` / `scriptWriterSessions`):

- `revenueCampaigns`
- `revenueCampaignRuns`
- `revenueOpportunities`
- `revenueOutreachActivities`
- `revenueEmailThreads`
- `revenueFollowUpTasks`
- `revenueDiscoverySessions`
- `revenueOpportunityProposals`
- `revenueAgentRuns`
- `revenueWorkflowRuns`
- `revenueFeedbackEvents`
- `revenueSuppressionList`
- `revenueDailyBriefs`
- `revenueWeeklyBriefs`

Rules stubbed in Phase 1 (`allow read, write: if false`).

### Navigation (Phase 1)

New top-level group **Revenue & opportunities** under Business:

- Command Center → `/revenue`
- Campaigns → `/revenue/campaigns`
- Opportunities → `/revenue/opportunities`
- Outreach → `/revenue/outreach`
- Inbox → `/revenue/inbox`
- Pipeline → `/revenue/pipeline`
- Discovery → `/revenue/discovery`
- Proposals → `/revenue/proposals`
- Automations → `/revenue/automations`
- Analytics → `/revenue/analytics`
- Settings → `/revenue/settings`

### Permissions (Phase 1)

New keys on `UserPermissions`:

- `viewRevenueOpportunities` — read pipeline and command center
- `manageRevenueOpportunities` — create campaigns, approve, outreach, convert

IMG-only (`insightOnly: true`). Granted to Full admin and Producer presets.

### Environment variables (future phases)

Documented in `.env.local.example` as commented placeholders. Not required at startup.

---

## Phase 1 — Foundation (current)

**Goal:** Feature shell, types, interfaces, docs, permissions, nav — app remains fully functional.

Deliverables:

- [x] Branch `feature/revenue-opportunities`
- [x] `docs/revenue-opportunities-overview.md`
- [x] This implementation plan
- [x] `src/lib/revenueOpportunities/` — types, errors, collections, feature flag, agent instruction types, provider interfaces, repository interfaces
- [x] `src/app/(app)/revenue/` — layout + placeholder pages
- [x] Sidebar + MobileNav entries
- [x] Permissions + `routeAuth` assertions
- [x] `GET /api/revenue/status` health/feature endpoint
- [x] Firestore rules stubs for new collections
- [x] README link to overview

**Not in Phase 1:** Campaign forms, opportunity CRUD, agents, Gmail, n8n, tests for business logic.

---

## Phase 2 — Core manual workflow

- Campaign + opportunity Zod/manual schemas
- CRUD API routes
- Opportunity table + detail + approval UI
- Pipeline stages (table view)
- Command center with seeded mock data
- Link to existing `clients`, `servicePackages`

## Phase 3 — Agent framework

- Agent registry, instruction format, run logging to `revenueAgentRuns`
- Quality review + revision agents (stubs)

## Phase 4 — Research & qualification

- IMG + Stormi research agents, scoring, campaign concept agent
- Tavily + Gemini integration, cost tracking

## Phase 5 — Outreach

- Email/DM/LinkedIn draft generation, approval workspace

## Phase 6 — Gmail & email receptionist

- OAuth, inbox sync, classification, draft-only autopilot rules

## Phase 7 — Discovery & proposals

- Call prep, post-call notes, extend agreements for proposal drafts

## Phase 8 — Opportunity → project conversion

- Reuse `POST /api/projects` + agreement wizard; bidirectional links

## Phase 9 — n8n automation

- Webhook auth, scheduled workflows, failure handler UI

## Phase 10 — Hardening

- Security rules audit, rate limits, budget caps, full test suite, a11y

---

## File index (Phase 1)

```
src/lib/revenueOpportunities/
  collections.ts
  errors.ts
  featureFlag.ts
  nav.ts
  types/index.ts
  agents/instruction.ts
  providers/index.ts
  repositories/index.ts

src/app/(app)/revenue/
  layout.tsx
  page.tsx                    # Command center placeholder
  campaigns/page.tsx
  ... (sub-routes)

src/app/api/revenue/status/route.ts

src/components/revenue/
  RevenueSubNav.tsx
  RevenueFeatureGate.tsx
```

Do **not** begin Phase 2 until explicitly instructed.
