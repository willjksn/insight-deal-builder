/**
 * Insight Deal Builder — demo / business seed data
 *
 * Edit these values with your real business info before seeding Firestore.
 * Run from Settings → "Load All Demo Data" or call seedFirestore() in dev.
 */
import { Company, Client, CrewMember, Project } from "@/lib/types";
import { ProjectType, ShootType } from "@/lib/types";
import { PRODUCER_FEE_PRESETS, SERVICE_PACKAGE_PRESETS } from "@/lib/constants/presets";

// Re-export payout rules for reference in wizard
export { PRODUCER_FEE_PRESETS, SERVICE_PACKAGE_PRESETS };

// ─── Companies ───────────────────────────────────────────────────────────────
// TODO: Fill in your real address, email, phone, website, and logo URL

/** Default company seeded on first setup. Add production partners manually via Companies. */
export const SEED_COMPANIES: Omit<Company, "id" | "createdAt" | "updatedAt">[] = [
  {
    legalName: "Insight Media Group LLC",
    displayName: "Insight Media Group LLC",
    authorizedSignerName: "Will Jackson",
    authorizedSignerTitle: "Owner / Managing Member / Executive Producer",
    defaultRole: "Lead Producer / Creative Director / Production Company",
    defaultProducerPercentage: 40,
    defaultEquipmentTerms:
      "Insight equipment use is included in the producer/equipment fee unless heavy gear use requires an additional fee.",
    email: "", // e.g. hello@insightmediagroup.com
    phone: "",
    address: "",
    website: "",
    logoUrl: "",
    notes: "Primary production company. Default producer fee: 40% when Insight originates client + gear used.",
  },
];

// ─── Crew ────────────────────────────────────────────────────────────────────

export const SEED_CREW: Omit<CrewMember, "id" | "createdAt" | "updatedAt">[] = [
  {
    name: "Assistant",
    defaultRole: "Production Assistant",
    email: "",
    phone: "",
    defaultRate: 200,
    rateType: "flat",
    signatureRequired: false,
    initialsRequired: false,
    notes: "Production assistant — update name and rate.",
  },
];

// ─── Clients ─────────────────────────────────────────────────────────────────

export const SEED_CLIENTS: Omit<Client, "id" | "createdAt" | "updatedAt">[] = [
  {
    businessName: "Demo Fitness Studio",
    contactName: "Demo Client",
    email: "client@example.com",
    phone: "",
    address: "",
    website: "",
    socialHandle: "",
    authorizedSignerName: "Demo Client",
    authorizedSignerTitle: "Owner",
    billingContact: "",
    notes: "Example client — replace with real clients.",
  },
];

// ─── Standard service packages → seed projects ───────────────────────────────

export const SEED_PROJECTS: Omit<Project, "id" | "createdAt" | "updatedAt" | "clientId" | "clientName">[] =
  SERVICE_PACKAGE_PRESETS.map((pkg) => ({
    projectName: pkg.name,
    agreementType: "client_project" as const,
    projectType: pkg.projectType,
    shootType: "Photo + Video" as ShootType,
    totalProjectFee: pkg.price,
    shootDate: "",
    deliveryDate: "",
    location: "",
    status: "draft" as const,
  }));

/** Demo project linked to Demo Fitness Studio */
export const SEED_DEMO_PROJECT: Omit<Project, "id" | "createdAt" | "updatedAt"> = {
  projectName: "Demo Fitness Studio Brand Campaign",
  agreementType: "client_project",
  projectType: "Business Brand Package",
  shootType: "Photo + Video",
  totalProjectFee: 3000,
  shootDate: "",
  deliveryDate: "",
  location: "",
  status: "draft",
};

// ─── Payout rules (reference — used by wizard calculator) ───────────────────
//
// Insight-originated + Insight gear used:     40%
// Insight-originated + no Insight gear used:  35%
// Partner-originated:                        Partner keeps producer fee; Insight paid by role
// Joint-originated:                           Custom split required before signing

export const PAYOUT_RULES_SUMMARY = [
  "Insight originated + Insight gear used → 40% (default)",
  "Insight originated + no Insight gear → 35%",
  "Partner originated → partner keeps producer fee; Insight paid by agreed role only",
  "Joint originated → custom split required before signing",
];
