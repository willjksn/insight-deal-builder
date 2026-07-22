import { describe, it, expect } from "vitest";
import { AppUser } from "@/lib/types";
import {
  NAV_GROUPS,
  getVisibleNavGroups,
  getMobileNav,
  isNavItemActive,
  isGroupInWorkspace,
} from "./navConfig";

const imgAdmin = {
  id: "u1",
  email: "admin@img.com",
  role: "admin",
  company: "Insight Media Group LLC",
} as AppUser;

const partner = {
  id: "u2",
  email: "partner@other.com",
  role: "member",
  company: "Partner Co",
} as AppUser;

function groupLabels(user: AppUser | null, workspace: "business" | "production") {
  return getVisibleNavGroups(workspace, user).map((g) => g.label);
}

function itemHrefs(user: AppUser | null, workspace: "business" | "production") {
  return getVisibleNavGroups(workspace, user).flatMap((g) => g.items.map((i) => i.href));
}

describe("isGroupInWorkspace", () => {
  it("shows shared groups in every workspace", () => {
    const overview = NAV_GROUPS.find((g) => g.label === "Overview")!;
    expect(isGroupInWorkspace(overview, "business")).toBe(true);
    expect(isGroupInWorkspace(overview, "production")).toBe(true);
  });

  it("keeps workspace groups scoped", () => {
    const production = NAV_GROUPS.find((g) => g.label === "Production")!;
    expect(isGroupInWorkspace(production, "production")).toBe(true);
    expect(isGroupInWorkspace(production, "business")).toBe(false);
  });
});

describe("getVisibleNavGroups", () => {
  it("shows Business groups + shared groups in the business workspace for an IMG admin", () => {
    const labels = groupLabels(imgAdmin, "business");
    expect(labels).toContain("Overview");
    expect(labels).toContain("Revenue");
    expect(labels).toContain("Relationships");
    expect(labels).toContain("System");
    expect(labels).not.toContain("Production");
    expect(labels).not.toContain("Catalogs");
  });

  it("shows Production groups + shared groups in the production workspace for an IMG admin", () => {
    const labels = groupLabels(imgAdmin, "production");
    expect(labels).toContain("Overview");
    expect(labels).toContain("Production");
    expect(labels).toContain("Catalogs");
    expect(labels).toContain("System");
    expect(labels).not.toContain("Revenue");
    expect(labels).not.toContain("Relationships");
  });

  it("filters items by permission (partner sees Agreements but not Revenue/Templates)", () => {
    const hrefs = itemHrefs(partner, "business");
    expect(hrefs).toContain("/agreements");
    expect(hrefs).toContain("/dashboard");
    expect(hrefs).not.toContain("/revenue");
    expect(hrefs).not.toContain("/templates");
    expect(hrefs).not.toContain("/companies");
  });

  it("still exposes Projects to a partner in the production workspace", () => {
    const hrefs = itemHrefs(partner, "production");
    expect(hrefs).toContain("/projects");
  });

  it("drops empty groups (Content development is flagged off by default)", () => {
    expect(groupLabels(imgAdmin, "production")).not.toContain("Content development");
  });
});

describe("isNavItemActive", () => {
  it("matches /dashboard only exactly", () => {
    const item = { href: "/dashboard", label: "Dashboard", icon: NAV_GROUPS[0].items[0].icon, exact: true };
    expect(isNavItemActive(item, "/dashboard")).toBe(true);
    expect(isNavItemActive(item, "/dashboard/extra")).toBe(false);
  });

  it("matches prefixes for section routes", () => {
    const item = { href: "/projects", label: "Projects", icon: NAV_GROUPS[0].items[0].icon };
    expect(isNavItemActive(item, "/projects")).toBe(true);
    expect(isNavItemActive(item, "/projects/abc123")).toBe(true);
    expect(isNavItemActive(item, "/project")).toBe(false);
  });

  it("honors activePrefixes (idea engine highlights on /content/ideas)", () => {
    const item = {
      href: "/content",
      label: "Idea engine",
      icon: NAV_GROUPS[0].items[0].icon,
      activePrefixes: ["/content/ideas"],
    };
    expect(isNavItemActive(item, "/content/ideas/bank")).toBe(true);
  });
});

describe("getMobileNav", () => {
  it("puts Dashboard first, Settings present, and keeps the primary bar short", () => {
    const { primary, more } = getMobileNav("production", imgAdmin);
    expect(primary[0].href).toBe("/dashboard");
    expect(primary.map((i) => i.href)).toContain("/settings");
    expect(primary.length).toBeLessThanOrEqual(6);
    // Everything not in the primary bar is available in the "more" strip.
    const overlap = more.filter((m) => primary.some((p) => p.href === m.href));
    expect(overlap).toHaveLength(0);
  });
});
