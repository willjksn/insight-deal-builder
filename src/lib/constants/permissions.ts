import { UserPermissions } from "@/lib/types";

export type PermissionKey = keyof UserPermissions;

export interface PermissionDefinition {
  key: PermissionKey;
  label: string;
  description: string;
  group: "quotes" | "imgData" | "admin";
  /** Only assignable to Insight Media Group LLC workers */
  insightOnly?: boolean;
}

export const PERMISSION_DEFINITIONS: PermissionDefinition[] = [
  {
    key: "createQuotes",
    label: "Create quotes",
    description: "Start new agreements in the quote wizard",
    group: "quotes",
  },
  {
    key: "editQuotes",
    label: "Edit quotes",
    description: "Change drafts and agreements they can access",
    group: "quotes",
  },
  {
    key: "deleteQuotes",
    label: "Delete quotes",
    description: "Remove agreements they can access",
    group: "quotes",
  },
  {
    key: "duplicateQuotes",
    label: "Duplicate quotes",
    description: "Copy an existing agreement as a new draft",
    group: "quotes",
  },
  {
    key: "signQuotes",
    label: "Sign quotes",
    description: "Apply signatures and initials on agreements",
    group: "quotes",
  },
  {
    key: "downloadPdf",
    label: "Download PDF",
    description: "Export agreement PDFs",
    group: "quotes",
  },
  {
    key: "emailQuotes",
    label: "Email quotes",
    description: "Open mail client and copy email-ready agreement text",
    group: "quotes",
  },
  {
    key: "viewAllOrgDeals",
    label: "View all org deals",
    description: "See every quote where their company is a party (not just their email)",
    group: "quotes",
  },
  {
    key: "manageClients",
    label: "Manage clients",
    description: "Add and edit client profiles",
    group: "imgData",
    insightOnly: true,
  },
  {
    key: "manageCompanies",
    label: "Manage companies",
    description: "Add and edit production company profiles",
    group: "imgData",
    insightOnly: true,
  },
  {
    key: "manageCrew",
    label: "Manage crew",
    description: "Add and edit crew, talent, and contractors",
    group: "imgData",
    insightOnly: true,
  },
  {
    key: "manageProjects",
    label: "Manage projects",
    description: "Add and edit production projects",
    group: "imgData",
    insightOnly: true,
  },
  {
    key: "manageTemplates",
    label: "Manage templates",
    description: "Create and edit agreement templates",
    group: "imgData",
    insightOnly: true,
  },
  {
    key: "deleteTemplates",
    label: "Delete templates",
    description: "Remove agreement templates",
    group: "imgData",
    insightOnly: true,
  },
  {
    key: "manageUsers",
    label: "Manage users",
    description: "Admin tab — assign workers and permissions",
    group: "admin",
    insightOnly: true,
  },
  {
    key: "viewIdentityDocs",
    label: "View ID verification",
    description: "View government ID photos captured for renters and talent",
    group: "imgData",
    insightOnly: true,
  },
  {
    key: "viewW9Docs",
    label: "View W-9 documents",
    description: "Open completed IRS Form W-9 PDFs (contains tax ID)",
    group: "imgData",
    insightOnly: true,
  },
  {
    key: "exportPayments",
    label: "Export payment reports",
    description: "Download payee CSV reports, record cash payments, and 1099 prep",
    group: "imgData",
    insightOnly: true,
  },
  {
    key: "useShotScout",
    label: "Production tools",
    description: "Script writer, stage planner, reference guide, and pre-production boards",
    group: "imgData",
    insightOnly: true,
  },
  {
    key: "viewRevenueOpportunities",
    label: "View revenue & opportunities",
    description: "Open the revenue command center, pipeline, and read-only opportunity data",
    group: "imgData",
    insightOnly: true,
  },
  {
    key: "manageRevenueOpportunities",
    label: "Manage revenue & opportunities",
    description: "Create campaigns, approve opportunities, prepare outreach, and convert wins to projects",
    group: "imgData",
    insightOnly: true,
  },
];

export const PERMISSION_GROUPS = [
  { id: "quotes" as const, label: "Quotes & agreements" },
  { id: "imgData" as const, label: "Insight data (clients, crew, etc.)" },
  { id: "admin" as const, label: "Administration" },
];

export const EMPTY_PERMISSIONS: UserPermissions = {
  createQuotes: false,
  editQuotes: false,
  deleteQuotes: false,
  duplicateQuotes: false,
  signQuotes: false,
  downloadPdf: false,
  emailQuotes: false,
  viewAllOrgDeals: false,
  manageClients: false,
  manageCompanies: false,
  manageCrew: false,
  manageProjects: false,
  manageTemplates: false,
  deleteTemplates: false,
  manageUsers: false,
  viewIdentityDocs: false,
  viewW9Docs: false,
  exportPayments: false,
  useShotScout: false,
  viewRevenueOpportunities: false,
  manageRevenueOpportunities: false,
};

export const FULL_IMG_PERMISSIONS: UserPermissions = {
  createQuotes: true,
  editQuotes: true,
  deleteQuotes: true,
  duplicateQuotes: true,
  signQuotes: true,
  downloadPdf: true,
  emailQuotes: true,
  viewAllOrgDeals: true,
  manageClients: true,
  manageCompanies: true,
  manageCrew: true,
  manageProjects: true,
  manageTemplates: true,
  deleteTemplates: true,
  manageUsers: true,
  viewIdentityDocs: true,
  viewW9Docs: true,
  exportPayments: true,
  useShotScout: true,
  viewRevenueOpportunities: true,
  manageRevenueOpportunities: true,
};

/** Production partner — own quotes only, no IMG client/company/crew access */
export const PARTNER_PERMISSIONS: UserPermissions = {
  ...EMPTY_PERMISSIONS,
  createQuotes: true,
  editQuotes: true,
  signQuotes: true,
  downloadPdf: true,
  emailQuotes: true,
  viewAllOrgDeals: true,
};

/** Producers — work deals, collect ID/W-9, no browse of stored sensitive docs */
export const PRODUCER_PERMISSIONS: UserPermissions = {
  ...EMPTY_PERMISSIONS,
  createQuotes: true,
  editQuotes: true,
  duplicateQuotes: true,
  signQuotes: true,
  downloadPdf: true,
  emailQuotes: true,
  viewAllOrgDeals: true,
  manageProjects: true,
  useShotScout: true,
  viewRevenueOpportunities: true,
  manageRevenueOpportunities: true,
};

/** @deprecated alias — use PRODUCER_PERMISSIONS */
export const IMG_STAFF_PERMISSIONS: UserPermissions = PRODUCER_PERMISSIONS;

/** Accounting — export payees and open W-9 PDFs; no deal editing */
export const ACCOUNTING_PERMISSIONS: UserPermissions = {
  ...EMPTY_PERMISSIONS,
  viewAllOrgDeals: true,
  viewW9Docs: true,
  exportPayments: true,
  downloadPdf: true,
};

/** Compliance / ops lead — producer access plus ID photo review */
export const COMPLIANCE_PERMISSIONS: UserPermissions = {
  ...PRODUCER_PERMISSIONS,
  viewIdentityDocs: true,
};

export const PERMISSION_PRESETS = [
  { id: "full", label: "Full admin (IMG)", permissions: FULL_IMG_PERMISSIONS },
  { id: "producer", label: "Producer (IMG)", permissions: PRODUCER_PERMISSIONS },
  { id: "accounting", label: "Accounting (IMG)", permissions: ACCOUNTING_PERMISSIONS },
  { id: "compliance", label: "Compliance / manager (IMG)", permissions: COMPLIANCE_PERMISSIONS },
  { id: "partner", label: "Partner org", permissions: PARTNER_PERMISSIONS },
  { id: "viewer", label: "View & sign only", permissions: { ...EMPTY_PERMISSIONS, signQuotes: true, downloadPdf: true } },
  { id: "none", label: "Clear all", permissions: EMPTY_PERMISSIONS },
];

export function sanitizePermissionsForCompany(
  permissions: UserPermissions,
  company: string,
  insightCompany: string
): UserPermissions {
  const next = { ...permissions };
  if (company !== insightCompany) {
    for (const def of PERMISSION_DEFINITIONS) {
      if (def.insightOnly) {
        next[def.key] = false;
      }
    }
  }
  return next;
}
