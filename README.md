# Insight Production Hub

From script and scout through pre-production, agreements, and client sign-off — one workspace for **Insight Media Group**.

## What it covers

- **Script writer** — text or inspiration-driven scripts with production packs
- **Pre-production boards** — cast, crew, shoot days, locations, and budgets per project
- **Shot Scout** — location photos, AI analysis, DP plans, and shot lists
- **Agreements** — quotes, signatures, payouts, gear use, and client sign-off
- **Catalogs** — clients, companies, crew, packages, equipment, and locations

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Firebase Auth, Firestore, and Storage
- Google Gemini (Vertex) for Script writer and Shot Scout AI
- jsPDF for PDF generation
- react-signature-canvas for iPad/Apple Pencil signatures

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Environment**
   Copy `.env.local.example` to `.env.local` and fill in Firebase, Gemini/Vertex, and optional Resend keys.

3. **Run locally**
   ```bash
   npm run dev
   ```

4. **Firebase rules**
   Deploy Firestore rules, indexes, and Storage rules when collections change:
   ```bash
   firebase deploy --only firestore:rules,firestore:indexes,storage
   ```

## Key routes

| Area | Routes |
|------|--------|
| Command center | `/dashboard` |
| Projects & boards | `/projects`, `/projects/[id]/production` |
| Script writer | `/script-writer`, `/script-writer/[id]` |
| Shot Scout | `/scout`, `/scout/[id]` |
| Agreements | `/agreements`, `/agreements/new`, `/agreements/[id]` |
| Scout settings | `/settings/scout-gear`, `/settings/lights` |

## Permissions

Access is role- and checkbox-based. Production tools (Script writer, Shot Scout) require the Shot Scout permission. Agreement creation requires quote permissions. Admins manage users from `/admin`.

## Deploy

The app is designed for Vercel with Firebase backend. Set production env vars in Vercel and ensure `SCOUT_USE_MOCK_AI=false` when real Gemini analysis is required.
