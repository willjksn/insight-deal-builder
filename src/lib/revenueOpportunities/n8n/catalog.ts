import type { RevenueWorkflowCatalogEntry } from "@/lib/revenueOpportunities/types/workflowRun";

/** Registered n8n webhook workflows — paths are appended to N8N_BASE_URL. */
export const REVENUE_WORKFLOW_CATALOG: RevenueWorkflowCatalogEntry[] = [
  {
    name: "revenue_follow_up_scan",
    label: "Follow-up scan",
    description: "Find opportunities with follow-ups due and queue outreach reminders.",
    schedule: "0 9 * * 1-5",
    scheduleLabel: "Weekdays 9:00 AM",
    webhookPath: "/webhook/revenue-follow-up-scan",
    phase: 9,
  },
  {
    name: "revenue_inbox_sync",
    label: "Inbox sync",
    description: "Pull new Gmail threads and run receptionist classification.",
    schedule: "0 */4 * * *",
    scheduleLabel: "Every 4 hours",
    webhookPath: "/webhook/revenue-inbox-sync",
    phase: 9,
  },
  {
    name: "revenue_daily_brief",
    label: "Daily brief",
    description: "Summarize pipeline priorities for the revenue command center.",
    schedule: "0 7 * * 1-5",
    scheduleLabel: "Weekdays 7:00 AM",
    webhookPath: "/webhook/revenue-daily-brief",
    phase: 9,
  },
];

export function getWorkflowCatalogEntry(name: string): RevenueWorkflowCatalogEntry | undefined {
  return REVENUE_WORKFLOW_CATALOG.find((w) => w.name === name);
}
