# Revenue & Opportunities — Overview

Revenue & Opportunities is a major feature area inside **ShootSpine** (not a separate app). It helps Insight Media Group and Stormi find qualified business and brand opportunities, prepare outreach, manage email conversations, draft proposals, and convert won deals into existing ShootSpine projects.

## Product boundary

### Owned by Revenue & Opportunities

- Prospecting campaigns (IMG client + Stormi / creator-brand modes)
- Business profiles (reusable BD identities)
- Opportunity research, evidence, and scoring (IMG + Stormi models)
- High-level campaign concepts (not full scripts or shot lists)
- Outreach preparation, approval, and suppression list
- Follow-up task queue
- Gmail draft + inbox classification
- Pipeline, discovery prep, meetings (record/upload → transcribe → analyze)
- Proposals + agreement prefill / signed → won loop
- Contacts CRM (shared across opportunities)
- Daily briefs (persisted on Command Center)
- n8n workflow monitoring
- Convert won opportunity → ShootSpine project **with Prep handoff**

### Remains in existing ShootSpine

- Script writer, shot lists, storyboards, production boards
- Agreements, signatures, Stripe payments
- Call sheets, crew packets, stage planner
- Content Idea Engine (creative ideation, not sales prospecting)
- Creator network / portal (parallel Business track)

## Primary workflows

**IMG client prospecting** — Find businesses that may buy cinematic production, retainers, or creator-led campaigns.

**Creator-brand prospecting** — Find brands that fit Stormi / network creators for fees, IMG production, usage rights, and WitMe conversion.

Every recommended opportunity should answer: fit, observable opportunity, timing, pitch, campaign concept, evidence, confirmed vs inferred, confidence, next action, and project handoff fields.

## Architecture fit (current ShootSpine)

| Layer | Reuse |
|-------|--------|
| Auth | Firebase email/password, `requireApprovedAuthUser` |
| Tenant | `users.company` (Insight Media Group LLC vs partners) |
| Permissions | `manageRevenueOpportunities` (+ project manage for convert) |
| Data | Firestore via Admin SDK in API routes (server-only collections) |
| AI | `geminiClient` / Vertex, `usageLog`, Tavily via `tavilyClient` |
| Projects | Conversion seeds project + Prep board |
| Proposals | Agreement prefill + signed → won link |
| Email | Gmail OAuth + Resend elsewhere |
| Automation | n8n catalog + webhook status callbacks |

## Feature flag

Revenue is **on by default**. Set `REVENUE_OPPORTUNITIES_ENABLED=false` (and optionally `NEXT_PUBLIC_REVENUE_OPPORTUNITIES_ENABLED=false`) to hide navigation and block API routes.

### Deep research (live only)

Campaign **Run deep research** uses multi-query Tavily discovery + per-prospect Gemini qualify. Requires `SCOUT_USE_MOCK_AI=false`, `TAVILY_API_KEY`, and Gemini/Vertex. Dummy prospects are disabled — misconfigured env fails loudly instead of inventing businesses.

## Implementation status (as of 2026-07)

| Area | Status |
|------|--------|
| Foundation, campaigns, opportunities, agents | **Shipped** |
| Business profiles + Stormi scoring | **Shipped** |
| Outreach, Gmail, inbox | **Shipped** |
| Discovery, meetings, proposals, agreement loop | **Shipped** |
| Won → project + Prep handoff | **Shipped** (richer seed) |
| Follow-up tasks + suppression | **Shipped** |
| Daily briefs (persisted) | **Shipped** |
| Contacts CRM | **Shipped** (v1) |
| Meeting upload up to 100 MB | **Shipped** (transcription still ≤20 MB inline) |
| Chunked / async transcription for long calls | Open |
| Global search, deep analytics, learning loop | Open |

See [revenue-opportunities-implementation-plan.md](./revenue-opportunities-implementation-plan.md) for historical phased delivery notes (many phases marked “not started” there are outdated relative to the codebase).
