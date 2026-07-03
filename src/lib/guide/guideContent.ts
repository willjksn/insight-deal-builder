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
              "ShootSpine is built around projects — each production follows one spine. A project is a single client job, portfolio piece, or campaign; everything for that shoot lives together: script, board, shot list, and the commercial agreement.",
              "Most IMG producers move through the same path. You do not have to use every tool on every job, but the order below is the intended workflow when you are planning a full shoot.",
            ],
          },
          {
            heading: "Recommended workflow",
            bullets: [
              "Open Projects and create a new project (or open an existing one). Give it a working title and link a client if you already have one.",
              "Go to Script writer. Talk through the concept, turn on detailed shot list if you need full coverage, then generate the script and production pack.",
              "Open the project → Pre-production. Link the script session, then apply the script to the board so cast, locations, days, and shots populate.",
              "Open Shot list. Use Auto-split days if you have multiple shoot days, then generate a crew packet for each day you are printing for set.",
              "Optional: use Stage planner for a lighting diagram.",
              "When the deal is ready, create an agreement from Quick quote or the full wizard, sign, and send to the client.",
            ],
            links: [{ label: "Command center", href: "/dashboard" }],
          },
          {
            heading: "Where to find things",
            tips: [
              "The project spine on each project page is your map — each card opens that step and shows whether it is linked yet.",
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
              "For freelancers who only need a shot list on one job, use Settings → Project access to add them to that project with scripts, production, or shots only — without giving them the full catalog.",
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
              "Click a recent project to open its spine and continue pre-production or the shot list.",
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
        description: "The hub that ties script, board, and agreements together.",
        canAccess: (user) => canManageProjects(user) || production(user),
        blocks: [
          {
            paragraphs: [
              "Create a project from Projects → New. The project page shows the spine — a row of cards for Script, Pre-production, Shot list, Stage planner, Reference guide, and Agreement. Green or linked states mean that step is connected; open any card to work there.",
            ],
          },
          {
            heading: "Typical setup",
            bullets: [
              "Create the project first, even if the script is not written yet — you need a project to apply script data to.",
              "Open Pre-production from the spine to link a script session and fill the board.",
              "Add project members under Settings → Project access if freelancers need shot-list-only access.",
            ],
            links: [{ label: "Projects", href: "/projects" }],
          },
        ],
      },
      {
        id: "script-writer",
        title: "How to use Script writer",
        description: "Write scripts, generate shot coverage, and push data to the board.",
        canAccess: production,
        blocks: [
          {
            paragraphs: [
              "Script writer uses AI to help you develop concept, script text, and a production pack. You can work in text chat mode or inspiration mode with reference images and clips.",
            ],
          },
          {
            heading: "Text mode",
            bullets: [
              "Open Script writer → New session (or open an existing session).",
              "Chat through the concept — audience, tone, locations, talent.",
              "Before generating, enable Detailed shot list if you want numbered WS/MS/CU rows per scene.",
              "Enable Storyboard mode if you want one visual frame per scene in the shot list grid later.",
              "Click Generate when ready. Review the script, then refine with follow-up messages if needed.",
            ],
          },
          {
            heading: "Inspiration mode",
            bullets: [
              "Upload location photos, mood boards, or reference clips.",
              "Run analysis and confirm what the AI understood before it writes — this keeps the script aligned with your visual references.",
              "Generate the same way as text mode once analysis is confirmed.",
            ],
          },
          {
            heading: "Apply to your project",
            bullets: [
              "On the pre-production board, link this script session.",
              "Use Apply to project (or Refresh from script on the shot list) to push locations, shots, and storyboard frames onto the board.",
            ],
            tips: [
              "If coverage looks thin, regenerate with detailed shot list turned on.",
              "Always link the script session on the board before refreshing shots — otherwise the shot list will not know which script to pull from.",
            ],
            links: [{ label: "Script writer", href: "/script-writer" }],
          },
        ],
      },
      {
        id: "preproduction-board",
        title: "How to use the Pre-production board",
        description: "Plan cast, locations, days, and checklist before the shoot.",
        canAccess: production,
        blocks: [
          {
            paragraphs: [
              "The pre-production board is the planning document for the shoot. Data you enter here feeds call sheets, shot lists, and crew packets.",
            ],
          },
          {
            heading: "Fill out the board",
            bullets: [
              "Set film title, logline, look/feel, inspiration images, and any story links.",
              "Add people under Cast, Production, and Camera — names and roles appear on call sheets.",
              "Add locations and mark them booked; the first booked location can sync to a shoot day.",
              "Work through the production checklist (portfolio vs client mode changes which tasks show).",
              "Add production days — each day gets its own call sheet and shot list tab.",
            ],
            links: [{ label: "Projects", href: "/projects" }],
          },
        ],
      },
      {
        id: "shot-list",
        title: "How to use the shot list, days, and crew packet",
        description: "Track coverage on set, split across days, and print crew packets.",
        canAccess: production,
        blocks: [
          {
            paragraphs: [
              "Open a project → Shot list (or Pre-production → a shoot day → Shots). Shots come from the linked script; you check them off on set in List view.",
            ],
          },
          {
            heading: "List view on set",
            bullets: [
              "Check off each shot as you capture it.",
              "If the script changed, use Refresh from script to pull updated coverage (linked session required).",
              "Switch day tabs at the top to see that day’s shots.",
            ],
          },
          {
            heading: "Move shots between days",
            bullets: [
              "Drag the grip handle on a shot row onto another day tab — use this when weather, talent, or schedule shifts work.",
              "On iPad, use the Move to… menu on each row instead of drag.",
            ],
          },
          {
            heading: "Auto-split days",
            bullets: [
              "When you have many shots and multiple days, click Auto-split days and enter how many shoot days you need.",
              "The app groups shots by location and packs roughly 18 shots per day so you stay at one location when possible.",
              "Confirm the plan — day titles update to the primary location for each day.",
              "Regenerate crew packets after splitting so each day’s printout matches.",
            ],
          },
          {
            heading: "Crew packet",
            bullets: [
              "Open the Crew packet tab on the shot list page for the shoot day you are printing.",
              "Click Generate (or Regenerate after script or shot changes).",
              "Use the jump chips to preview Director, DP, Gaffer, Sound, Talent, and Art/Props sections.",
              "Click View full packet or Print crew packet for one combined PDF — master shot list plus all role sections.",
            ],
            tips: [
              "Generate one crew packet per shoot day on multi-day jobs.",
              "Storyboard view is for client-facing frames; shot checkboxes stay in List view.",
            ],
          },
        ],
      },
      {
        id: "call-sheet",
        title: "How to use call sheets",
        description: "Build and print the day-of schedule.",
        canAccess: production,
        blocks: [
          {
            paragraphs: [
              "Each production day has its own call sheet. Open the day from Pre-production, then open Call sheet.",
            ],
          },
          {
            heading: "Fill and print",
            bullets: [
              "Enter crew call, meal times, wrap, weather, and schedule blocks.",
              "Key contacts auto-fill from people you added on the board — add missing names on the board first if a field is empty.",
              "Use Print from the call sheet page for a paper copy on set.",
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
              "Project access lets you invite someone to one job without giving them the whole app. Permissions are per project: scripts, production, or shots.",
            ],
          },
          {
            heading: "Add a member",
            bullets: [
              "Settings → Project access (or Admin → Project teams).",
              "Pick the project, enter the member’s email, and check the areas they need.",
              "Shots-only is common for day players who just need the shot list and crew packet.",
            ],
            links: [{ label: "Project access", href: "/settings/project-access" }],
          },
        ],
      },
    ],
  },
];
