# ShootSpine

**[shootspine.com](https://shootspine.com)** · Script. Plan. Shoot. Sign.

The project spine for video production — script, plan, shoot, and sign — built for **Insight Media Group** and partner teams.

## What it covers

- **Script writer** — text or inspiration-driven scripts with production packs and optional storyboard mode
- **Pre-production boards** — cast, crew, shoot days, locations, call sheets, and shot lists per project
- **Stage planner** — top-down lighting diagrams with props, walls, and notes
- **Reference guide** — iPad-friendly FX6 / lens quick reference (admin can draft with Gemini + Tavily)
- **Agreements** — quotes, signatures, payouts, gear use, and client sign-off
- **Catalogs** — clients, companies, crew, packages, equipment, and locations
- **Revenue & opportunities** — IMG client and Stormi brand prospecting (phased rollout; see `docs/revenue-opportunities-overview.md`)

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Firebase Auth, Firestore, and Storage
- Google Gemini (Vertex) for Script writer and production AI features
- jsPDF for PDF generation
- react-signature-canvas for iPad/Apple Pencil signatures
- Resend for transactional email

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Environment**
   Copy `.env.local.example` to `.env.local` and fill in Firebase, Gemini/Vertex, and Resend keys.

3. **Run locally**
   ```bash
   npm run dev
   ```

4. **Tests & lint**
   ```bash
   npm test
   npm run lint
   ```

5. **Firebase rules**
   Deploy Firestore rules, indexes, and Storage rules when collections change:
   ```bash
   firebase deploy --only firestore:rules,firestore:indexes,storage
   ```

## Key routes

| Area | Routes |
|------|--------|
| Command center | `/dashboard` |
| Projects & boards | `/projects`, `/projects/[id]/production` |
| Shot list & call sheet | `/projects/[id]/production/days/[dayId]/shots` |
| Stage planner | `/stage`, `/projects/[id]/stage` |
| Reference guide | `/reference` |
| Script writer | `/script-writer`, `/script-writer/[id]` |
| Agreements | `/agreements`, `/agreements/new`, `/agreements/[id]` |
| Admin | `/admin` |

## Permissions

Access is role- and checkbox-based. Production tools (Script writer, stage planner, reference guide, production boards) require the **Production tools** permission (`useShotScout` in Firestore). Agreement creation requires quote permissions. Admins manage users from `/admin`.

**Legacy users:** profiles imported before the approval flow may omit the `approved` field — those users are treated as already approved. New signups stay pending until an admin assigns company and permissions.

**Partner org preset:** use the “Partner org” permission preset in Admin when onboarding external production partners (own quotes only, no IMG client/company/crew browse).

## Deploy checklist (Vercel + Firebase)

1. Set production env vars in Vercel (see `.env.local.example`).
2. Required for real AI: `GEMINI_API_KEY`, `SCOUT_USE_MOCK_AI=false`, `FIREBASE_SERVICE_ACCOUNT_JSON`.
3. Required for email: `RESEND_API_KEY`, `RESEND_FROM_EMAIL=ShootSpine <notifications@shootspine.com>`, `NEXT_PUBLIC_APP_URL`.
4. Optional uptime monitors: `HEALTH_CHECK_SECRET` or reuse `CRON_SECRET` for `/api/health/firebase` and `/api/health/email` (Bearer or `x-health-secret` header).
5. Deploy Firebase rules/indexes/storage after rule changes.
6. Verify admin health endpoints after deploy:
   - `GET /api/health/email` (admin auth or health secret)
7. CI runs on push/PR to `main`: lint, tests, and production build.

## Health endpoints

| Route | Access | Purpose |
|-------|--------|---------|
| `/api/health` | Public | Liveness (`ok`, timestamp only) |
| `/api/health/firebase` | Admin or health secret | Firebase Admin connectivity |
| `/api/health/email` | Admin or health secret | Resend configuration |
