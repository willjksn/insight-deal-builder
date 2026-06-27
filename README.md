# Insight Deal Builder

Production agreement builder for **Insight Media Group LLC** — create, review, sign, export, and email production agreements for video/photo projects.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Firebase Auth + Firestore
- jsPDF for PDF generation
- react-signature-canvas for iPad/Apple Pencil signatures

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure Firebase**
   - Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
   - Enable **Email/Password** authentication
   - Create a **Firestore** database
   - Copy `.env.local.example` to `.env.local` and fill in your Firebase config

3. **Firestore rules (development)**
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```

4. **Run locally**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000)

5. **First login**
   - Create an account on the login page (first user is created as admin)
   - Go to **Settings → Load All Demo Data** to seed companies, client, and project

## Workflows

### Desktop (PC/Mac)
Best for setup: companies, clients, crew, projects, templates, payout structures, gear packages, and building agreement drafts.

### iPad (on-set / client meetings)
Best for: opening existing agreements, quick edits, signatures, initials, PDF preview, download, and email-ready output.

## Main Routes

| Route | Purpose |
|-------|---------|
| `/dashboard` | Overview and quick actions |
| `/companies` | Insight Media Group, AVE Productions, partners |
| `/clients` | Client profiles |
| `/crew` | Crew, talent, contractors |
| `/projects` | Production projects |
| `/agreements` | Agreement list |
| `/agreements/new` | 12-step agreement wizard |
| `/agreements/[id]` | Preview, PDF, email |
| `/agreements/[id]/sign` | Signatures and initials |
| `/templates` | Built-in agreement templates |
| `/settings` | Account, Firebase status, demo data |

## Agreement Types

1. **Internal Collaboration** — Insight + AVE + crew (payouts, gear, roles)
2. **Client Project** — Production company + client (deliverables, payment, usage)

## Version 1 Scope

Included: wizard, payout calculator, gear packages, deliverables, clauses, signatures, PDF download, email-ready subject/body.

Not included yet: AI analysis, Stripe, DocuSign API, talent releases, location scouting.
