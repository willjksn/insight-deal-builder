import { describe, expect, it } from "vitest";
import { getWorkflowCatalogEntry, REVENUE_WORKFLOW_CATALOG } from "@/lib/revenueOpportunities/n8n/catalog";

describe("REVENUE_WORKFLOW_CATALOG", () => {
  it("registers expected workflows", () => {
    expect(REVENUE_WORKFLOW_CATALOG.length).toBeGreaterThanOrEqual(3);
    expect(getWorkflowCatalogEntry("revenue_inbox_sync")?.webhookPath).toContain("inbox");
  });
});
