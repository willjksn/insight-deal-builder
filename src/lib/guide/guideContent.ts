import {
  canAccessReports,
  canCaptureIdentityDocs,
  canCreateQuotes,
  canDeleteQuotes,
  canDuplicateQuotes,
  canDownloadPdf,
  canEditQuotes,
  canEmailQuotes,
  canManageClients,
  canManageCompanies,
  canManageCrew,
  canManageProjects,
  canManageTemplates,
  canManageUsers,
  canSignQuotes,
  canUploadW9Docs,
  canUseProductionTools,
  canViewIdentityDocs,
  canViewW9Docs,
  isInsightOrgUser,
  isPartnerOrgUser,
} from "@/lib/utils/permissions";
import { isUserApproved } from "@/lib/users/approval";
import { AppUser } from "@/lib/types";
import { GuideCategory } from "@/lib/guide/types";

const approved = (user: AppUser | null) => isUserApproved(user);
const production = (user: AppUser | null) => canUseProductionTools(user);
const deals = (user: AppUser | null) =>
  canCreateQuotes(user) ||
  canEditQuotes(user) ||
  canSignQuotes(user) ||
  canDownloadPdf(user) ||
  canEmailQuotes(user);

export const GUIDE_CATEGORIES: GuideCategory[] = [
  {
    id: "start",
    label: "Getting started",
    canAccess: approved,
    sections: [
      {
        id: "welcome",
        title: "How to work in ShootSpine",
        description: "The end-to-end flow from concept to signed agreement.",
        canAccess: approved,
        blocks: [
          {
            paragraphs: [
              "ShootSpine is built around projects — each production follows one spine. A project is a single client job, portfolio piece, or campaign; everything for that shoot lives together: script, Prep board, Coverage (shot = storyboard frame), call sheets, and the commercial agreement.",
              "Most IMG producers move through the same path. You do not have to use every tool on every job, but the order below is the intended workflow when you are planning a full shoot.",
            ],
          },
          {
            heading: "Recommended workflow",
            bullets: [
              "Open Projects and create a new project (or open an existing one). Give it a working title and link a client if you already have one.",
              "Go to Script writer. Develop the concept with the AI coach, edit the screenplay in the editor, turn on detailed shot list / storyboard, then generate.",
              "Open the project → Prep. Link the script session and Apply so cast, locations, days, and shots seed the board.",
              "Open Coverage. Review the shot bible, upload or generate AI frames, then Sync from script if the script changed (your frames and day placement are kept).",
              "Open each shoot day’s Call sheet for logistics; print the denser one-pager for set. Use Day shots for list checkoff, storyboard, and crew packets.",
              "Optional: use Stage planner for a lighting diagram.",
              "When the deal is ready, create an agreement from Quick quote or the full wizard, sign, and send to the client.",
            ],
            links: [{ label: "Command center", href: "/dashboard" }],
          },
          {
            heading: "Where to find things",
            tips: [
              "The project spine on each project page is your map — Script, Prep, Coverage, Stage, Reference, Agreement. Each card shows whether that step is linked yet.",
              "The sidebar only shows areas your account can access. This guide uses the same rules, so you will not see instructions for tools you cannot open.",
            ],
          },
        ],
      },
      {
        id: "account-access",
        title: "How your account and permissions work",
        description: "Why you see certain menu items and how to get access to more.",
        canAccess: approved,
        blocks: [
          {
            paragraphs: [
              "When you sign up, an admin assigns your company and turns on permissions before you can use the app. Each permission is a checkbox on your profile — create quotes, use production tools, manage projects, and so on.",
              "The sidebar, project pages, and this guide all respect those same checkboxes. If you cannot see Script writer in the sidebar, you will not get script-writer instructions here either.",
            ],
          },
          {
            heading: "If something is missing",
            bullets: [
              "Ask an admin to enable the permission on your user profile in Admin.",
              "For freelancers who only need Coverage or day shots on one job, use Settings → Project access to add them to that project with scripts, production, or shots only — without giving them the full catalog.",
              "Partners usually start with quote and agreement permissions only. IMG catalogs (clients, crew, packages) are separate and IMG-only unless explicitly granted.",
            ],
            links: [{ label: "Settings", href: "/settings" }],
          },
        ],
      },
      {
        id: "partner-quotes",
        title: "How partners create and close deals",
        description: "Step-by-step for partner organization members.",
        canAccess: (user) => isPartnerOrgUser(user) && deals(user),
        blocks: [
          {
            paragraphs: [
              "As a partner, you work in agreements where your email or company is listed as a party. You will not see other companies’ deals unless an admin grants view-all-org access.",
            ],
          },
          {
            heading: "Create a quote",
            bullets: [
              "Open Quick quote for a fast fee from a package, or Agreements → New for the full wizard.",
              "Pick your client and fill in scope and payment terms.",
              "Save as draft while you are still negotiating.",
            ],
          },
          {
            heading: "Send and sign",
            bullets: [
              "Open the agreement → Download PDF to review, or Email to copy client-ready text.",
              "When ready, sign on your device (iPad + Apple Pencil works well).",
              "Use Send to client so they get a secure link to sign without creating an account.",
            ],
            links: [
              { label: "Agreements", href: "/agreements" },
              { label: "Quick quote", href: "/quick-quote" },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "overview",
    label: "Command center",
    canAccess: approved,
    sections: [
      {
        id: "dashboard",
        title: "How to use the Command center",
        description: "Your home screen and starting point each session.",
        canAccess: approved,
        blocks: [
          {
            paragraphs: [
              "The Command center (Dashboard) shows recent projects and agreements so you can jump back into active work without hunting through lists.",
            ],
          },
          {
            heading: "What to do here",
            bullets: [
              "Click a recent project to open its spine and continue Prep, Coverage, or call sheets.",
              "Click a recent agreement to resume editing or signing.",
              "Use shortcuts to Reference guide or Stage planner when you have production access.",
              "If you are starting fresh, use the empty-state buttons to create a project or open Script writer.",
            ],
            links: [{ label: "Command center", href: "/dashboard" }],
          },
        ],
      },
    ],
  },
  {
    id: "production",
    label: "Production",
    canAccess: (user) => production(user) || canManageProjects(user),
    sections: [
      {
        id: "projects",
        title: "How to set up and use a project",
        description: "The hub that ties script, Prep, Coverage, and agreements together.",
        canAccess: (user) => canManageProjects(user) || production(user),
        blocks: [
          {
            paragraphs: [
              "Create a project from Projects → New. The project page shows the spine — Script, Prep, Coverage, Stage planner, Reference guide, and Agreement. Linked or ready states mean that step has data; open any card to work there.",
            ],
          },
          {
            heading: "Typical setup",
            bullets: [
              "Create the project first, even if the script is not written yet — you need a project to apply script data to.",
              "Open Prep from the spine to link a script session and fill the board (people, locations, days).",
              "Open Coverage to work the shot bible and storyboard frames (one shot = one frame).",
              "Add project members under Settings → Project access if freelancers need coverage- or day-shots-only access.",
            ],
            links: [{ label: "Projects", href: "/projects" }],
          },
        ],
      },
      {
        id: "script-writer",
        title: "How to use Script writer",
        description: "Write screenplays with an AI coach, generate coverage, and apply to the project.",
        canAccess: production,
        blocks: [
          {
            paragraphs: [
              "Script writer helps you develop a concept, edit a real screenplay, and build a production pack. Once a script exists, the editor is the main canvas and the AI coach stays in a side rail. You can start from text chat or inspiration mode with reference images and clips.",
            ],
          },
          {
            heading: "Start a session",
            bullets: [
              "Open Script writer → New session (or open an existing session).",
              "Chat through the concept — audience, tone, locations, talent — or upload inspiration and run analysis first.",
              "Before generating, enable Detailed shot list for numbered WS/MS/CU coverage rows per scene.",
              "Enable Storyboard mode if you want hero scene frames matched to inspiration (Coverage still stores one frame per shot).",
              "Generate, then refine with the coach or edit the screenplay directly.",
            ],
          },
          {
            heading: "Screenplay editor",
            bullets: [
              "Enter creates the next block type (Character → Dialogue, etc.). Shift+Enter is a soft line break inside a block.",
              "Tab follows a Final Draft–style spine: Action → Character → Dialogue → Parenthetical. Shift+Tab reverses.",
              "Empty Dialogue + Enter starts the next Character. Cmd/Ctrl+Enter forces a new Action block.",
              "↑/↓ at the edges of a block move between blocks. Backspace at the start merges or deletes empty blocks.",
              "Paste Fountain or multi-line screenplay text to import blocks (selection-aware).",
              "Cmd/Ctrl+1–7 jumps element type (Scene Heading through Shot).",
            ],
          },
          {
            heading: "Apply to your project",
            bullets: [
              "On Prep, link this script session, then Apply to project.",
              "That seeds days, shots, and inspiration onto the board and Coverage.",
              "Later: use Sync from script on Coverage (or Refresh from script on a day’s shot list) when the script changes — uploaded and AI frames, done checkmarks, and day placement are preserved.",
            ],
            tips: [
              "If coverage looks thin, regenerate with detailed shot list turned on, then sync again.",
              "Always link the script session on Prep before syncing — otherwise Coverage will not know which script to pull from.",
            ],
            links: [{ label: "Script writer", href: "/script-writer" }],
          },
        ],
      },
      {
        id: "preproduction-board",
        title: "How to use Prep (pre-production board)",
        description: "Plan cast, locations, days, and checklist before the shoot.",
        canAccess: production,
        blocks: [
          {
            paragraphs: [
              "Prep (the pre-production board) is the planning document for the shoot. Data you enter here feeds call sheets, Coverage, day shot lists, and crew packets. On the project spine it is labeled Prep.",
            ],
          },
          {
            heading: "Fill out the board",
            bullets: [
              "Set film title, logline, look/feel, inspiration images, and any story links.",
              "Add people under Cast, Production, and Camera — names and roles appear on call sheets.",
              "Add locations and mark them booked; the first booked location can sync to a shoot day.",
              "Work through the production checklist (portfolio vs client mode changes which tasks show).",
              "Add production days — each day gets its own call sheet and Day shots page.",
              "Link a script session and Apply when you are ready to seed Coverage.",
            ],
            links: [{ label: "Projects", href: "/projects" }],
          },
        ],
      },
      {
        id: "shot-list",
        title: "How to use Coverage and day shots",
        description: "Shot bible, AI frames, day checkoff, and crew packets.",
        canAccess: production,
        blocks: [
          {
            paragraphs: [
              "Coverage is the director/DP desk: one shot equals one storyboard frame, with lens, framing, lighting, and other DP fields. Open it from the project spine (Coverage) or /projects/…/coverage. Day shots (Prep → a shoot day → Day shots) is where you check shots off on set, print storyboards, and generate crew packets.",
            ],
          },
          {
            heading: "Coverage desk",
            bullets: [
              "Use Board, Linear, or List views. Filter by shoot day when needed.",
              "Upload a frame, pick from the inspiration library, or click AI frame / Regen AI on a card.",
              "Fill empty frames generates AI stills for shots that still need images (up to 12 at a time).",
              "Sync from script refreshes shot text from the linked script without wiping uploaded or AI frames, filled DP fields, or day placement.",
              "Mark shots captured with the checkbox when they are in the can.",
            ],
          },
          {
            heading: "Day shots on set",
            bullets: [
              "Open Prep → shoot day → Day shots (or Coverage → Call sheet / Day shot list links).",
              "List view: check off each shot as you capture it; Refresh from script if coverage changed.",
              "Storyboard tab: same shot frames as Coverage for that day — upload or AI generate here too.",
              "Drag the grip handle onto another day tab to move shots (or Move to… on iPad).",
              "Auto-split days packs shots across days by location when you have a large list.",
            ],
          },
          {
            heading: "Crew packet",
            bullets: [
              "On Day shots, open the Crew packet tab for the day you are printing.",
              "Click Generate (or Regenerate after script or shot changes).",
              "Use the jump chips to preview Director, DP, Gaffer, Sound, Talent, and Art/Props sections.",
              "Click View full packet or Print crew packet for one combined PDF — master shot list plus all role sections.",
            ],
            tips: [
              "Generate one crew packet per shoot day on multi-day jobs.",
              "Use Coverage to build the bible before the shoot; use Day shots List for checkoff on set.",
            ],
          },
        ],
      },
      {
        id: "call-sheet",
        title: "How to use call sheets",
        description: "Day logistics plus coverage summary — print a dense one-pager for set.",
        canAccess: production,
        blocks: [
          {
            paragraphs: [
              "Each production day has its own call sheet. Open Prep → a shoot day → Call sheet (or jump from Coverage). The left column is for editing logistics; the right column is the printable sheet. Printing hides the app chrome and editor so only the sheet goes to paper or PDF.",
            ],
          },
          {
            heading: "Coverage on the call sheet",
            bullets: [
              "The Coverage for this day strip shows thumbnails, shot names, scene, lens, framing, and done status — a quick bible glance before you print.",
              "Open Coverage or Day shot list from the strip links to edit frames.",
              "The printable call sheet includes a Coverage table (frame, shot, scene, lens, framing, done) under the schedule so the one-pager is shot-aware, not only logistics.",
            ],
          },
          {
            heading: "Fill logistics and print",
            bullets: [
              "Enter crew call, meal times, wrap, sunrise/sunset, weather, and schedule blocks.",
              "Key contacts (Producer, AD, Director, DP) sync from people on the Prep board — add missing names on Prep first if a field is empty.",
              "Use Sync key contacts from board and Use board location when those helpers apply.",
              "Click Print call sheet for a dense letter-size one-pager (tight margins, smaller type, compact coverage thumbs).",
            ],
            tips: [
              "Print after Coverage frames are filled so the call sheet shows useful thumbs on set.",
              "For a full visual bible print, use Day shots → Storyboard → Print storyboard instead of the call sheet.",
            ],
          },
        ],
      },
      {
        id: "stage-planner",
        title: "How to use Stage planner",
        description: "Draw a top-down set and lighting diagram.",
        canAccess: production,
        blocks: [
          {
            paragraphs: [
              "Stage planner saves a diagram per project — useful for stage shoots and explaining lighting to crew.",
            ],
          },
          {
            heading: "Build the diagram",
            bullets: [
              "Open Stage planner from the sidebar or the project spine.",
              "Drag props onto the canvas; draw walls and doorways.",
              "Add note boxes and light-direction arrows.",
              "Select an item to rotate in 15° steps or resize from corners.",
              "Changes save automatically to the project.",
            ],
            links: [{ label: "Stage planner", href: "/stage" }],
          },
        ],
      },
      {
        id: "reference-guide",
        title: "How to use the Reference guide",
        description: "On-set camera and lighting quick reference.",
        canAccess: production,
        blocks: [
          {
            paragraphs: [
              "The Reference guide is a read-only, iPad-friendly page for ratios, IRE, Sony FX6/FX3/FX30/a7IV settings, and lens notes — meant for quick lookup on set, not editing.",
            ],
          },
          {
            heading: "On set",
            bullets: [
              "Open Reference guide from the sidebar or Command center shortcut.",
              "Scroll to the section you need — no login steps beyond your normal app session.",
            ],
            links: [{ label: "Reference guide", href: "/reference" }],
          },
        ],
      },
    ],
  },
  {
    id: "business",
    label: "Agreements & quotes",
    canAccess: deals,
    sections: [
      {
        id: "agreements-overview",
        title: "How to find and open agreements",
        description: "The agreements hub and deal statuses.",
        canAccess: deals,
        blocks: [
          {
            paragraphs: [
              "Agreements lists every deal you can access — typically where your email or company is a party. Status tells you what to do next.",
            ],
          },
          {
            heading: "Statuses explained",
            bullets: [
              "Draft — still editing; not sent for signature.",
              "Ready for signature — terms locked in; waiting for signatures.",
              "Signed / completed — all required parties have signed; PDF is final.",
            ],
          },
          {
            heading: "Open a deal",
            bullets: [
              "Click any row to open agreement detail — parties, scope, payment, and toolbar actions (PDF, email, sign).",
            ],
            links: [{ label: "Agreements", href: "/agreements" }],
          },
        ],
      },
      {
        id: "quick-quote",
        title: "How to use Quick quote",
        description: "Fast fee estimate when you do not need the full wizard yet.",
        canAccess: canCreateQuotes,
        blocks: [
          {
            paragraphs: [
              "Quick quote is for speed: pick client, project type, and package to get a fee and basic scope on screen in minutes.",
            ],
          },
          {
            heading: "Steps",
            bullets: [
              "Open Quick quote from the sidebar.",
              "Select client and package (packages live in Catalogs if you manage projects).",
              "Review the estimate and adjust if needed.",
              "Convert to a full agreement when you need complete terms, usage, and clauses — the wizard opens with data carried over.",
            ],
            links: [{ label: "Quick quote", href: "/quick-quote" }],
          },
        ],
      },
      {
        id: "new-agreement",
        title: "How to create an agreement (full wizard)",
        description: "Commercial terms, scope, payment, and clauses.",
        canAccess: canCreateQuotes,
        blocks: [
          {
            paragraphs: [
              "Use the full wizard when you need complete legal and commercial terms, not just a quick fee.",
            ],
          },
          {
            heading: "Walk through the wizard",
            bullets: [
              "Agreements → New.",
              "Step through type, parties, project link, deliverables, payment schedule, usage rights, and custom clauses.",
              "Use the scope assistant where offered — it suggests language from your catalogs (requires Gemini in production).",
              "Save as draft at any step; return later from Agreements.",
            ],
            links: [{ label: "New agreement", href: "/agreements/new" }],
          },
        ],
      },
      {
        id: "edit-agreements",
        title: "How to edit, duplicate, or delete drafts",
        description: "Manage agreements before they are fully signed.",
        canAccess: (user) =>
          canEditQuotes(user) || canDeleteQuotes(user) || canDuplicateQuotes(user),
        blocks: [
          {
            paragraphs: [
              "You can only edit agreements that are still drafts. Once signed, terms are locked in the completed PDF.",
            ],
          },
          {
            heading: "Actions",
            bullets: [
              "Edit — open the agreement and change fields until both parties have signed.",
              "Duplicate — copy the structure into a new draft for a similar job.",
              "Delete — remove the agreement (requires delete-quotes permission).",
            ],
          },
        ],
      },
      {
        id: "signing",
        title: "How to sign and send to clients",
        description: "Your signature, client signing links, and completion.",
        canAccess: canSignQuotes,
        blocks: [
          {
            paragraphs: [
              "Signing happens on the agreement detail page or the dedicated sign view. Clients sign via a link — they do not need an app account.",
            ],
          },
          {
            heading: "Sign on your side",
            bullets: [
              "Open the agreement → Sign (or open the sign route from the toolbar).",
              "Draw your signature with finger or Apple Pencil; fill initials blocks where the template requires them.",
              "Save — your signature is embedded in the agreement PDF.",
            ],
          },
          {
            heading: "Send to the client",
            bullets: [
              "Use Send to client — the app generates a PDF and emails a secure signing link (when email is configured).",
              "The client opens the link, reviews, and signs in the browser.",
              "When all parties have signed, status moves to completed and the notification bell alerts your team.",
            ],
          },
        ],
      },
      {
        id: "pdf-email",
        title: "How to download PDFs and email clients",
        description: "Export and outbound communication.",
        canAccess: (user) => canDownloadPdf(user) || canEmailQuotes(user),
        blocks: [
          {
            heading: "PDF",
            bullets: [
              "Open the agreement → Download PDF from the toolbar.",
              "Draft PDFs reflect current terms; completed PDFs include all signatures.",
            ],
          },
          {
            heading: "Email",
            bullets: [
              "Email opens your mail client with agreement summary text ready to paste.",
              "Send to client is the automated path — PDF + signing link in one step.",
            ],
          },
        ],
      },
      {
        id: "templates",
        title: "How to use templates",
        description: "Start new deals from saved structures.",
        canAccess: canManageTemplates,
        blocks: [
          {
            paragraphs: [
              "Templates store clause structure, default parties, and scope patterns so you do not rebuild every agreement from scratch.",
            ],
          },
          {
            heading: "Create and use",
            bullets: [
              "Templates → New to build a template, or edit an existing one.",
              "When starting Agreements → New, pick a template to pre-fill sections.",
            ],
            links: [{ label: "Templates", href: "/templates" }],
          },
        ],
      },
      {
        id: "identity-w9",
        title: "How identity and W-9 collection works",
        description: "Tax and ID documents during signing.",
        canAccess: (user) =>
          canViewIdentityDocs(user) ||
          canViewW9Docs(user) ||
          canCaptureIdentityDocs(user) ||
          canUploadW9Docs(user),
        blocks: [
          {
            paragraphs: [
              "Some agreements require identity verification or W-9 upload as part of signing or onboarding.",
            ],
          },
          {
            heading: "During signing",
            bullets: [
              "If enabled on the agreement, signers capture ID or upload W-9 in the signing flow.",
              "Compliance roles review identity documents; accounting opens W-9 PDFs from the agreement.",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "catalogs",
    label: "Catalogs",
    canAccess: (user) =>
      isInsightOrgUser(user) &&
      (canManageClients(user) ||
        canManageCompanies(user) ||
        canManageCrew(user) ||
        canManageProjects(user)),
    sections: [
      {
        id: "clients",
        title: "How to manage clients",
        description: "Client profiles used on projects and agreements.",
        canAccess: canManageClients,
        blocks: [
          {
            paragraphs: [
              "Clients are reusable profiles — contact info and company name carry into Quick quote and agreement parties.",
            ],
          },
          {
            heading: "Add or edit",
            bullets: [
              "Clients → New client, fill name and details, save.",
              "When creating a project or agreement, pick the client from the dropdown.",
            ],
            links: [{ label: "Clients", href: "/clients" }],
          },
        ],
      },
      {
        id: "companies",
        title: "How to manage companies",
        description: "Production company profiles for agreement parties.",
        canAccess: canManageCompanies,
        blocks: [
          {
            paragraphs: [
              "Companies hold legal names and defaults used as production company parties on agreements.",
            ],
          },
          {
            heading: "Add or edit",
            bullets: [
              "Companies → New, enter legal name and display details.",
              "Select the company as a party when building agreements.",
            ],
            links: [{ label: "Companies", href: "/companies" }],
          },
        ],
      },
      {
        id: "crew",
        title: "How to manage crew and talent",
        description: "Reusable roster for production boards.",
        canAccess: canManageCrew,
        blocks: [
          {
            paragraphs: [
              "Crew entries store role, rate, and contact info. Add them once, then pull people onto project boards and call sheets.",
            ],
          },
          {
            heading: "Add and use on a shoot",
            bullets: [
              "Crew → New, enter name, role, and rate.",
              "On the pre-production board, add people from the roster or type new names inline.",
            ],
            links: [{ label: "Crew", href: "/crew" }],
          },
        ],
      },
      {
        id: "packages-equipment-locations",
        title: "How to use packages, equipment, and locations",
        description: "Catalogs that feed quotes and scope.",
        canAccess: canManageProjects,
        blocks: [
          {
            paragraphs: [
              "These catalogs keep fees, gear, and locations consistent across Quick quote and agreement scope.",
            ],
          },
          {
            heading: "Packages",
            bullets: [
              "Packages → define fee tiers and included deliverables.",
              "Quick quote pulls from packages for fast estimates.",
            ],
          },
          {
            heading: "Equipment & locations",
            bullets: [
              "Equipment — gear list for scope assistant suggestions.",
              "Locations — saved locations you can attach to projects.",
            ],
            links: [
              { label: "Packages", href: "/packages" },
              { label: "Equipment", href: "/equipment" },
              { label: "Locations", href: "/locations" },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "reports",
    label: "Reports",
    canAccess: canAccessReports,
    sections: [
      {
        id: "reports-hub",
        title: "How to export payments data",
        description: "Accounting exports from signed agreements.",
        canAccess: canAccessReports,
        blocks: [
          {
            paragraphs: [
              "Reports is for accounting — export payee and payment data from completed agreements.",
            ],
          },
          {
            heading: "Export",
            bullets: [
              "Open Reports or Reports → Payments.",
              "Set filters if shown, then export the file for your accounting workflow.",
            ],
            links: [
              { label: "Reports", href: "/reports" },
              { label: "Payments", href: "/reports/payments" },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "system",
    label: "Settings",
    canAccess: approved,
    sections: [
      {
        id: "settings",
        title: "How to use Settings and notifications",
        description: "Profile, alerts, and project access.",
        canAccess: approved,
        blocks: [
          {
            paragraphs: [
              "Settings holds account preferences, push notification setup, and project team management.",
            ],
          },
          {
            heading: "Notifications",
            bullets: [
              "Enable push notifications when prompted — you get alerts when clients sign agreements.",
              "The bell icon in the header lists recent agreement events (and admin signup alerts if you are an admin).",
            ],
          },
          {
            heading: "Password",
            bullets: [
              "Use Forgot password on the login page for a Firebase reset email.",
            ],
            links: [
              { label: "Settings", href: "/settings" },
              { label: "Project access", href: "/settings/project-access" },
            ],
          },
        ],
      },
      {
        id: "project-access-guide",
        title: "How to add people to a project",
        description: "Granular access for freelancers and crew.",
        canAccess: (user) => canManageProjects(user) || canManageUsers(user),
        blocks: [
          {
            paragraphs: [
              "Project access lets you invite someone to one job without giving them the whole app. Permissions are per project: scripts, production (Prep board), or shots (Coverage / day shots / call sheets).",
            ],
          },
          {
            heading: "Add a member",
            bullets: [
              "Settings → Project access (or Admin → Project teams).",
              "Pick the project, enter the member’s email, and check the areas they need.",
              "Shots-only is common for day players who just need Coverage, day shot checkoff, call sheets, and crew packets.",
            ],
            links: [{ label: "Project access", href: "/settings/project-access" }],
          },
        ],
      },
    ],
  },
];
