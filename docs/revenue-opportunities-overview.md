# Revenue & Opportunities — Overview

Revenue & Opportunities is a major feature area inside **ShootSpine** (not a separate app). It helps Insight Media Group and Stormi find qualified business and brand opportunities, prepare outreach, manage email conversations, draft proposals, and convert won deals into existing ShootSpine projects.

## Product boundary

### Owned by Revenue & Opportunities

- Prospecting campaigns (IMG client + Stormi brand modes)
- Opportunity research, evidence, and scoring
- High-level campaign concepts (not full scripts or shot lists)
- Outreach preparation and approval
- Gmail draft integration (Phase 6+)
- AI email receptionist (Phase 6+)
- Pipeline, discovery prep, proposal drafts
- Revenue tracking and operational briefs
- n8n workflow monitoring (Phase 9+)
- Convert won opportunity → ShootSpine project

### Remains in existing ShootSpine

- Script writer, shot lists, storyboards, production boards
- Agreements, signatures, Stripe payments
- Call sheets, crew packets, stage planner
- Content Idea Engine (creative ideation, not sales prospecting)

## Primary workflows

**IMG client prospecting** — Find businesses that may buy cinematic production, retainers, or creator-led campaigns.

**Stormi brand prospecting** — Find brands that fit Stormi’s niche for creator fees, IMG production, usage rights, and WitMe conversion.

Every recommended opportunity must answer: fit, observable opportunity, timing, pitch, campaign concept, evidence, confirmed vs inferred, confidence, next action, and project handoff fields.

## Architecture fit (current ShootSpine)

| Layer | Reuse |
|-------|--------|
| Auth | Firebase email/password, `requireApprovedAuthUser` |
| Tenant | `users.company` (Insight Media Group LLC vs partners) |
| Permissions | Extended `UserPermissions` |
| Data | Firestore via Admin SDK in API routes (server-only collections) |
| AI | `geminiClient`, `usageLog`, Tavily via `tavilyClient` |
| Projects | `POST /api/projects`, `createProjectFromIdea` pattern |
| Proposals | Existing agreements / quick quote (extend, do not duplicate) |
| Email | Resend today; Gmail OAuth added in Phase 6 |
| Automation | Vercel Cron today; n8n in Phase 9 |

## Feature flag

Set `REVENUE_OPPORTUNITIES_ENABLED=false` to hide navigation and disable API routes without removing code.

## Implementation status

| Phase | Status |
|-------|--------|
| 1 — Foundation | In progress |
| 2 — Manual workflow | Not started |
| 3 — Agent framework | Not started |
| 4 — Research | Not started |
| 5 — Outreach | Not started |
| 6 — Gmail | Not started |
| 7 — Discovery & proposals | Not started |
| 8 — Project conversion | Not started |
| 9 — n8n | Not started |
| 10 — Hardening | Not started |

See [revenue-opportunities-implementation-plan.md](./revenue-opportunities-implementation-plan.md) for phased delivery.
